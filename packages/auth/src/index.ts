import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface AuthenticatedPrincipal {
  userId: string;
  tenantId: string;
  membershipId: string;
  permissions: ReadonlySet<string>;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface SessionStore {
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
}

export interface MembershipResolver {
  resolve(userId: string, tenantId: string): Promise<{
    membershipId: string;
    permissions: string[];
  } | null>;
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionTokenMatches(token: string, tokenHash: string): boolean {
  const candidate = Buffer.from(hashSessionToken(token), 'utf8');
  const expected = Buffer.from(tokenHash, 'utf8');

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function authenticateSession(input: {
  token: string;
  tenantId: string;
  sessionStore: SessionStore;
  membershipResolver: MembershipResolver;
  now?: Date;
}): Promise<AuthenticatedPrincipal | null> {
  const session = await input.sessionStore.findByTokenHash(hashSessionToken(input.token));
  const now = input.now ?? new Date();

  if (!session || session.revokedAt || session.expiresAt <= now) {
    return null;
  }

  const membership = await input.membershipResolver.resolve(session.userId, input.tenantId);
  if (!membership) {
    return null;
  }

  return {
    userId: session.userId,
    tenantId: input.tenantId,
    membershipId: membership.membershipId,
    permissions: new Set(membership.permissions),
  };
}

export function requirePermission(
  principal: AuthenticatedPrincipal,
  permission: string,
): void {
  if (!principal.permissions.has(permission)) {
    throw new Error('PERMISSION_DENIED');
  }
}
