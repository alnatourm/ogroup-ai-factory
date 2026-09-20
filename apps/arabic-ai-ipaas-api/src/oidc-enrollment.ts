import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import type { Pool } from 'pg';
import { provisionOidcIdentityInTransaction } from './oidc-provision.js';
import { createPostgresPool } from './postgres.js';
import { decryptSecret, encryptSecret } from './security.js';
import type { WorkspaceRole } from './types.js';

const APPROVAL_CONFIRMATION = 'APPROVE_ENROLLMENT';
const ENROLLMENT_TTL_MS = 30 * 60 * 1000;

type PendingClaims = {
  issuer: string;
  subject: string;
  email: string;
  displayName?: string;
};

export type PendingEnrollmentInput = PendingClaims & {
  emailVerified: boolean;
};

export type PendingEnrollment = {
  reference: string;
  expiresAt: string;
};

export type EnrollmentApprovalInput = {
  reference: string;
  workspaceSlug: string;
  role: WorkspaceRole;
};

function required(value: string | undefined, code: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

function identityFingerprint(issuer: string, subject: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(issuer).update('\0').update(subject).digest('hex');
}

export async function recordPendingOidcEnrollment(
  pool: Pool,
  input: PendingEnrollmentInput,
  sessionSecret: string,
): Promise<PendingEnrollment> {
  if (!input.emailVerified) throw new Error('OIDC_VERIFIED_EMAIL_REQUIRED');
  const issuer = required(input.issuer, 'OIDC_ENROLLMENT_ISSUER_REQUIRED');
  const issuerUrl = new URL(issuer);
  if (issuerUrl.protocol !== 'https:' || issuerUrl.search || issuerUrl.hash) {
    throw new Error('OIDC_ENROLLMENT_ISSUER_INVALID');
  }
  const subject = required(input.subject, 'OIDC_ENROLLMENT_SUBJECT_REQUIRED');
  const email = required(input.email, 'OIDC_VERIFIED_EMAIL_REQUIRED').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error('OIDC_VERIFIED_EMAIL_REQUIRED');
  }
  if (sessionSecret.length < 32) throw new Error('OIDC_SESSION_SECRET_TOO_SHORT');

  const reference = crypto.randomBytes(18).toString('base64url');
  const expiresAt = new Date(Date.now() + ENROLLMENT_TTL_MS);
  const claims: PendingClaims = {
    issuer,
    subject,
    email,
    ...(input.displayName?.trim() ? { displayName: input.displayName.trim().slice(0, 200) } : {}),
  };
  const result = await pool.query<{ reference: string; expires_at: Date | string }>(
    `insert into oidc_pending_enrollments (
       reference, identity_fingerprint, sealed_claims, status, expires_at
     ) values ($1, $2, $3, 'pending', $4)
     on conflict (identity_fingerprint) do update
       set reference = excluded.reference,
           sealed_claims = excluded.sealed_claims,
           status = 'pending',
           expires_at = excluded.expires_at,
           approved_at = null
       where oidc_pending_enrollments.status <> 'approved'
     returning reference, expires_at`,
    [
      reference,
      identityFingerprint(issuer, subject, sessionSecret),
      encryptSecret(JSON.stringify(claims), sessionSecret),
      expiresAt,
    ],
  );
  if (result.rows.length !== 1) throw new Error('OIDC_ENROLLMENT_ALREADY_APPROVED');
  const row = result.rows[0]!;
  return {
    reference: row.reference,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function approvePendingOidcEnrollment(
  pool: Pool,
  input: EnrollmentApprovalInput,
  sessionSecret: string,
) {
  const reference = required(input.reference, 'OIDC_ENROLLMENT_REFERENCE_REQUIRED');
  const client = await pool.connect();
  try {
    await client.query('begin');
    const pending = await client.query<{
      sealed_claims: string;
      status: string;
      expires_at: Date | string;
    }>(
      `select sealed_claims, status, expires_at
         from oidc_pending_enrollments
        where reference = $1
        for update`,
      [reference],
    );
    const row = pending.rows[0];
    if (!row || row.status !== 'pending') throw new Error('OIDC_ENROLLMENT_NOT_PENDING');
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      throw new Error('OIDC_ENROLLMENT_EXPIRED');
    }
    const claims = JSON.parse(decryptSecret(row.sealed_claims, sessionSecret)) as PendingClaims;
    const provisioned = await provisionOidcIdentityInTransaction(client, {
      ...claims,
      workspaceSlug: input.workspaceSlug,
      role: input.role,
    });
    await client.query(
      `update oidc_pending_enrollments
          set status = 'approved', approved_at = now(), sealed_claims = null
        where reference = $1 and status = 'pending'`,
      [reference],
    );
    await client.query('commit');
    return provisioned;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const input: EnrollmentApprovalInput = {
    reference: required(process.env.OIDC_ENROLLMENT_REFERENCE, 'OIDC_ENROLLMENT_REFERENCE_REQUIRED'),
    workspaceSlug: required(
      process.env.OIDC_PROVISION_WORKSPACE_SLUG,
      'OIDC_PROVISION_WORKSPACE_SLUG_REQUIRED',
    ),
    role: required(process.env.OIDC_PROVISION_ROLE, 'OIDC_PROVISION_ROLE_REQUIRED') as WorkspaceRole,
  };
  if (process.env.OIDC_ENROLLMENT_CONFIRM !== APPROVAL_CONFIRMATION) {
    process.stdout.write(`${JSON.stringify({
      event: 'oidc.enrollment.approval.preview',
      reference: input.reference,
      workspaceSlug: input.workspaceSlug,
      role: input.role,
      confirmationRequired: APPROVAL_CONFIRMATION,
    })}\n`);
    return;
  }
  const sessionSecret = required(process.env.OIDC_SESSION_SECRET, 'OIDC_SESSION_SECRET_REQUIRED');
  const databaseUrl = required(process.env.DATABASE_URL, 'DATABASE_URL_REQUIRED');
  const pool = createPostgresPool(databaseUrl);
  try {
    const result = await approvePendingOidcEnrollment(pool, input, sessionSecret);
    process.stdout.write(`${JSON.stringify({ event: 'oidc.enrollment.approved', ...result })}\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const code = error instanceof Error && error.message.startsWith('OIDC_')
      ? error.message
      : 'OIDC_ENROLLMENT_APPROVAL_FAILED';
    process.stderr.write(`${JSON.stringify({ event: 'oidc.enrollment.approval.failed', code })}\n`);
    process.exitCode = 1;
  });
}
