import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPostgresPool } from './postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');

const migrations = [
  '0001_initial.sql',
  '0002_oidc_identities.sql',
  '0003_oidc_pending_enrollments.sql',
];
const pool = createPostgresPool(databaseUrl);

try {
  for (const name of migrations) {
    const path = fileURLToPath(
      new URL(`../../../products/arabic-ai-ipaas/migrations/${name}`, import.meta.url),
    );
    const sql = await fs.readFile(path, 'utf8');
    await pool.query(sql);
    console.log(JSON.stringify({ event: 'database.migration.applied', migration: name }));
  }
} finally {
  await pool.end();
}
