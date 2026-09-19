import fs from 'node:fs/promises';
import path from 'node:path';
import { createPostgresPool } from './postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');

const migrationPath = path.resolve(
  process.cwd(),
  'products/arabic-ai-ipaas/migrations/0001_initial.sql',
);
const migration = await fs.readFile(migrationPath, 'utf8');
const pool = createPostgresPool(databaseUrl);

try {
  await pool.query(migration);
  console.log(JSON.stringify({ event: 'database.migration.applied', migration: '0001_initial.sql' }));
} finally {
  await pool.end();
}
