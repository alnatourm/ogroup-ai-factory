import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import type { Pool } from 'pg';
import { createPostgresPool } from './postgres.js';
import type { WorkspaceRole } from './types.js';

const CONFIRMATION = 'PROVISION_IDENTITY';
const VALID_ROLES = new Set<WorkspaceRole>([
  'workspace_owner',
  'workspace_admin',
  'developer',
  'automation_builder',
  'viewer',
  'partner_admin',
]);

export type OidcProvisioningInput = {
  issuer: string;
  subject: string;
  email: string;
  displayName?: string;
  workspaceSlug: string;
  role: WorkspaceRole;
};

export type OidcProvisioningResult = {
  workspaceId: string;
  userId: string;
  identityCreated: boolean;
  membershipChange: 'created' | 'updated' | 'unchanged';
  fingerprints: {
    issuer: string;
    subject: string;
    email: string;
  };
};

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function required(value: string | undefined, code: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

export function normalizeProvisioningInput(input: OidcProvisioningInput): OidcProvisioningInput {
  const issuerUrl = new URL(required(input.issuer, 'OIDC_PROVISION_ISSUER_REQUIRED'));
  if (
    issuerUrl.protocol !== 'https:' ||
    issuerUrl.username ||
    issuerUrl.password ||
    issuerUrl.search ||
    issuerUrl.hash
  ) {
    throw new Error('OIDC_PROVISION_ISSUER_INVALID');
  }

  const subject = required(input.subject, 'OIDC_PROVISION_SUBJECT_REQUIRED');
  if (subject.length > 512 || /[\u0000-\u001f\u007f]/u.test(subject)) {
    throw new Error('OIDC_PROVISION_SUBJECT_INVALID');
  }

  const email = required(input.email, 'OIDC_PROVISION_EMAIL_REQUIRED').toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error('OIDC_PROVISION_EMAIL_INVALID');
  }

  const workspaceSlug = required(
    input.workspaceSlug,
    'OIDC_PROVISION_WORKSPACE_SLUG_REQUIRED',
  ).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(workspaceSlug)) {
    throw new Error('OIDC_PROVISION_WORKSPACE_SLUG_INVALID');
  }

  if (!VALID_ROLES.has(input.role)) throw new Error('OIDC_PROVISION_ROLE_INVALID');

  const displayName = input.displayName?.trim();
  if (displayName && displayName.length > 200) {
    throw new Error('OIDC_PROVISION_DISPLAY_NAME_INVALID');
  }

  return {
    issuer: issuerUrl.href,
    subject,
    email,
    ...(displayName ? { displayName } : {}),
    workspaceSlug,
    role: input.role,
  };
}

export function loadProvisioningInputFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): OidcProvisioningInput {
  return normalizeProvisioningInput({
    issuer: required(env.OIDC_PROVISION_ISSUER, 'OIDC_PROVISION_ISSUER_REQUIRED'),
    subject: required(env.OIDC_PROVISION_SUBJECT, 'OIDC_PROVISION_SUBJECT_REQUIRED'),
    email: required(env.OIDC_PROVISION_EMAIL, 'OIDC_PROVISION_EMAIL_REQUIRED'),
    ...(env.OIDC_PROVISION_DISPLAY_NAME
      ? { displayName: env.OIDC_PROVISION_DISPLAY_NAME }
      : {}),
    workspaceSlug: required(
      env.OIDC_PROVISION_WORKSPACE_SLUG,
      'OIDC_PROVISION_WORKSPACE_SLUG_REQUIRED',
    ),
    role: required(env.OIDC_PROVISION_ROLE, 'OIDC_PROVISION_ROLE_REQUIRED') as WorkspaceRole,
  });
}

export function provisioningPreview(input: OidcProvisioningInput) {
  const normalized = normalizeProvisioningInput(input);
  return {
    apply: false,
    workspaceSlug: normalized.workspaceSlug,
    role: normalized.role,
    fingerprints: {
      issuer: fingerprint(normalized.issuer),
      subject: fingerprint(normalized.subject),
      email: fingerprint(normalized.email),
    },
  };
}

export async function provisionOidcIdentity(
  pool: Pool,
  input: OidcProvisioningInput,
): Promise<OidcProvisioningResult> {
  const normalized = normalizeProvisioningInput(input);
  const client = await pool.connect();

  try {
    await client.query('begin');

    const workspace = await client.query<{ id: string }>(
      `select id
         from workspaces
        where slug = $1 and status = 'active'
        for update`,
      [normalized.workspaceSlug],
    );
    if (workspace.rows.length !== 1) throw new Error('OIDC_PROVISION_WORKSPACE_NOT_ACTIVE');
    const workspaceId = workspace.rows[0]!.id;

    const users = await client.query<{ id: string; status: string }>(
      `select id, status
         from users
        where lower(email) = $1
        order by created_at asc
        limit 2
        for update`,
      [normalized.email],
    );
    if (users.rows.length > 1) throw new Error('OIDC_PROVISION_EMAIL_AMBIGUOUS');

    let userId: string;
    if (users.rows.length === 0) {
      const created = await client.query<{ id: string }>(
        `insert into users (email, display_name, status)
         values ($1, $2, 'active')
         returning id`,
        [normalized.email, normalized.displayName ?? null],
      );
      userId = created.rows[0]!.id;
    } else {
      const existing = users.rows[0]!;
      if (existing.status !== 'active') throw new Error('OIDC_PROVISION_USER_NOT_ACTIVE');
      userId = existing.id;
      if (normalized.displayName) {
        await client.query(
          `update users
              set display_name = $2, updated_at = now()
            where id = $1`,
          [userId, normalized.displayName],
        );
      }
    }

    const subjectLink = await client.query<{ user_id: string }>(
      `select user_id
         from oidc_identities
        where issuer = $1 and subject = $2
        for update`,
      [normalized.issuer, normalized.subject],
    );
    if (subjectLink.rows[0] && subjectLink.rows[0].user_id !== userId) {
      throw new Error('OIDC_PROVISION_IDENTITY_ALREADY_LINKED');
    }

    const userLink = await client.query<{ subject: string }>(
      `select subject
         from oidc_identities
        where user_id = $1 and issuer = $2
        for update`,
      [userId, normalized.issuer],
    );
    if (userLink.rows[0] && userLink.rows[0].subject !== normalized.subject) {
      throw new Error('OIDC_PROVISION_USER_ALREADY_LINKED_FOR_ISSUER');
    }

    const membership = await client.query<{ role: WorkspaceRole }>(
      `select role
         from workspace_members
        where workspace_id = $1 and user_id = $2
        for update`,
      [workspaceId, userId],
    );

    let membershipChange: OidcProvisioningResult['membershipChange'] = 'unchanged';
    const previousRole = membership.rows[0]?.role;
    if (!previousRole) {
      await client.query(
        `insert into workspace_members (workspace_id, user_id, role)
         values ($1, $2, $3)`,
        [workspaceId, userId, normalized.role],
      );
      membershipChange = 'created';
    } else if (previousRole !== normalized.role) {
      await client.query(
        `update workspace_members
            set role = $3
          where workspace_id = $1 and user_id = $2`,
        [workspaceId, userId, normalized.role],
      );
      membershipChange = 'updated';
    }

    const identityCreated = subjectLink.rows.length === 0;
    if (identityCreated) {
      await client.query(
        `insert into oidc_identities (user_id, issuer, subject)
         values ($1, $2, $3)`,
        [userId, normalized.issuer, normalized.subject],
      );
    }

    const fingerprints = {
      issuer: fingerprint(normalized.issuer),
      subject: fingerprint(normalized.subject),
      email: fingerprint(normalized.email),
    };
    await client.query(
      `insert into audit_events (
         workspace_id, actor_type, action, entity_type, entity_id, metadata
       ) values ($1, 'operator', 'auth.oidc.identity_provisioned', 'user', $2, $3::jsonb)`,
      [
        workspaceId,
        userId,
        JSON.stringify({
          ...fingerprints,
          role: normalized.role,
          previousRole: previousRole ?? null,
          membershipChange,
          identityCreated,
        }),
      ],
    );

    await client.query('commit');
    return { workspaceId, userId, identityCreated, membershipChange, fingerprints };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const input = loadProvisioningInputFromEnvironment();
  const preview = provisioningPreview(input);
  if (process.env.OIDC_PROVISION_CONFIRM !== CONFIRMATION) {
    process.stdout.write(
      `${JSON.stringify({
        event: 'oidc.provision.preview',
        ...preview,
        confirmationRequired: CONFIRMATION,
      })}\n`,
    );
    return;
  }

  const databaseUrl = required(process.env.DATABASE_URL, 'DATABASE_URL_REQUIRED');
  const pool = createPostgresPool(databaseUrl);
  try {
    const result = await provisionOidcIdentity(pool, input);
    process.stdout.write(
      `${JSON.stringify({ event: 'oidc.provision.applied', ...result })}\n`,
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const code =
      error instanceof Error && error.message.startsWith('OIDC_PROVISION_')
        ? error.message
        : 'OIDC_PROVISION_FAILED';
    process.stderr.write(`${JSON.stringify({ event: 'oidc.provision.failed', code })}\n`);
    process.exitCode = 1;
  });
}
