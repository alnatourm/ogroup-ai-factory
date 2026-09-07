import express, { type NextFunction, type Request, type Response } from 'express';
import { createAuditEvent, type AuditSink } from '@ogroup/audit';
import {
  authenticateCredentials,
  authenticateSession,
  hashSessionToken,
  requirePermission,
  type AuthenticatedPrincipal,
  type CredentialStore,
  type MembershipResolver,
  type SessionIssuer,
  type SessionRevoker,
  type SessionStore,
} from '@ogroup/auth';
import type { RateLimiter } from '@ogroup/rate-limit';
import {
  isSameOriginMutation,
  parseCookie,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@ogroup/web-security';

export interface AppDependencies {
  sessionStore: SessionStore;
  sessionIssuer: SessionIssuer;
  sessionRevoker: SessionRevoker;
  credentialStore: CredentialStore;
  membershipResolver: MembershipResolver;
  auditSink: AuditSink;
  loginRateLimiter: RateLimiter;
  sessionTtlMs: number;
  secureCookies: boolean;
}

type SessionTokenSource = 'bearer' | 'cookie';

function sessionToken(request: Request): { token: string; source: SessionTokenSource } | null {
  const header = request.header('authorization');
  if (header) {
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return { token, source: 'bearer' };
    }
  }

  const cookieToken = parseCookie(request.header('cookie'), SESSION_COOKIE_NAME);
  return cookieToken ? { token: cookieToken, source: 'cookie' } : null;
}

function tenantId(request: Request): string | null {
  return request.header('x-tenant-id')?.trim() || null;
}

function sameOrigin(request: Request): boolean {
  return isSameOriginMutation({
    method: request.method,
    host: request.header('host'),
    origin: request.header('origin'),
    referer: request.header('referer'),
    protocol: request.secure ? 'https' : 'http',
  });
}

function loginInput(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.email !== 'string' || typeof candidate.password !== 'string') {
    return null;
  }

  const email = candidate.email.trim().toLowerCase();
  if (!email || !candidate.password) {
    return null;
  }

  return { email, password: candidate.password };
}

async function recordAudit(sink: AuditSink, event: ReturnType<typeof createAuditEvent>): Promise<void> {
  try {
    await sink.write(event);
  } catch {
    // Authentication availability must not depend on the audit sink.
  }
}

export function createApp(dependencies: AppDependencies) {
  if (dependencies.sessionTtlMs <= 0) {
    throw new Error('INVALID_SESSION_TTL');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/v1/health', (_request, response) => {
    response.status(200).json({
      data: { status: 'ok' },
      meta: {},
    });
  });

  app.post('/api/v1/auth/login', async (request, response, next) => {
    try {
      if (!sameOrigin(request)) {
        response.status(403).json({
          error: { code: 'CSRF_FAILED', message: 'Request origin could not be verified.' },
        });
        return;
      }

      const input = loginInput(request.body as unknown);
      if (!input) {
        response.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid login request.' },
        });
        return;
      }

      const rateKey = `${request.ip}:${input.email}`;
      const decision = dependencies.loginRateLimiter.consume(rateKey);
      if (!decision.allowed) {
        response.setHeader('Retry-After', String(decision.retryAfterSeconds));
        await recordAudit(
          dependencies.auditSink,
          createAuditEvent({
            action: 'auth.login.rate_limited',
            metadata: { transport: 'cookie' },
          }),
        );
        response.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many login attempts.' },
        });
        return;
      }

      const authenticated = await authenticateCredentials({
        email: input.email,
        password: input.password,
        credentialStore: dependencies.credentialStore,
        sessionIssuer: dependencies.sessionIssuer,
        sessionTtlMs: dependencies.sessionTtlMs,
      });

      if (!authenticated) {
        await recordAudit(
          dependencies.auditSink,
          createAuditEvent({
            action: 'auth.login.failed',
            metadata: { transport: 'cookie' },
          }),
        );
        response.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
        });
        return;
      }

      response.cookie(
        SESSION_COOKIE_NAME,
        authenticated.token,
        sessionCookieOptions({
          secure: dependencies.secureCookies,
          maxAgeMs: dependencies.sessionTtlMs,
        }),
      );
      await recordAudit(
        dependencies.auditSink,
        createAuditEvent({
          action: 'auth.login.succeeded',
          actorId: authenticated.session.userId,
          resourceType: 'session',
          resourceId: authenticated.session.id,
          metadata: { transport: 'cookie' },
        }),
      );
      response.status(200).json({
        data: { userId: authenticated.session.userId },
        meta: {},
      });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/v1', async (request, response, next) => {
    const session = sessionToken(request);
    const requestedTenantId = tenantId(request);

    if (!session || !requestedTenantId) {
      response.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
      });
      return;
    }

    if (session.source === 'cookie' && !sameOrigin(request)) {
      response.status(403).json({
        error: { code: 'CSRF_FAILED', message: 'Request origin could not be verified.' },
      });
      return;
    }

    try {
      const principal = await authenticateSession({
        token: session.token,
        tenantId: requestedTenantId,
        sessionStore: dependencies.sessionStore,
        membershipResolver: dependencies.membershipResolver,
      });

      if (!principal) {
        response.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
        });
        return;
      }

      response.locals.principal = principal;
      response.locals.sessionToken = session.token;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/auth/logout', async (_request, response, next) => {
    try {
      const principal = response.locals.principal as AuthenticatedPrincipal;
      const rawToken = response.locals.sessionToken as string;
      const session = await dependencies.sessionStore.findByTokenHash(hashSessionToken(rawToken));

      if (session && session.userId === principal.userId) {
        await dependencies.sessionRevoker.revoke({
          sessionId: session.id,
          userId: principal.userId,
        });
        await recordAudit(
          dependencies.auditSink,
          createAuditEvent({
            action: 'auth.logout.succeeded',
            actorId: principal.userId,
            tenantId: principal.tenantId,
            resourceType: 'session',
            resourceId: session.id,
          }),
        );
      }

      response.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: dependencies.secureCookies,
        sameSite: 'strict',
        path: '/',
      });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/me', (_request, response) => {
    const principal = response.locals.principal as AuthenticatedPrincipal;
    response.status(200).json({
      data: {
        userId: principal.userId,
        tenantId: principal.tenantId,
        membershipId: principal.membershipId,
        permissions: [...principal.permissions].sort(),
      },
      meta: {},
    });
  });

  app.get('/api/v1/admin/ping', (_request, response) => {
    const principal = response.locals.principal as AuthenticatedPrincipal;

    try {
      requirePermission(principal, 'admin:access');
      response.status(200).json({ data: { ok: true }, meta: {} });
    } catch {
      response.status(403).json({
        error: { code: 'PERMISSION_DENIED', message: 'You do not have permission.' },
      });
    }
  });

  app.post('/api/v1/profile/ping', (_request, response) => {
    const principal = response.locals.principal as AuthenticatedPrincipal;

    try {
      requirePermission(principal, 'profile:read');
      response.status(200).json({ data: { ok: true }, meta: {} });
    } catch {
      response.status(403).json({
        error: { code: 'PERMISSION_DENIED', message: 'You do not have permission.' },
      });
    }
  });

  app.use(
    (_error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      });
    },
  );

  return app;
}
