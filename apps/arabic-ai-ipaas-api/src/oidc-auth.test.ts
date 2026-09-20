import express from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OidcAuth } from './oidc-auth.js';

const OIDC_ENV = [
  'OIDC_ISSUER_URL',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'PUBLIC_BASE_URL',
  'OIDC_SESSION_SECRET',
] as const;

const saved = new Map<string, string | undefined>();

describe('OIDC authentication boundary', () => {
  beforeEach(() => {
    for (const name of OIDC_ENV) {
      saved.set(name, process.env[name]);
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const name of OIDC_ENV) {
      const value = saved.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    saved.clear();
  });

  it('reports an explicit disabled state when no provider is configured', async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    const auth = new OidcAuth(pool);
    const app = express();
    app.use('/auth', auth.router);

    await request(app)
      .get('/auth/status')
      .expect(200)
      .expect({ configured: false, authenticated: false });

    await request(app)
      .get('/auth/login')
      .expect(503)
      .expect({ error: 'OIDC_NOT_CONFIGURED' });
  });

  it('does not create a browser identity while disabled', async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    const auth = new OidcAuth(pool);

    await expect(
      auth.verify({ cookieHeader: 'untrusted=value', method: 'GET' }),
    ).resolves.toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });
});
