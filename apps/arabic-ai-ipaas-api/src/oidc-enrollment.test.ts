import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { approvePendingOidcEnrollment, recordPendingOidcEnrollment } from './oidc-enrollment.js';
import { encryptSecret } from './security.js';

const secret = 'test-session-secret-that-is-long-enough-123';

function result<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return { command: 'SELECT', rowCount: rows.length, oid: 0, fields: [], rows };
}

describe('OIDC pending enrollment', () => {
  it('requires a provider-verified email before recording an enrollment', async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    await expect(recordPendingOidcEnrollment(pool, {
      issuer: 'https://accounts.example.com',
      subject: 'subject-123',
      email: 'owner@example.com',
      emailVerified: false,
    }, secret)).rejects.toThrow('OIDC_VERIFIED_EMAIL_REQUIRED');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('stores encrypted claims and only returns an opaque short-lived reference', async () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const query = vi.fn().mockResolvedValue(result([{ reference: 'opaque-ref', expires_at: expiresAt }]));
    const pool = { query } as unknown as Pool;
    const pending = await recordPendingOidcEnrollment(pool, {
      issuer: 'https://accounts.example.com',
      subject: 'subject-123',
      email: 'Owner@Example.com',
      emailVerified: true,
      displayName: 'Owner',
    }, secret);

    expect(pending).toEqual({ reference: 'opaque-ref', expiresAt: expiresAt.toISOString() });
    const values = query.mock.calls[0]?.[1] as unknown[];
    expect(JSON.stringify(values)).not.toContain('subject-123');
    expect(JSON.stringify(values)).not.toContain('owner@example.com');
    expect(values[1]).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('approves and provisions in one transaction, then removes encrypted claims', async () => {
    const statements: Array<{ sql: string; values?: unknown[] }> = [];
    const sealedClaims = encryptSecret(JSON.stringify({
      issuer: 'https://accounts.example.com',
      subject: 'subject-123',
      email: 'owner@example.com',
      displayName: 'Owner',
    }), secret);
    const query = vi.fn(async <T extends QueryResultRow = QueryResultRow>(
      sql: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> => {
      statements.push({ sql, values });
      if (sql.includes('from oidc_pending_enrollments')) {
        return result([{
          sealed_claims: sealedClaims,
          status: 'pending',
          expires_at: new Date(Date.now() + 60_000),
        }]) as unknown as QueryResult<T>;
      }
      if (sql.includes('from workspaces')) return result([{ id: 'workspace-1' }]) as unknown as QueryResult<T>;
      if (sql.includes('from users')) return result([]) as unknown as QueryResult<T>;
      if (sql.includes('insert into users')) return result([{ id: 'user-1' }]) as unknown as QueryResult<T>;
      if (sql.includes('from oidc_identities')) return result([]) as unknown as QueryResult<T>;
      if (sql.includes('from workspace_members')) return result([]) as unknown as QueryResult<T>;
      return result([]) as unknown as QueryResult<T>;
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await expect(approvePendingOidcEnrollment(pool, {
      reference: 'opaque-ref',
      workspaceSlug: 'arabic-ai',
      role: 'workspace_owner',
    }, secret)).resolves.toMatchObject({ workspaceId: 'workspace-1', userId: 'user-1' });

    expect(statements[0]?.sql).toBe('begin');
    expect(statements.at(-1)?.sql).toBe('commit');
    expect(statements.some(({ sql }) => sql.includes("set status = 'approved'"))).toBe(true);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back expired enrollment references before provisioning', async () => {
    const query = vi.fn(async <T extends QueryResultRow = QueryResultRow>(sql: string): Promise<QueryResult<T>> => {
      if (sql.includes('from oidc_pending_enrollments')) {
        return result([{
          sealed_claims: 'unused',
          status: 'pending',
          expires_at: new Date(Date.now() - 1),
        }]) as unknown as QueryResult<T>;
      }
      return result([]) as unknown as QueryResult<T>;
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
    await expect(approvePendingOidcEnrollment(pool, {
      reference: 'expired-ref',
      workspaceSlug: 'arabic-ai',
      role: 'workspace_owner',
    }, secret)).rejects.toThrow('OIDC_ENROLLMENT_EXPIRED');
    expect(query).toHaveBeenLastCalledWith('rollback');
  });
});
