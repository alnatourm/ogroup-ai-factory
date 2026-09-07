import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Algorithm, Version, hash, verify } from '@node-rs/argon2';

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

export interface SessionIssuer {
  create(input: {
    userId: string;
    expiresAt: Date;
  }): Promise<{ token: string; session: SessionRecord }>;
}

export interface CredentialRecord {
  userId: string;
  email: string;
  passwordHash: string;
}

export interface CredentialStore {
  findByEmail(email: string): Promise<CredentialRecord | null>;
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

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) {
    throw new Error('PASSWORD_POLICY_FAILED');
  }

  return hash(password, {
    algorithm: Algorithm.Argon2id,
    version: Version.V0x13,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  if (!password || password.length > 1024) {
    return false;
  }

  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function authenticateCredentials(input: {
  email: string;
  password: string;
  credentialStore: CredentialStore;
  sessionIssuer: SessionIssuer;
  sessionTtlMs: number;
  now?: Date;
}): Promise<{ token: string; session: SessionRecord } | null> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.length > 1024 || input.sessionTtlMs <= 0) {
    return null;
  }

  const credential = await input.credentialStore.findByEmail(email);
  if (!credential || !(await verifyPassword(credential.passwordHash, input.password))) {
    return null;
  }

  const now = input.now ?? new Date();
  return input.sessionIssuer.create({
    userId: credential.userId,
    expiresAt: new Date(now.getTime() + input.sessionTtlMs),
  });
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
