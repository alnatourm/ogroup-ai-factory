import express, { type Request, type Response, type Router } from 'express';
import type { Pool } from 'pg';
import * as client from 'openid-client';
import type { BrowserSessionVerifier, VerifiedApiKey } from './auth.js';
import { recordPendingOidcEnrollment } from './oidc-enrollment.js';
import { decryptSecret, encryptSecret } from './security.js';
import type { WorkspaceRole } from './types.js';

const SESSION_COOKIE = '__Host-ogroup_session';
const TRANSACTION_COOKIE = '__Host-ogroup_oidc_txn';
const TEN_MINUTES_SECONDS = 600;
const EIGHT_HOURS_SECONDS = 28_800;
const VALID_ROLES = new Set<WorkspaceRole>([
  'workspace_owner',
  'workspace_admin',
  'developer',
  'automation_builder',
  'viewer',
  'partner_admin',
]);

type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  publicBaseUrl: string;
  sessionSecret: string;
};

type Transaction = {
  codeVerifier: string;
  state: string;
  nonce: string;
  exp: number;
};

type BrowserSession = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  issuer: string;
  subject: string;
  exp: number;
};

function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const item of header?.split(';') ?? []) {
    const separator = item.indexOf('=');
    if (separator <= 0) continue;
    cookies.set(item.slice(0, separator).trim(), item.slice(separator + 1).trim());
  }
  return cookies;
}

function cookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${value}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function openIdConfigurationFromEnvironment(): OidcConfig | undefined {
  const issuer = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const sessionSecret = process.env.OIDC_SESSION_SECRET;
  const supplied = [issuer, clientId, clientSecret, publicBaseUrl, sessionSecret].filter(Boolean).length;
  if (supplied === 0) return undefined;
  if (supplied !== 5) throw new Error('INCOMPLETE_OIDC_CONFIGURATION');

  const issuerUrl = new URL(issuer!);
  const publicUrl = new URL(publicBaseUrl!);
  if (issuerUrl.protocol !== 'https:' || publicUrl.protocol !== 'https:') {
    throw new Error('OIDC_HTTPS_REQUIRED');
  }
  if (publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) {
    throw new Error('PUBLIC_BASE_URL_MUST_BE_ORIGIN');
  }
  if (sessionSecret!.length < 32) throw new Error('OIDC_SESSION_SECRET_TOO_SHORT');
  return {
    issuer: issuer!.trim(),
    clientId: clientId!,
    clientSecret: clientSecret!,
    publicBaseUrl: publicUrl.origin,
    sessionSecret: sessionSecret!,
  };
}

export class OidcAuth implements BrowserSessionVerifier {
  readonly router: Router;
  private discovered?: Promise<client.Configuration>;

  constructor(
    private readonly pool: Pool,
    private readonly config: OidcConfig | undefined = openIdConfigurationFromEnvironment(),
  ) {
    this.router = express.Router();
    this.registerRoutes();
  }

  private configuration(): Promise<client.Configuration> {
    if (!this.config) throw new Error('OIDC_NOT_CONFIGURED');
    this.discovered ??= client.discovery(
      new URL(this.config.issuer),
      this.config.clientId,
      this.config.clientSecret,
    );
    return this.discovered;
  }

  private decode<T>(value: string | undefined): T | undefined {
    if (!value || !this.config) return undefined;
    try {
      const decoded = JSON.parse(decryptSecret(value, this.config.sessionSecret)) as T & { exp?: number };
      if (typeof decoded.exp !== 'number' || decoded.exp <= Math.floor(Date.now() / 1000)) return undefined;
      return decoded;
    } catch {
      return undefined;
    }
  }

  private encode(value: object): string {
    if (!this.config) throw new Error('OIDC_NOT_CONFIGURED');
    return encryptSecret(JSON.stringify(value), this.config.sessionSecret);
  }

  private async resolveIdentity(issuer: string, subject: string): Promise<VerifiedApiKey | null> {
    const result = await this.pool.query<{
      user_id: string;
      workspace_id: string;
      role: WorkspaceRole;
    }>(
      `select u.id as user_id, wm.workspace_id, wm.role
         from oidc_identities oi
         join users u on u.id = oi.user_id and u.status = 'active'
         join workspace_members wm on wm.user_id = u.id
         join workspaces w on w.id = wm.workspace_id and w.status = 'active'
        where oi.issuer = $1 and oi.subject = $2
        order by wm.created_at asc
        limit 2`,
      [issuer, subject],
    );
    if (result.rows.length !== 1) return null;
    const row = result.rows[0]!;
    if (!VALID_ROLES.has(row.role)) return null;
    return {
      apiKeyId: `oidc:${issuer}:${subject}`,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role,
      scopes: ['browser-session'],
    };
  }

  async verify(input: {
    cookieHeader?: string;
    method: string;
    origin?: string;
  }): Promise<VerifiedApiKey | null> {
    if (!this.config) return null;
    const sealed = parseCookies(input.cookieHeader).get(SESSION_COOKIE);
    const session = this.decode<BrowserSession>(sealed);
    if (!session || session.issuer !== this.config.issuer) return null;

    if (!['GET', 'HEAD', 'OPTIONS'].includes(input.method.toUpperCase())) {
      if (!input.origin || input.origin !== new URL(this.config.publicBaseUrl).origin) return null;
    }

    const identity = await this.resolveIdentity(session.issuer, session.subject);
    if (!identity) return null;
    if (
      identity.workspaceId !== session.workspaceId ||
      identity.userId !== session.userId ||
      identity.role !== session.role
    ) {
      return null;
    }
    return identity;
  }

  private registerRoutes(): void {
    this.router.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    });

    this.router.get('/status', async (req, res) => {
      if (!this.config) {
        res.json({ configured: false, authenticated: false });
        return;
      }
      const verified = await this.verify({
        cookieHeader: req.header('cookie'),
        method: req.method,
        origin: req.header('origin'),
      });
      res.json({
        configured: true,
        authenticated: Boolean(verified),
        ...(verified
          ? {
              session: {
                workspaceId: verified.workspaceId,
                userId: verified.userId,
                role: verified.role,
              },
            }
          : {}),
      });
    });

    this.router.get('/login', async (_req, res) => {
      if (!this.config) {
        res.status(503).json({ error: 'OIDC_NOT_CONFIGURED' });
        return;
      }
      try {
        const configuration = await this.configuration();
        const codeVerifier = client.randomPKCECodeVerifier();
        const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
        const state = client.randomState();
        const nonce = client.randomNonce();
        const transaction: Transaction = {
          codeVerifier,
          state,
          nonce,
          exp: Math.floor(Date.now() / 1000) + TEN_MINUTES_SECONDS,
        };
        const authorizationUrl = client.buildAuthorizationUrl(configuration, {
          redirect_uri: `${this.config.publicBaseUrl}/auth/callback`,
          scope: 'openid email profile',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          state,
          nonce,
        });
        res.setHeader('Set-Cookie', cookie(TRANSACTION_COOKIE, this.encode(transaction), TEN_MINUTES_SECONDS));
        res.redirect(302, authorizationUrl.href);
      } catch {
        res.status(502).json({ error: 'OIDC_DISCOVERY_FAILED' });
      }
    });

    this.router.get('/callback', async (req, res) => {
      if (!this.config) {
        res.status(503).json({ error: 'OIDC_NOT_CONFIGURED' });
        return;
      }
      const transaction = this.decode<Transaction>(
        parseCookies(req.header('cookie')).get(TRANSACTION_COOKIE),
      );
      if (!transaction) {
        res.status(400).json({ error: 'OIDC_TRANSACTION_INVALID' });
        return;
      }
      try {
        const configuration = await this.configuration();
        const callbackUrl = new URL(`${this.config.publicBaseUrl}${req.originalUrl}`);
        const tokens = await client.authorizationCodeGrant(configuration, callbackUrl, {
          pkceCodeVerifier: transaction.codeVerifier,
          expectedState: transaction.state,
          expectedNonce: transaction.nonce,
          idTokenExpected: true,
        });
        const claims = tokens.claims();
        const subject = claims?.sub;
        const issuer = claims?.iss;
        if (!subject || issuer !== this.config.issuer) {
          res.status(401).json({ error: 'OIDC_IDENTITY_INVALID' });
          return;
        }
        const identity = await this.resolveIdentity(issuer, subject);
        if (!identity) {
          const email = claims?.email;
          if (typeof email !== 'string' || claims?.email_verified !== true) {
            res.setHeader('Set-Cookie', clearCookie(TRANSACTION_COOKIE));
            res.status(403).json({ error: 'OIDC_VERIFIED_EMAIL_REQUIRED' });
            return;
          }
          try {
            const enrollment = await recordPendingOidcEnrollment(
              this.pool,
              {
                issuer,
                subject,
                email,
                emailVerified: true,
                ...(typeof claims?.name === 'string' ? { displayName: claims.name } : {}),
              },
              this.config.sessionSecret,
            );
            res.setHeader('Set-Cookie', clearCookie(TRANSACTION_COOKIE));
            res.status(403).json({
              error: 'OIDC_MEMBERSHIP_NOT_PROVISIONED',
              enrollmentReference: enrollment.reference,
              expiresAt: enrollment.expiresAt,
            });
          } catch {
            res.status(503).json({ error: 'OIDC_ENROLLMENT_UNAVAILABLE' });
          }
          return;
        }
        const session: BrowserSession = {
          workspaceId: identity.workspaceId,
          userId: identity.userId,
          role: identity.role,
          issuer,
          subject,
          exp: Math.floor(Date.now() / 1000) + EIGHT_HOURS_SECONDS,
        };
        res.setHeader('Set-Cookie', [
          cookie(SESSION_COOKIE, this.encode(session), EIGHT_HOURS_SECONDS),
          clearCookie(TRANSACTION_COOKIE),
        ]);
        res.redirect(302, '/#/workspace-onboarding');
      } catch {
        res.status(401).json({ error: 'OIDC_CALLBACK_REJECTED' });
      }
    });

    this.router.post('/logout', (req: Request, res: Response) => {
      if (this.config && req.header('origin') !== new URL(this.config.publicBaseUrl).origin) {
        res.status(403).json({ error: 'INVALID_ORIGIN' });
        return;
      }
      res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
      res.status(204).end();
    });
  }
}
