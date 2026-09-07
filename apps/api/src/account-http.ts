import type { Express, Request, Response } from 'express';
import { createAuditEvent, type AuditSink } from '@ogroup/audit';
import type { AccountTokenIssuer, AccountTokenStore } from '@ogroup/account-lifecycle';
import {
  acceptInvitation,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  type AccountDirectory,
  type MembershipWriter,
  type UserProvisioner,
} from '@ogroup/account-workflows';
import type { AuthenticatedPrincipal } from '@ogroup/auth';
import type { RateLimiter } from '@ogroup/rate-limit';

export interface LifecycleNotificationSink {
  sendPasswordReset(input: { email: string; token: string }): Promise<void>;
}

export interface SessionDeviceRecord {
  id: string;
  createdAt?: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface SessionDeviceManager {
  listForUser(userId: string): Promise<SessionDeviceRecord[]>;
  revokeForUser(input: { userId: string; sessionId: string }): Promise<boolean>;
  revokeAllForUser(userId: string): Promise<number>;
}

export interface AccountHttpDependencies {
  tokenStore: AccountTokenStore;
  tokenIssuer: AccountTokenIssuer;
  accounts: AccountDirectory;
  users: UserProvisioner;
  memberships: MembershipWriter;
  notifications: LifecycleNotificationSink;
  auditSink: AuditSink;
  passwordResetRateLimiter: RateLimiter;
  tokenConsumeRateLimiter: RateLimiter;
  passwordResetTtlMs: number;
  sessions?: SessionDeviceManager;
}

function normalizedEmail(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const email = (body as Record<string, unknown>).email;
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

function tokenFrom(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const token = (body as Record<string, unknown>).token;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

function resetInput(body: unknown): { token: string; password: string } | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.token !== 'string' || typeof candidate.password !== 'string') return null;
  const token = candidate.token.trim();
  if (!token || candidate.password.length < 12 || candidate.password.length > 1024) return null;
  return { token, password: candidate.password };
}

async function audit(sink: AuditSink, action: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    await sink.write(metadata ? createAuditEvent({ action, metadata }) : createAuditEvent({ action }));
  } catch {
    // Account recovery availability must not depend on the audit sink.
  }
}

function rateLimited(response: Response, retryAfterSeconds: number): void {
  response.setHeader('Retry-After', String(retryAfterSeconds));
  response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests.' } });
}

export function mountPublicAccountRoutes(app: Express, dependencies: AccountHttpDependencies): void {
  if (dependencies.passwordResetTtlMs <= 0) throw new Error('INVALID_PASSWORD_RESET_TTL');

  app.post('/api/v1/auth/password-reset/request', async (request: Request, response: Response, next) => {
    try {
      const email = normalizedEmail(request.body as unknown);
      if (!email) {
        response.status(202).json({ data: { accepted: true }, meta: {} });
        return;
      }

      const decision = dependencies.passwordResetRateLimiter.consume(`${request.ip}:${email}`);
      if (!decision.allowed) {
        await audit(dependencies.auditSink, 'auth.password_reset.rate_limited');
        rateLimited(response, decision.retryAfterSeconds);
        return;
      }

      const issued = await requestPasswordReset({
        email,
        accounts: dependencies.accounts,
        tokenIssuer: dependencies.tokenIssuer,
        ttlMs: dependencies.passwordResetTtlMs,
      });

      if (issued) {
        await dependencies.notifications.sendPasswordReset({ email, token: issued.token });
      }

      await audit(dependencies.auditSink, 'auth.password_reset.requested');
      response.status(202).json({ data: { accepted: true }, meta: {} });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/auth/password-reset/confirm', async (request: Request, response: Response, next) => {
    try {
      const input = resetInput(request.body as unknown);
      if (!input) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid reset request.' } });
        return;
      }
      const decision = dependencies.tokenConsumeRateLimiter.consume(`${request.ip}:password-reset`);
      if (!decision.allowed) {
        rateLimited(response, decision.retryAfterSeconds);
        return;
      }
      const changed = await resetPassword({
        token: input.token,
        newPassword: input.password,
        tokenStore: dependencies.tokenStore,
        accounts: dependencies.accounts,
        ...(dependencies.sessions ? { sessions: dependencies.sessions } : {}),
      });
      await audit(dependencies.auditSink, changed ? 'auth.password_reset.succeeded_sessions_revoked' : 'auth.password_reset.rejected');
      response.status(changed ? 200 : 400).json(
        changed
          ? { data: { changed: true }, meta: {} }
          : { error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'The token is invalid or expired.' } },
      );
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/auth/email/verify', async (request: Request, response: Response, next) => {
    try {
      const token = tokenFrom(request.body as unknown);
      if (!token) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid verification request.' } });
        return;
      }
      const decision = dependencies.tokenConsumeRateLimiter.consume(`${request.ip}:email-verification`);
      if (!decision.allowed) {
        rateLimited(response, decision.retryAfterSeconds);
        return;
      }
      const verified = await verifyEmail({ token, tokenStore: dependencies.tokenStore, accounts: dependencies.accounts });
      await audit(dependencies.auditSink, verified ? 'auth.email_verification.succeeded' : 'auth.email_verification.rejected');
      response.status(verified ? 200 : 400).json(
        verified
          ? { data: { verified: true }, meta: {} }
          : { error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'The token is invalid or expired.' } },
      );
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/auth/invitations/accept', async (request: Request, response: Response, next) => {
    try {
      const token = tokenFrom(request.body as unknown);
      if (!token) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid invitation request.' } });
        return;
      }
      const decision = dependencies.tokenConsumeRateLimiter.consume(`${request.ip}:invitation`);
      if (!decision.allowed) {
        rateLimited(response, decision.retryAfterSeconds);
        return;
      }
      const accepted = await acceptInvitation({
        token,
        tokenStore: dependencies.tokenStore,
        users: dependencies.users,
        memberships: dependencies.memberships,
      });
      await audit(dependencies.auditSink, accepted ? 'auth.invitation.accepted' : 'auth.invitation.rejected');
      response.status(accepted ? 200 : 400).json(
        accepted
          ? { data: { tenantId: accepted.tenantId, membershipId: accepted.membershipId }, meta: {} }
          : { error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'The token is invalid or expired.' } },
      );
    } catch (error) {
      next(error);
    }
  });
}

export function mountProtectedSessionRoutes(app: Express, dependencies: AccountHttpDependencies): void {
  if (!dependencies.sessions) return;

  app.get('/api/v1/auth/sessions', async (_request: Request, response: Response, next) => {
    try {
      const principal = response.locals.principal as AuthenticatedPrincipal;
      const sessions = await dependencies.sessions!.listForUser(principal.userId);
      response.status(200).json({
        data: sessions.map((session) => ({
          id: session.id,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt,
          userAgent: session.userAgent ?? null,
          ipAddress: session.ipAddress ?? null,
        })),
        meta: {},
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/v1/auth/sessions/:sessionId', async (request: Request, response: Response, next) => {
    try {
      const principal = response.locals.principal as AuthenticatedPrincipal;
      const rawSessionId = request.params.sessionId;
      const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
      if (!sessionId) {
        response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Session id is required.' } });
        return;
      }
      const revoked = await dependencies.sessions!.revokeForUser({ userId: principal.userId, sessionId });
      await audit(dependencies.auditSink, revoked ? 'auth.session.revoked' : 'auth.session.revoke_rejected', { sessionId });
      response.status(revoked ? 204 : 404).send();
    } catch (error) {
      next(error);
    }
  });
}
