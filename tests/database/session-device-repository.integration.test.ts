import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { SqlSessionRepository } from '@ogroup/repositories';

async function database(): Promise<PGlite> {
  const db = new PGlite();
  for (const migration of ['0001_core_identity.sql', '0002_sessions.sql', '0003_credentials.sql', '0004_account_tokens.sql', '0005_rbac_tenant_integrity.sql', '0006_session_devices.sql']) {
    await db.exec(await readFile(resolve(process.cwd(), 'packages/database/migrations', migration), 'utf8'));
  }
  return db;
}

describe('SQL session device repository', () => {
  it('lists and revokes sessions only for their owning user', async () => {
    const db = await database();
    const userA = '11111111-1111-4111-8111-111111111111';
    const userB = '22222222-2222-4222-8222-222222222222';
    await db.query('INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)', [userA, 'a@example.com', userB, 'b@example.com']);
    const repository = new SqlSessionRepository(db);
    const a = await repository.create({ userId: userA, expiresAt: new Date(Date.now() + 60_000) });
    const b = await repository.create({ userId: userB, expiresAt: new Date(Date.now() + 60_000) });

    const listA = await repository.listForUser(userA);
    expect(listA.map((session) => session.id)).toEqual([a.session.id]);
    expect(listA.some((session) => Object.prototype.hasOwnProperty.call(session, 'tokenHash'))).toBe(false);

    expect(await repository.revokeForUser({ userId: userA, sessionId: b.session.id })).toBe(false);
    expect(await repository.revokeForUser({ userId: userA, sessionId: a.session.id })).toBe(true);
    expect((await repository.findByTokenHash(a.session.tokenHash))?.revokedAt).not.toBeNull();
    expect((await repository.findByTokenHash(b.session.tokenHash))?.revokedAt).toBeNull();
    await db.close();
  });

  it('revokes every active session for one user and leaves other users untouched', async () => {
    const db = await database();
    const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await db.query('INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)', [userA, 'reset@example.com', userB, 'other@example.com']);
    const repository = new SqlSessionRepository(db);
    const a1 = await repository.create({ userId: userA, expiresAt: new Date(Date.now() + 60_000) });
    const a2 = await repository.create({ userId: userA, expiresAt: new Date(Date.now() + 60_000) });
    const b1 = await repository.create({ userId: userB, expiresAt: new Date(Date.now() + 60_000) });

    expect(await repository.revokeAllForUser(userA)).toBe(2);
    expect((await repository.findByTokenHash(a1.session.tokenHash))?.revokedAt).not.toBeNull();
    expect((await repository.findByTokenHash(a2.session.tokenHash))?.revokedAt).not.toBeNull();
    expect((await repository.findByTokenHash(b1.session.tokenHash))?.revokedAt).toBeNull();
    await db.close();
  });
});
