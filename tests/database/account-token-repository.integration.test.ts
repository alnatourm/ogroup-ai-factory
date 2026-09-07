import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { consumeAccountToken, hashAccountToken } from '@ogroup/account-lifecycle';
import { SqlAccountTokenRepository } from '@ogroup/repositories';
import { describe, expect, it } from 'vitest';

async function migratedDatabase(): Promise<PGlite> {
  const db = new PGlite();
  const migrations = [
    'packages/database/migrations/0001_core_identity.sql',
    'packages/database/migrations/0002_sessions.sql',
    'packages/database/migrations/0003_credentials.sql',
    'packages/database/migrations/0004_account_tokens.sql',
  ];

  for (const migrationPath of migrations) {
    const migration = await readFile(resolve(process.cwd(), migrationPath), 'utf8');
    await db.exec(migration);
  }

  return db;
}

describe('SqlAccountTokenRepository', () => {
  it('persists only the token hash and consumes a valid token once', async () => {
    const db = await migratedDatabase();
    const repository = new SqlAccountTokenRepository(db);
    const expiresAt = new Date('2030-01-01T00:00:00Z');

    const issued = await repository.create({
      email: ' Reset.User@Example.com ',
      purpose: 'password_reset',
      expiresAt,
    });

    const stored = await db.query<{
      token_hash: string;
      email: string;
      used_at: string | null;
    }>('SELECT token_hash, email, used_at FROM account_tokens WHERE id = $1', [issued.record.id]);

    expect(stored.rows[0]?.token_hash).toBe(hashAccountToken(issued.token));
    expect(stored.rows[0]?.token_hash).not.toBe(issued.token);
    expect(stored.rows[0]?.email).toBe('reset.user@example.com');
    expect(stored.rows[0]?.used_at).toBeNull();

    const consumed = await consumeAccountToken({
      token: issued.token,
      purpose: 'password_reset',
      store: repository,
      now: new Date('2029-01-01T00:00:00Z'),
    });
    expect(consumed?.id).toBe(issued.record.id);

    const reused = await consumeAccountToken({
      token: issued.token,
      purpose: 'password_reset',
      store: repository,
      now: new Date('2029-01-01T00:00:01Z'),
    });
    expect(reused).toBeNull();

    await db.close();
  });

  it('does not consume an expired token', async () => {
    const db = await migratedDatabase();
    const repository = new SqlAccountTokenRepository(db);
    const issued = await repository.create({
      email: 'expired@example.com',
      purpose: 'email_verification',
      expiresAt: new Date('2028-01-01T00:00:00Z'),
    });

    const consumed = await consumeAccountToken({
      token: issued.token,
      purpose: 'email_verification',
      store: repository,
      now: new Date('2029-01-01T00:00:00Z'),
    });

    expect(consumed).toBeNull();
    await db.close();
  });
});
