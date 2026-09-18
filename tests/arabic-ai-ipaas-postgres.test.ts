import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { hashApiKey } from '../apps/arabic-ai-ipaas-api/src/auth.js';
import {
  PostgresApiKeyVerifier,
  PostgresProviderRepository,
} from '../apps/arabic-ai-ipaas-api/src/postgres.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('Arabic AI iPaaS PostgreSQL capability proof', () => {
  it('applies the real migration and proves tenant-scoped persistence + API-key auth', async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const migration = await fs.readFile(
        path.resolve(process.cwd(), 'products/arabic-ai-ipaas/migrations/0001_initial.sql'),
        'utf8',
      );
      await pool.query(migration);

      const workspaceA = (await pool.query<{ id: string }>(
        "insert into workspaces(name, slug) values ('Workspace A','workspace-a') returning id",
      )).rows[0]!;
      const workspaceB = (await pool.query<{ id: string }>(
        "insert into workspaces(name, slug) values ('Workspace B','workspace-b') returning id",
      )).rows[0]!;
      const user = (await pool.query<{ id: string }>(
        "insert into users(email, display_name) values ('factory-test@example.com','Factory Test') returning id",
      )).rows[0]!;

      const rawKey = 'factory_integration_key';
      await pool.query(
        `insert into api_keys(workspace_id, name, key_prefix, key_hash, scopes, created_by)
         values ($1,'Integration key','factory_',$2,$3,$4)`,
        [workspaceA.id, hashApiKey(rawKey), JSON.stringify(['gateway:write']), user.id],
      );

      const verifier = new PostgresApiKeyVerifier(pool);
      const verified = await verifier.verify(rawKey);
      expect(verified?.workspaceId).toBe(workspaceA.id);
      expect(verified?.role).toBe('developer');

      const repository = new PostgresProviderRepository(pool);
      const created = await repository.create({
        workspaceId: workspaceA.id,
        providerType: 'openai-compatible',
        name: 'Integration provider',
        baseUrl: 'https://provider.example',
        modelDefault: 'pilot-model',
        secretCiphertext: 'ciphertext-only',
      });

      expect((await repository.list(workspaceA.id)).map((row) => row.id)).toContain(created.id);
      expect(await repository.list(workspaceB.id)).toEqual([]);
      expect(await repository.get(workspaceB.id, created.id)).toBeUndefined();
      expect(await repository.remove(workspaceB.id, created.id)).toBe(false);
      expect(await repository.remove(workspaceA.id, created.id)).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
