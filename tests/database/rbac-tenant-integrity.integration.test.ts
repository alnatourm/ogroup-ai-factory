import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const migrationPaths = [
  'packages/database/migrations/0001_core_identity.sql',
  'packages/database/migrations/0005_rbac_tenant_integrity.sql',
].map((path) => resolve(process.cwd(), path));

async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  for (const path of migrationPaths) {
    await db.exec(await readFile(path, 'utf8'));
  }
  return db;
}

async function seedTenants(db: PGlite) {
  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '22222222-2222-4222-8222-222222222222';
  const userA = '33333333-3333-4333-8333-333333333333';
  const membershipA = '44444444-4444-4444-8444-444444444444';
  const roleA = '55555555-5555-4555-8555-555555555555';
  const roleB = '66666666-6666-4666-8666-666666666666';

  await db.query('INSERT INTO organizations (id, name) VALUES ($1, $2), ($3, $4)', [
    tenantA,
    'Tenant A',
    tenantB,
    'Tenant B',
  ]);
  await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [userA, 'user-a@example.com']);
  await db.query(
    'INSERT INTO memberships (id, tenant_id, user_id) VALUES ($1, $2, $3)',
    [membershipA, tenantA, userA],
  );
  await db.query(
    'INSERT INTO roles (id, tenant_id, name) VALUES ($1, $2, $3), ($4, $5, $6)',
    [roleA, tenantA, 'manager', roleB, tenantB, 'manager'],
  );

  return { tenantA, tenantB, membershipA, roleA, roleB };
}

describe('RBAC tenant integrity', () => {
  it('accepts membership-role assignments inside the same tenant', async () => {
    const db = await createDatabase();
    const { tenantA, membershipA, roleA } = await seedTenants(db);

    await expect(
      db.query(
        'INSERT INTO user_roles (membership_id, role_id, tenant_id) VALUES ($1, $2, $3)',
        [membershipA, roleA, tenantA],
      ),
    ).resolves.toBeDefined();

    await db.close();
  });

  it('rejects assigning a role from another tenant at the database boundary', async () => {
    const db = await createDatabase();
    const { tenantA, membershipA, roleB } = await seedTenants(db);

    await expect(
      db.query(
        'INSERT INTO user_roles (membership_id, role_id, tenant_id) VALUES ($1, $2, $3)',
        [membershipA, roleB, tenantA],
      ),
    ).rejects.toThrow();

    await db.close();
  });

  it('rejects a forged tenant id even when membership and role ids are valid', async () => {
    const db = await createDatabase();
    const { tenantB, membershipA, roleA } = await seedTenants(db);

    await expect(
      db.query(
        'INSERT INTO user_roles (membership_id, role_id, tenant_id) VALUES ($1, $2, $3)',
        [membershipA, roleA, tenantB],
      ),
    ).rejects.toThrow();

    await db.close();
  });
});
