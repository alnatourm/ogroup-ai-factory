import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { hashSessionToken, type MembershipResolver, type SessionStore } from '../../packages/auth/src/index.js';

const token = 'valid-session-token';

const sessionStore: SessionStore = {
  async findByTokenHash(tokenHash) {
    if (tokenHash !== hashSessionToken(token)) {
      return null;
    }

    return {
      id: 'session-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      revokedAt: null,
    };
  },
};

const membershipResolver: MembershipResolver = {
  async resolve(userId, tenantId) {
    if (userId === 'user-1' && tenantId === 'tenant-a') {
      return {
        membershipId: 'membership-1',
        permissions: ['profile:read'],
      };
    }

    return null;
  },
};

const app = createApp({ sessionStore, membershipResolver });

describe('OGroup API bootstrap', () => {
  it('exposes an unauthenticated health endpoint', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('rejects protected routes without authentication context', async () => {
    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a valid session when the user is not a member of the requested tenant', async () => {
    const response = await request(app)
      .get('/api/v1/me')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-b');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns authenticated principal context for the valid tenant', async () => {
    const response = await request(app)
      .get('/api/v1/me')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-a');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-a',
      membershipId: 'membership-1',
    });
  });

  it('denies authenticated users that lack the required permission', async () => {
    const response = await request(app)
      .get('/api/v1/admin/ping')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-a');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PERMISSION_DENIED');
  });
});
