import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { authenticateSession } from '../../packages/auth/src/index.js';
import {
  SqlMembershipResolver,
  SqlSessionRepository,
  type SqlClient,
  type SqlQueryResult,
} from '../../packages/repositories/src/index.js';

class PGliteClient implements SqlClient {
  constructor(private readonly db: PGlite) {}

  async query<T>(sql: string, params: unknown[] = []): Promise<SqlQueryResult<T>> {
    const result = await this.db.query<T>(sql, params);
    return { rows: result.rows };
  }
}

async function setup(): Promise<{ db: PGlite; client: PGliteClient }> {
  const db = new PGlite();
  for (const path of [
    'packages/database/migrations/0001_core_identity.sql',
    'packages/database/migrations/0002_sessions.sql',
  ]) {
    await db.exec(await readFile(resolve(process.cwd(), path), 'utf8'));
  }

  return { db, client: new PGliteClient(db) };
}

describe('PostgreSQL-backed authentication repositories', () => {
  it('creates hashed sessions and authenticates through real tenant/RBAC data', async () => {
    const { db, client } = await setup();
    const userId = '11111111-1111-4111-8111-111111111111';
    const tenantId = '22222222-2222-4222-8222-222222222222';
    const membershipId = '33333333-3333-4333-8333-333333333333';
    const roleId = '44444444-4444-4444-8444-444444444444';
    const permissionId = '55555555-5555-4555-8555-555555555555';

    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [userId, 'repo@example.com']);
    await db.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [tenantId, 'Tenant A']);
    await db.query('INSERT INTO memberships (id, tenant_id, user_id) VALUES ($1, $2, $3)', [
      membershipId,
      tenantId,
      userId,
    ]);
    await db.query('INSERT INTO roles (id, tenant_id, name) VALUES ($1, $2, $3)', [
      roleId,
      tenantId,
      'owner',
    ]);
    await db.query('INSERT INTO permissions (id, key) VALUES ($1, $2)', [
      permissionId,
      'admin:access',
    ]);
    await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [
      roleId,
      permissionId,
    ]);
    await db.query('INSERT INTO user_roles (membership_id, role_id) VALUES ($1, $2)', [
      membershipId,
      roleId,
    ]);

    const sessionRepository = new SqlSessionRepository(client);
    const membershipResolver = new SqlMembershipResolver(client);
    const created = await sessionRepository.create({
      userId,
      expiresAt: new Date('2030-01-01T00:00:00Z'),
    });

    const stored = await db.query<{ token_hash: string }>(
      'SELECT token_hash FROM sessions WHERE id = $1',
      [created.session.id],
    );
    expect(stored.rows[0]?.token_hash).not.toBe(created.token);

    const principal = await authenticateSession({
      token: created.token,
      tenantId,
      sessionStore: sessionRepository,
      membershipResolver,
      now: new Date('2026-09-07T00:00:00Z'),
    });

    expect(principal?.membershipId).toBe(membershipId);
    expect(principal?.permissions.has('admin:access')).toBe(true);

    const wrongTenant = await authenticateSession({
      token: created.token,
      tenantId: '66666666-6666-4666-8666-666666666666',
      sessionStore: sessionRepository,
      membershipResolver,
      now: new Date('2026-09-07T00:00:00Z'),
    });
    expect(wrongTenant).toBeNull();

    expect(
      await sessionRepository.revoke({ sessionId: created.session.id, userId }),
    ).toBe(true);

    const revoked = await authenticateSession({
      token: created.token,
      tenantId,
      sessionStore: sessionRepository,
      membershipResolver,
      now: new Date('2026-09-07T00:00:00Z'),
    });
    expect(revoked).toBeNull();

    await db.close();
  });
});
