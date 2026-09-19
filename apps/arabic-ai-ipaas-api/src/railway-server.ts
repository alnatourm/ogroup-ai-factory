import { createPostgresApp } from './postgres-app.js';
import { createPostgresPool } from './postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
if (!process.env.PROVIDER_SECRET_MASTER_KEY) {
  throw new Error('PROVIDER_SECRET_MASTER_KEY_REQUIRED');
}

const portValue = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) {
  throw new Error('INVALID_PORT');
}

const pool = createPostgresPool(databaseUrl);
const app = createPostgresApp({ pool });
const server = app.listen(portValue, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'api.started', port: portValue }));
});

async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ event: 'api.stopping', signal }));
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
