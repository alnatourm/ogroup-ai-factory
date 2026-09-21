import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('workspace data policy database migration', () => {
  it('is registered and creates tenant-scoped policy storage with private defaults', async () => {
    const migrateSource = await readFile(fileURLToPath(new URL('./migrate.ts', import.meta.url)), 'utf8');
    const migrationPath = fileURLToPath(
      new URL('../../../products/arabic-ai-ipaas/migrations/0005_workspace_data_policies.sql', import.meta.url),
    );
    const migration = await readFile(migrationPath, 'utf8');

    expect(migrateSource).toContain("'0005_workspace_data_policies.sql'");
    expect(migration).toContain('create table if not exists workspace_data_policies');
    expect(migration).toContain('workspace_id uuid primary key references workspaces(id) on delete cascade');
    expect(migration).toContain("data_zone text not null default 'PRIVATE'");
    expect(migration).toContain('pii_masking_enabled boolean not null default true');
    expect(migration).toContain("data_zone <> 'IMPROVEMENT_OPT_IN' or opt_in_confirmed = true");
  });
});
