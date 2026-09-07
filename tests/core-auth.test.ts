import { describe, expect, it } from 'vitest';
import {
  authenticateSession,
  createSessionToken,
  hashSessionToken,
  requirePermission,
  type MembershipResolver,
  type SessionStore,
} from '../packages/auth/src/index.js';

function storeFor(token: string, expiresAt: Date, revokedAt: Date | null = null): SessionStore {
  return {
    async findByTokenHash(tokenHash) {
      if (tokenHash !== hashSessionToken(token)) {
        return null;
      }

      return {
        id: 'session-1',
        userId: 'user-1',
        tokenHash,
        expiresAt,
        revokedAt,
      };
    },
  };
}

const memberships: MembershipResolver = {
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

describe('authentication core', () => {
  it('creates high-entropy opaque session tokens', () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(32);
  });

  it('authenticates only active sessions with membership in the requested tenant', async () => {
    const token = 'known-token';
    const principal = await authenticateSession({
      token,
      tenantId: 'tenant-a',
      sessionStore: storeFor(token, new Date('2030-01-01T00:00:00Z')),
      membershipResolver: memberships,
      now: new Date('2026-09-07T00:00:00Z'),
    });

    expect(principal?.tenantId).toBe('tenant-a');

    const wrongTenant = await authenticateSession({
      token,
      tenantId: 'tenant-b',
      sessionStore: storeFor(token, new Date('2030-01-01T00:00:00Z')),
      membershipResolver: memberships,
      now: new Date('2026-09-07T00:00:00Z'),
    });

    expect(wrongTenant).toBeNull();
  });

  it('rejects expired sessions and missing permissions', async () => {
    const token = 'expired-token';
    const principal = await authenticateSession({
      token,
      tenantId: 'tenant-a',
      sessionStore: storeFor(token, new Date('2020-01-01T00:00:00Z')),
      membershipResolver: memberships,
      now: new Date('2026-09-07T00:00:00Z'),
    });

    expect(principal).toBeNull();

    const activePrincipal = await authenticateSession({
      token: 'active-token',
      tenantId: 'tenant-a',
      sessionStore: storeFor('active-token', new Date('2030-01-01T00:00:00Z')),
      membershipResolver: memberships,
      now: new Date('2026-09-07T00:00:00Z'),
    });

    expect(() => requirePermission(activePrincipal!, 'admin:access')).toThrow(
      'PERMISSION_DENIED',
    );
  });
});
