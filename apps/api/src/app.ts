import express, { type NextFunction, type Request, type Response } from 'express';
import {
  authenticateSession,
  requirePermission,
  type AuthenticatedPrincipal,
  type MembershipResolver,
  type SessionStore,
} from '@ogroup/auth';

export interface AppDependencies {
  sessionStore: SessionStore;
  membershipResolver: MembershipResolver;
}

function bearerToken(request: Request): string | null {
  const header = request.header('authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function tenantId(request: Request): string | null {
  return request.header('x-tenant-id')?.trim() || null;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/v1/health', (_request, response) => {
    response.status(200).json({
      data: { status: 'ok' },
      meta: {},
    });
  });

  app.use('/api/v1', async (request, response, next) => {
    const token = bearerToken(request);
    const requestedTenantId = tenantId(request);

    if (!token || !requestedTenantId) {
      response.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
      });
      return;
    }

    try {
      const principal = await authenticateSession({
        token,
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
      next();
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

  app.use(
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      console.error(error);
      response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      });
    },
  );

  return app;
}
