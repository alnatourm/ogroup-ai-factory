import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuditEvent, AuditSink } from '../../packages/audit/src/index.js';
import { createApp } from '../../apps/api/src/app.js';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  type CredentialStore,
  type MembershipResolver,
  type SessionIssuer,
  type SessionRecord,
  type SessionRevoker,
  type SessionStore,
} from '../../packages/auth/src/index.js';
import { InMemoryFixedWindowRateLimiter } from '../../packages/rate-limit/src/index.js';
import { SESSION_COOKIE_NAME } from '../../packages/web-security/src/index.js';

const token = 'valid-session-token';
const loginPassword = 'Correct-Horse-Factory-2026';

class MemorySessions implements SessionStore, SessionIssuer, SessionRevoker {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor() {
    this.sessions.set(hashSessionToken(token), {
      id: 'session-1',
      userId: 'user-1',
      tokenHash: hashSessionToken(token),
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      revokedAt: null,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.sessions.get(tokenHash) ?? null;
  }

  async create(input: { userId: string; expiresAt: Date }): Promise<{ token: string; session: SessionRecord }> {
    const createdToken = createSessionToken();
    const tokenHash = hashSessionToken(createdToken);
    const session: SessionRecord = {
      id: `session-${this.sessions.size + 1}`,
      userId: input.userId,
      tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
    };
    this.sessions.set(tokenHash, session);
    return { token: createdToken, session };
  }

  async revoke(input: { sessionId: string; userId: string }): Promise<boolean> {
    for (const [key, session] of this.sessions.entries()) {
      if (session.id === input.sessionId && session.userId === input.userId && !session.revokedAt) {
        this.sessions.set(key, { ...session, revokedAt: new Date() });
        return true;
      }
    }
    return false;
  }
}

class MemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];

  write(event: AuditEvent): void {
    this.events.push(event);
  }
}

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

let passwordHash = '';

beforeAll(async () => {
  passwordHash = await hashPassword(loginPassword);
});

function makeApp(rateLimit = 10) {
  const sessions = new MemorySessions();
  const auditSink = new MemoryAuditSink();
  const credentialStore: CredentialStore = {
    async findByEmail(email) {
      return email === 'owner@example.com'
        ? { userId: 'user-1', email, passwordHash }
        : null;
    },
  };

  return {
    app: createApp({
      sessionStore: sessions,
      sessionIssuer: sessions,
      sessionRevoker: sessions,
      credentialStore,
      membershipResolver,
      auditSink,
      loginRateLimiter: new InMemoryFixedWindowRateLimiter(rateLimit, 60_000),
      sessionTtlMs: 60 * 60 * 1000,
      secureCookies: false,
    }),
    sessions,
    auditSink,
  };
}

describe('OGroup API bootstrap', () => {
  it('exposes an unauthenticated health endpoint', async () => {
    const { app } = makeApp();
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('rejects protected routes without authentication context', async () => {
    const { app } = makeApp();
    const response = await request(app).get('/api/v1/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a valid session when the user is not a member of the requested tenant', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .get('/api/v1/me')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-b');
    expect(response.status).toBe(401);
  });

  it('returns authenticated principal context for the valid tenant', async () => {
    const { app } = makeApp();
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

  it('accepts cookie authentication for safe requests', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .get('/api/v1/me')
      .set('cookie', `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`)
      .set('x-tenant-id', 'tenant-a');
    expect(response.status).toBe(200);
  });

  it('blocks cookie-authenticated mutations without a same-origin source', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .post('/api/v1/profile/ping')
      .set('cookie', `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`)
      .set('x-tenant-id', 'tenant-a');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_FAILED');
  });

  it('keeps bearer-token mutations independent from browser CSRF requirements', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .post('/api/v1/profile/ping')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-a');
    expect(response.status).toBe(200);
  });

  it('requires same-origin login requests', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: loginPassword });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_FAILED');
  });

  it('returns a secure HttpOnly cookie on successful login without exposing the token in JSON', async () => {
    const { app, auditSink } = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('host', 'example.test')
      .set('origin', 'http://example.test')
      .send({ email: 'OWNER@example.com', password: loginPassword });

    expect(response.status).toBe(200);
    const cookies = response.headers['set-cookie'];
    expect(cookies?.[0]).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookies?.[0]).toContain('HttpOnly');
    expect(cookies?.[0]).toContain('SameSite=Strict');
    expect(JSON.stringify(response.body)).not.toContain('token');
    expect(auditSink.events.some((event) => event.action === 'auth.login.succeeded')).toBe(true);
  });

  it('uses the same generic error for bad credentials and records the failure', async () => {
    const { app, auditSink } = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('host', 'example.test')
      .set('origin', 'http://example.test')
      .send({ email: 'missing@example.com', password: loginPassword });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(auditSink.events.some((event) => event.action === 'auth.login.failed')).toBe(true);
  });

  it('rate-limits repeated login attempts before authentication work continues', async () => {
    const { app, auditSink } = makeApp(1);
    const headers = { host: 'example.test', origin: 'http://example.test' };

    await request(app)
      .post('/api/v1/auth/login')
      .set(headers)
      .send({ email: 'missing@example.com', password: loginPassword });
    const second = await request(app)
      .post('/api/v1/auth/login')
      .set(headers)
      .send({ email: 'missing@example.com', password: loginPassword });

    expect(second.status).toBe(429);
    expect(second.headers['retry-after']).toBeDefined();
    expect(auditSink.events.some((event) => event.action === 'auth.login.rate_limited')).toBe(true);
  });

  it('revokes the session and clears the cookie on logout', async () => {
    const { app, auditSink } = makeApp();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .set('host', 'example.test')
      .set('origin', 'http://example.test')
      .send({ email: 'owner@example.com', password: loginPassword });

    const setCookies = login.headers['set-cookie'];
    const cookie = setCookies?.[0]?.split(';')[0];
    expect(cookie).toBeDefined();

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('host', 'example.test')
      .set('origin', 'http://example.test')
      .set('cookie', cookie ?? '')
      .set('x-tenant-id', 'tenant-a');

    expect(logout.status).toBe(204);
    expect(logout.headers['set-cookie']?.[0]).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(auditSink.events.some((event) => event.action === 'auth.logout.succeeded')).toBe(true);

    const afterLogout = await request(app)
      .get('/api/v1/me')
      .set('cookie', cookie ?? '')
      .set('x-tenant-id', 'tenant-a');
    expect(afterLogout.status).toBe(401);
  });

  it('denies authenticated users that lack the required permission', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .get('/api/v1/admin/ping')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-a');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PERMISSION_DENIED');
  });
});
