import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { createAuditEvent } from '../../packages/audit/src/index.js';
import {
  SqlAuditSink,
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

async function setup(): Promise<{ db: PGlite; sink: SqlAuditSink }> {
  const db = new PGlite();
  for (const path of [
    'packages/database/migrations/0001_core_identity.sql',
    'packages/database/migrations/0002_sessions.sql',
    'packages/database/migrations/0003_credentials.sql',
  ]) {
    await db.exec(await readFile(resolve(process.cwd(), path), 'utf8'));
  }

  return { db, sink: new SqlAuditSink(new PGliteClient(db)) };
}

describe('security audit persistence', () => {
  it('persists anonymous failed-login events without inventing an actor', async () => {
    const { db, sink } = await setup();

    await sink.write(
      createAuditEvent({
        action: 'auth.login.failed',
        occurredAt: '2026-09-07T00:00:00.000Z',
        metadata: { transport: 'cookie' },
      }),
    );

    const result = await db.query<{
      action: string;
      actor_id: string | null;
      metadata_json: string | null;
    }>('SELECT action, actor_id, metadata_json FROM audit_logs');

    expect(result.rows[0]?.action).toBe('auth.login.failed');
    expect(result.rows[0]?.actor_id).toBeNull();
    expect(JSON.parse(result.rows[0]?.metadata_json ?? '{}')).toMatchObject({
      transport: 'cookie',
    });

    await db.close();
  });

  it('persists authenticated security events with the actual actor', async () => {
    const { db, sink } = await setup();
    const userId = '11111111-1111-4111-8111-111111111111';

    await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
      userId,
      'audit@example.com',
    ]);

    await sink.write(
      createAuditEvent({
        action: 'auth.login.succeeded',
        actorId: userId,
        resourceType: 'session',
        resourceId: 'session-1',
        occurredAt: '2026-09-07T00:00:00.000Z',
      }),
    );

    const result = await db.query<{ actor_id: string | null }>(
      'SELECT actor_id FROM audit_logs',
    );
    expect(result.rows[0]?.actor_id).toBe(userId);

    await db.close();
  });
});
