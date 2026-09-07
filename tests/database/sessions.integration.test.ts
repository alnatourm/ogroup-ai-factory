import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

async function migratedDatabase(): Promise<PGlite> {
  const db = new PGlite();
  const migrations = [
    'packages/database/migrations/0001_core_identity.sql',
    'packages/database/migrations/0002_sessions.sql',
  ];

  for (const migrationPath of migrations) {
    const migration = await readFile(resolve(process.cwd(), migrationPath), 'utf8');
    await db.exec(migration);
  }

  return db;
}

describe('session persistence migration', () => {
  it('stores only token hashes and enforces token-hash uniqueness', async () => {
    const db = await migratedDatabase();
    const userId = '11111111-1111-4111-8111-111111111111';

    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
      userId,
      'session-user@example.com',
    ]);

    await db.query(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [
        '22222222-2222-4222-8222-222222222222',
        userId,
        'hash-only-value',
        '2030-01-01T00:00:00Z',
      ],
    );

    await expect(
      db.query(
        'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [
          '33333333-3333-4333-8333-333333333333',
          userId,
          'hash-only-value',
          '2030-01-01T00:00:00Z',
        ],
      ),
    ).rejects.toThrow();

    await db.close();
  });

  it('deletes sessions when their user is deleted', async () => {
    const db = await migratedDatabase();
    const userId = '44444444-4444-4444-8444-444444444444';

    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
      userId,
      'cascade-user@example.com',
    ]);
    await db.query(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [
        '55555555-5555-4555-8555-555555555555',
        userId,
        'cascade-hash',
        '2030-01-01T00:00:00Z',
      ],
    );

    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    const result = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM sessions');

    expect(result.rows[0]?.count).toBe('0');
    await db.close();
  });
});
