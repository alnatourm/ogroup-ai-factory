import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPostgresPool } from './postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');

const migrationPath = fileURLToPath(
  new URL('../../../products/arabic-ai-ipaas/migrations/0001_initial.sql', import.meta.url),
);
const migration = await fs.readFile(migrationPath, 'utf8');
const pool = createPostgresPool(databaseUrl);

try {
  await pool.query(migration);
  console.log(JSON.stringify({ event: 'database.migration.applied', migration: '0001_initial.sql' }));
} finally {
  await pool.end();
}
