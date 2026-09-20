import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import {
  normalizeProvisioningInput,
  provisionOidcIdentity,
  provisioningPreview,
  type OidcProvisioningInput,
} from './oidc-provision.js';

const validInput: OidcProvisioningInput = {
  issuer: 'https://identity.example.com/tenant',
  subject: 'subject-123',
  email: 'Owner@Example.com',
  displayName: 'Workspace Owner',
  workspaceSlug: 'arabic-ai',
  role: 'workspace_owner',
};

function result<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

describe('OIDC identity provisioning', () => {
  it('normalizes safe values and only exposes fingerprints in preview output', () => {
    const normalized = normalizeProvisioningInput(validInput);
    expect(normalized.issuer).toBe('https://identity.example.com/tenant');
    expect(normalized.email).toBe('owner@example.com');

    const preview = provisioningPreview(validInput);
    expect(preview).toMatchObject({
      apply: false,
      workspaceSlug: 'arabic-ai',
      role: 'workspace_owner',
    });
    expect(JSON.stringify(preview)).not.toContain(validInput.subject);
    expect(JSON.stringify(preview)).not.toContain(validInput.email);
  });

  it.each([
    [{ ...validInput, issuer: 'http://identity.example.com' }, 'OIDC_PROVISION_ISSUER_INVALID'],
    [{ ...validInput, issuer: 'https://user:pass@identity.example.com' }, 'OIDC_PROVISION_ISSUER_INVALID'],
    [{ ...validInput, subject: 'bad\nsubject' }, 'OIDC_PROVISION_SUBJECT_INVALID'],
    [{ ...validInput, email: 'not-an-email' }, 'OIDC_PROVISION_EMAIL_INVALID'],
    [{ ...validInput, workspaceSlug: '../wrong' }, 'OIDC_PROVISION_WORKSPACE_SLUG_INVALID'],
    [{ ...validInput, role: 'superadmin' as OidcProvisioningInput['role'] }, 'OIDC_PROVISION_ROLE_INVALID'],
  ])('rejects invalid provisioning input', (input, code) => {
    expect(() => normalizeProvisioningInput(input)).toThrow(code);
  });

  it('creates an explicit identity and membership atomically with redacted audit metadata', async () => {
    const statements: Array<{ sql: string; values?: unknown[] }> = [];
    const query = vi.fn(async <T extends QueryResultRow = QueryResultRow>(
      sql: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> => {
      statements.push({ sql, values });
      if (sql.includes('from workspaces')) return result([{ id: 'workspace-1' }]) as unknown as QueryResult<T>;
      if (sql.includes('from users')) return result([]) as unknown as QueryResult<T>;
      if (sql.includes('insert into users')) return result([{ id: 'user-1' }]) as unknown as QueryResult<T>;
      if (sql.includes('from oidc_identities')) return result([]) as unknown as QueryResult<T>;
      if (sql.includes('from workspace_members')) return result([]) as unknown as QueryResult<T>;
      return result([]) as unknown as QueryResult<T>;
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    const provisioned = await provisionOidcIdentity(pool, validInput);

    expect(provisioned).toMatchObject({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      identityCreated: true,
      membershipChange: 'created',
    });
    expect(statements[0]?.sql).toBe('begin');
    expect(statements.at(-1)?.sql).toBe('commit');
    const audit = statements.find((statement) => statement.sql.includes('insert into audit_events'));
    expect(audit).toBeDefined();
    expect(JSON.stringify(audit?.values)).not.toContain(validInput.subject);
    expect(JSON.stringify(audit?.values)).not.toContain(validInput.email);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back when an issuer and subject are already linked to another user', async () => {
    const statements: string[] = [];
    const query = vi.fn(async <T extends QueryResultRow = QueryResultRow>(
      sql: string,
    ): Promise<QueryResult<T>> => {
      statements.push(sql);
      if (sql.includes('from workspaces')) return result([{ id: 'workspace-1' }]) as unknown as QueryResult<T>;
      if (sql.includes('from users')) {
        return result([{ id: 'user-1', status: 'active' }]) as unknown as QueryResult<T>;
      }
      if (sql.includes('where issuer = $1 and subject = $2')) {
        return result([{ user_id: 'different-user' }]) as unknown as QueryResult<T>;
      }
      return result([]) as unknown as QueryResult<T>;
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await expect(provisionOidcIdentity(pool, validInput)).rejects.toThrow(
      'OIDC_PROVISION_IDENTITY_ALREADY_LINKED',
    );
    expect(statements.at(-1)).toBe('rollback');
    expect(statements.some((sql) => sql.includes('insert into audit_events'))).toBe(false);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
