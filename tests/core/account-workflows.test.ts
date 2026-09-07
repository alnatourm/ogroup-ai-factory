import { describe, expect, it } from 'vitest';
import {
  acceptInvitation,
  issueInvitation,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '@ogroup/account-workflows';
import {
  createAccountToken,
  hashAccountToken,
  type AccountTokenRecord,
  type AccountTokenIssuer,
  type AccountTokenStore,
} from '@ogroup/account-lifecycle';

class MemoryTokens implements AccountTokenIssuer, AccountTokenStore {
  records = new Map<string, AccountTokenRecord>();

  async create(input: {
    tenantId?: string | null;
    userId?: string | null;
    email?: string | null;
    purpose: AccountTokenRecord['purpose'];
    expiresAt: Date;
  }) {
    const token = createAccountToken();
    const record: AccountTokenRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      email: input.email ?? null,
      purpose: input.purpose,
      tokenHash: hashAccountToken(token),
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.records.set(record.tokenHash, record);
    return { token, record };
  }

  async findByTokenHash(tokenHash: string) {
    return this.records.get(tokenHash) ?? null;
  }

  async markUsed(input: { id: string; usedAt: Date }) {
    for (const [key, record] of this.records) {
      if (record.id === input.id && record.usedAt === null) {
        this.records.set(key, { ...record, usedAt: input.usedAt });
        return true;
      }
    }
    return false;
  }
}

describe('account workflows', () => {
  it('keeps password reset request non-enumerating at service boundary', async () => {
    const tokens = new MemoryTokens();
    const accounts = {
      findUserByEmail: async (email: string) => email === 'known@example.com' ? { userId: 'u1', email } : null,
      markEmailVerified: async () => true,
      setPasswordHash: async () => true,
    };

    const known = await requestPasswordReset({ email: 'KNOWN@example.com', accounts, tokenIssuer: tokens, ttlMs: 60_000 });
    const unknown = await requestPasswordReset({ email: 'nobody@example.com', accounts, tokenIssuer: tokens, ttlMs: 60_000 });

    expect(known?.token).toBeTruthy();
    expect(unknown).toBeNull();
  });

  it('consumes password reset tokens only once', async () => {
    const tokens = new MemoryTokens();
    const issued = await tokens.create({ userId: 'u1', email: 'user@example.com', purpose: 'password_reset', expiresAt: new Date(Date.now() + 60_000) });
    let updates = 0;
    const accounts = {
      findUserByEmail: async () => null,
      markEmailVerified: async () => true,
      setPasswordHash: async () => { updates += 1; return true; },
    };

    expect(await resetPassword({ token: issued.token, newPassword: 'very-secure-password', tokenStore: tokens, accounts })).toBe(true);
    expect(await resetPassword({ token: issued.token, newPassword: 'another-secure-password', tokenStore: tokens, accounts })).toBe(false);
    expect(updates).toBe(1);
  });

  it('verifies email and prevents token replay', async () => {
    const tokens = new MemoryTokens();
    const issued = await tokens.create({ userId: 'u1', email: 'user@example.com', purpose: 'email_verification', expiresAt: new Date(Date.now() + 60_000) });
    let verified = 0;
    const accounts = {
      findUserByEmail: async () => null,
      markEmailVerified: async () => { verified += 1; return true; },
      setPasswordHash: async () => true,
    };

    expect(await verifyEmail({ token: issued.token, tokenStore: tokens, accounts })).toBe(true);
    expect(await verifyEmail({ token: issued.token, tokenStore: tokens, accounts })).toBe(false);
    expect(verified).toBe(1);
  });

  it('accepts an invitation into exactly its tenant', async () => {
    const tokens = new MemoryTokens();
    const invitation = await issueInvitation({ tenantId: 'tenant-a', email: 'Invitee@Example.com', tokenIssuer: tokens, ttlMs: 60_000 });
    const result = await acceptInvitation({
      token: invitation.token,
      tokenStore: tokens,
      users: { findOrCreateByEmail: async (email: string) => ({ userId: 'u2', email }) },
      memberships: { ensureMembership: async ({ tenantId, userId }) => ({ membershipId: `${tenantId}:${userId}` }) },
    });

    expect(result).toEqual({ userId: 'u2', membershipId: 'tenant-a:u2', tenantId: 'tenant-a' });
  });
});
