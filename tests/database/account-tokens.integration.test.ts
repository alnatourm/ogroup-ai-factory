import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  for (const migration of [
    '0001_core_identity.sql',
    '0002_sessions.sql',
    '0003_credentials.sql',
    '0004_account_tokens.sql',
  ]) {
    const sql = await readFile(resolve(process.cwd(), 'packages/database/migrations', migration), 'utf8');
    await db.exec(sql);
  }
  return db;
}

describe('account token migration', () => {
  it('accepts supported single-use token purposes and hashes', async () => {
    const db = await createDatabase();
    const userId = '11111111-1111-4111-8111-111111111111';
    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [userId, 'user@example.com']);

    await db.query(
      `INSERT INTO account_tokens (id, user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        '22222222-2222-4222-8222-222222222222',
        userId,
        'password_reset',
        'hash-1',
        '2030-01-01T00:00:00Z',
      ],
    );

    const result = await db.query<{ purpose: string; token_hash: string }>(
      'SELECT purpose, token_hash FROM account_tokens WHERE user_id = $1',
      [userId],
    );
    expect(result.rows[0]).toMatchObject({ purpose: 'password_reset', token_hash: 'hash-1' });
    await db.close();
  });

  it('rejects unsupported purposes and subjectless tokens', async () => {
    const db = await createDatabase();

    await expect(
      db.query(
        `INSERT INTO account_tokens (id, email, purpose, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          '33333333-3333-4333-8333-333333333333',
          'invite@example.com',
          'magic_login',
          'hash-2',
          '2030-01-01T00:00:00Z',
        ],
      ),
    ).rejects.toThrow();

    await expect(
      db.query(
        `INSERT INTO account_tokens (id, purpose, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [
          '44444444-4444-4444-8444-444444444444',
          'invitation',
          'hash-3',
          '2030-01-01T00:00:00Z',
        ],
      ),
    ).rejects.toThrow();

    await db.close();
  });

  it('enforces token hash uniqueness', async () => {
    const db = await createDatabase();
    await db.query(
      `INSERT INTO account_tokens (id, email, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        '55555555-5555-4555-8555-555555555555',
        'first@example.com',
        'invitation',
        'same-hash',
        '2030-01-01T00:00:00Z',
      ],
    );

    await expect(
      db.query(
        `INSERT INTO account_tokens (id, email, purpose, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          '66666666-6666-4666-8666-666666666666',
          'second@example.com',
          'invitation',
          'same-hash',
          '2030-01-01T00:00:00Z',
        ],
      ),
    ).rejects.toThrow();

    await db.close();
  });
});
