import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import {
  authenticateCredentials,
  hashPassword,
  verifyPassword,
} from '../../packages/auth/src/index.js';
import {
  SqlCredentialRepository,
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
    'packages/database/migrations/0003_credentials.sql',
  ]) {
    await db.exec(await readFile(resolve(process.cwd(), path), 'utf8'));
  }

  return { db, client: new PGliteClient(db) };
}

describe('credential authentication', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const password = 'Correct-Horse-Factory-2026';
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toContain(password);
    expect(passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(passwordHash, password)).toBe(true);
    expect(await verifyPassword(passwordHash, 'incorrect-password')).toBe(false);
  });

  it('rejects passwords outside the creation policy', async () => {
    await expect(hashPassword('short')).rejects.toThrow('PASSWORD_POLICY_FAILED');
  });

  it('authenticates normalized email credentials and creates a hashed session', async () => {
    const { db, client } = await setup();
    const userId = '11111111-1111-4111-8111-111111111111';
    const password = 'Correct-Horse-Factory-2026';
    const passwordHash = await hashPassword(password);

    await db.query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
      [userId, 'Owner@Example.COM', passwordHash],
    );

    const credentialStore = new SqlCredentialRepository(client);
    const sessionIssuer = new SqlSessionRepository(client);

    const result = await authenticateCredentials({
      email: '  owner@example.com ',
      password,
      credentialStore,
      sessionIssuer,
      sessionTtlMs: 60 * 60 * 1000,
      now: new Date('2026-09-07T00:00:00Z'),
    });

    expect(result?.session.userId).toBe(userId);
    expect(result?.session.expiresAt.toISOString()).toBe('2026-09-07T01:00:00.000Z');

    const stored = await db.query<{ token_hash: string }>('SELECT token_hash FROM sessions');
    expect(stored.rows[0]?.token_hash).not.toBe(result?.token);

    const wrongPassword = await authenticateCredentials({
      email: 'owner@example.com',
      password: 'Wrong-Password-Factory-2026',
      credentialStore,
      sessionIssuer,
      sessionTtlMs: 60 * 60 * 1000,
    });
    expect(wrongPassword).toBeNull();

    const unknownEmail = await authenticateCredentials({
      email: 'missing@example.com',
      password,
      credentialStore,
      sessionIssuer,
      sessionTtlMs: 60 * 60 * 1000,
    });
    expect(unknownEmail).toBeNull();

    await db.close();
  });

  it('enforces case-insensitive email uniqueness', async () => {
    const { db } = await setup();

    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
      '22222222-2222-4222-8222-222222222222',
      'case@example.com',
    ]);

    await expect(
      db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
        '33333333-3333-4333-8333-333333333333',
        'CASE@example.com',
      ]),
    ).rejects.toThrow();

    await db.close();
  });
});
