import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createPostgresApp } from './postgres-app.js';
import { createPostgresPool } from './postgres.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
const masterKey = process.env.PROVIDER_SECRET_MASTER_KEY;
if (!masterKey) throw new Error('PROVIDER_SECRET_MASTER_KEY_REQUIRED');

const portValue = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) {
  throw new Error('INVALID_PORT');
}

const pool = createPostgresPool(databaseUrl);
const app = createPostgresApp({ pool, masterKey });
const frontendPath = fileURLToPath(new URL('../../arabic-ai-ipaas-web/dist', import.meta.url));
const frontendIndex = join(frontendPath, 'index.html');

if (!existsSync(frontendIndex)) {
  throw new Error('FRONTEND_BUILD_REQUIRED');
}

app.use(express.static(frontendPath, {
  index: false,
  setHeaders(response, path) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (path.endsWith('index.html')) response.setHeader('Cache-Control', 'no-store');
  },
}));

app.get(/^(?!\/(?:v1|health)(?:\/|$)).*/, (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.sendFile(frontendIndex);
});

const server = app.listen(portValue, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'api.started', port: portValue, frontend: true }));
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
