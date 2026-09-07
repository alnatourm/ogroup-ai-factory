import {
  consumeAccountToken,
  type AccountTokenIssuer,
  type AccountTokenStore,
} from '@ogroup/account-lifecycle';
import { hashPassword } from '@ogroup/auth';

export interface AccountDirectory {
  findUserByEmail(email: string): Promise<{ userId: string; email: string } | null>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<boolean>;
  setPasswordHash(userId: string, passwordHash: string): Promise<boolean>;
}

export interface PasswordResetSessionRevoker {
  revokeAllForUser(userId: string): Promise<number>;
}

export interface MembershipWriter {
  ensureMembership(input: { tenantId: string; userId: string }): Promise<{ membershipId: string }>;
}

export interface UserProvisioner {
  findOrCreateByEmail(email: string): Promise<{ userId: string; email: string }>;
}

export async function issueEmailVerification(input: {
  userId: string;
  email: string;
  tokenIssuer: AccountTokenIssuer;
  ttlMs: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return input.tokenIssuer.create({
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    purpose: 'email_verification',
    expiresAt: new Date(now.getTime() + input.ttlMs),
  });
}

export async function verifyEmail(input: {
  token: string;
  tokenStore: AccountTokenStore;
  accounts: AccountDirectory;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const record = await consumeAccountToken({ token: input.token, purpose: 'email_verification', store: input.tokenStore, now });
  if (!record?.userId) return false;
  return input.accounts.markEmailVerified(record.userId, now);
}

export async function requestPasswordReset(input: {
  email: string;
  accounts: AccountDirectory;
  tokenIssuer: AccountTokenIssuer;
  ttlMs: number;
  now?: Date;
}): Promise<{ token: string } | null> {
  const account = await input.accounts.findUserByEmail(input.email.trim().toLowerCase());
  if (!account) return null;
  const now = input.now ?? new Date();
  const issued = await input.tokenIssuer.create({
    userId: account.userId,
    email: account.email.trim().toLowerCase(),
    purpose: 'password_reset',
    expiresAt: new Date(now.getTime() + input.ttlMs),
  });
  return { token: issued.token };
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
  tokenStore: AccountTokenStore;
  accounts: AccountDirectory;
  sessions?: PasswordResetSessionRevoker;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const record = await consumeAccountToken({ token: input.token, purpose: 'password_reset', store: input.tokenStore, now });
  if (!record?.userId) return false;

  const passwordHash = await hashPassword(input.newPassword);
  const changed = await input.accounts.setPasswordHash(record.userId, passwordHash);
  if (!changed) return false;

  if (input.sessions) {
    await input.sessions.revokeAllForUser(record.userId);
  }
  return true;
}

export async function issueInvitation(input: {
  tenantId: string;
  email: string;
  tokenIssuer: AccountTokenIssuer;
  ttlMs: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return input.tokenIssuer.create({
    tenantId: input.tenantId,
    email: input.email.trim().toLowerCase(),
    purpose: 'invitation',
    expiresAt: new Date(now.getTime() + input.ttlMs),
  });
}

export async function acceptInvitation(input: {
  token: string;
  tokenStore: AccountTokenStore;
  users: UserProvisioner;
  memberships: MembershipWriter;
  now?: Date;
}): Promise<{ userId: string; membershipId: string; tenantId: string } | null> {
  const now = input.now ?? new Date();
  const record = await consumeAccountToken({ token: input.token, purpose: 'invitation', store: input.tokenStore, now });
  if (!record?.tenantId || !record.email) return null;
  const user = await input.users.findOrCreateByEmail(record.email);
  const membership = await input.memberships.ensureMembership({ tenantId: record.tenantId, userId: user.userId });
  return { userId: user.userId, membershipId: membership.membershipId, tenantId: record.tenantId };
}
