import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/database/migrations/0001_core_identity.sql',
);

async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  const migration = await readFile(migrationPath, 'utf8');
  await db.exec(migration);
  return db;
}

describe('core PostgreSQL migration', () => {
  it('applies successfully to PostgreSQL and enforces tenant membership uniqueness', async () => {
    const db = await createDatabase();

    const tenantId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const membershipId = '33333333-3333-4333-8333-333333333333';

    await db.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [
      tenantId,
      'Tenant A',
    ]);
    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
      userId,
      'user@example.com',
    ]);
    await db.query(
      'INSERT INTO memberships (id, tenant_id, user_id) VALUES ($1, $2, $3)',
      [membershipId, tenantId, userId],
    );

    await expect(
      db.query(
        'INSERT INTO memberships (id, tenant_id, user_id) VALUES ($1, $2, $3)',
        ['44444444-4444-4444-8444-444444444444', tenantId, userId],
      ),
    ).rejects.toThrow();

    await db.close();
  });

  it('enforces foreign keys for tenant-owned records', async () => {
    const db = await createDatabase();

    await expect(
      db.query(
        'INSERT INTO roles (id, tenant_id, name) VALUES ($1, $2, $3)',
        [
          '55555555-5555-4555-8555-555555555555',
          '66666666-6666-4666-8666-666666666666',
          'manager',
        ],
      ),
    ).rejects.toThrow();

    await db.close();
  });
});
