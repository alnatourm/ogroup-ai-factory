import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { mountPublicAccountRoutes, type AccountHttpDependencies } from '../../apps/api/src/account-http.js';
import { InMemoryFixedWindowRateLimiter } from '@ogroup/rate-limit';
import { hashAccountToken, type AccountTokenRecord } from '@ogroup/account-lifecycle';

function dependencies(existingEmail: string | null) {
  const sent: Array<{ email: string; token: string }> = [];
  const deps: AccountHttpDependencies = {
    tokenStore: {
      async findByTokenHash() { return null; },
      async markUsed() { return false; },
    },
    tokenIssuer: {
      async create(input) {
        const token = 'reset-token';
        const record: AccountTokenRecord = {
          id: 'token-1',
          tenantId: input.tenantId ?? null,
          userId: input.userId ?? null,
          email: input.email ?? null,
          purpose: input.purpose,
          tokenHash: hashAccountToken(token),
          expiresAt: input.expiresAt,
          usedAt: null,
        };
        return { token, record };
      },
    },
    accounts: {
      async findUserByEmail(email) {
        return existingEmail && email === existingEmail ? { userId: 'user-1', email } : null;
      },
      async markEmailVerified() { return true; },
      async setPasswordHash() { return true; },
    },
    users: {
      async findOrCreateByEmail(email) { return { userId: 'user-1', email }; },
    },
    memberships: {
      async ensureMembership() { return { membershipId: 'membership-1' }; },
    },
    notifications: {
      async sendPasswordReset(input) { sent.push(input); },
    },
    auditSink: { async write() {} },
    passwordResetRateLimiter: new InMemoryFixedWindowRateLimiter(10, 60_000),
    tokenConsumeRateLimiter: new InMemoryFixedWindowRateLimiter(10, 60_000),
    passwordResetTtlMs: 15 * 60_000,
  };
  return { deps, sent };
}

function appFor(deps: AccountHttpDependencies) {
  const app = express();
  app.use(express.json());
  mountPublicAccountRoutes(app, deps);
  return app;
}

describe('account lifecycle HTTP routes', () => {
  it('returns the same generic reset response whether or not the account exists', async () => {
    const known = dependencies('known@example.com');
    const unknown = dependencies(null);

    const knownResponse = await request(appFor(known.deps))
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'known@example.com' });
    const unknownResponse = await request(appFor(unknown.deps))
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'missing@example.com' });

    expect(knownResponse.status).toBe(202);
    expect(unknownResponse.status).toBe(202);
    expect(knownResponse.body).toEqual(unknownResponse.body);
    expect(known.sent).toEqual([{ email: 'known@example.com', token: 'reset-token' }]);
    expect(unknown.sent).toEqual([]);
  });

  it('rate limits password-reset requests', async () => {
    const fixture = dependencies('known@example.com');
    fixture.deps.passwordResetRateLimiter = new InMemoryFixedWindowRateLimiter(1, 60_000);
    const app = appFor(fixture.deps);

    const first = await request(app).post('/api/v1/auth/password-reset/request').send({ email: 'known@example.com' });
    const second = await request(app).post('/api/v1/auth/password-reset/request').send({ email: 'known@example.com' });

    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
    expect(second.headers['retry-after']).toBeDefined();
  });
});
