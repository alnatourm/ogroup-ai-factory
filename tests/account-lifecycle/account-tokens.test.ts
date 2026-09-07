import { describe, expect, it } from 'vitest';
import {
  accountTokenMatches,
  consumeAccountToken,
  createAccountToken,
  hashAccountToken,
  type AccountTokenRecord,
  type AccountTokenStore,
} from '../../packages/account-lifecycle/src/index.js';

describe('account lifecycle tokens', () => {
  it('creates opaque tokens and compares only their hashes', () => {
    const token = createAccountToken();
    const tokenHash = hashAccountToken(token);

    expect(token).not.toBe(tokenHash);
    expect(token.length).toBeGreaterThan(32);
    expect(accountTokenMatches(token, tokenHash)).toBe(true);
    expect(accountTokenMatches(`${token}x`, tokenHash)).toBe(false);
  });

  it('consumes a valid purpose-bound token exactly once', async () => {
    const token = createAccountToken();
    let record: AccountTokenRecord = {
      id: 'token-1',
      tenantId: null,
      userId: 'user-1',
      email: 'user@example.com',
      purpose: 'password_reset',
      tokenHash: hashAccountToken(token),
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      usedAt: null,
    };

    const store: AccountTokenStore = {
      async findByTokenHash(tokenHash) {
        return tokenHash === record.tokenHash ? record : null;
      },
      async markUsed({ id, usedAt }) {
        if (id !== record.id || record.usedAt) return false;
        record = { ...record, usedAt };
        return true;
      },
    };

    const first = await consumeAccountToken({
      token,
      purpose: 'password_reset',
      store,
      now: new Date('2029-01-01T00:00:00Z'),
    });
    const second = await consumeAccountToken({
      token,
      purpose: 'password_reset',
      store,
      now: new Date('2029-01-01T00:00:01Z'),
    });

    expect(first?.usedAt).not.toBeNull();
    expect(second).toBeNull();
  });

  it('rejects wrong-purpose and expired tokens', async () => {
    const token = createAccountToken();
    const record: AccountTokenRecord = {
      id: 'token-2',
      tenantId: null,
      userId: 'user-1',
      email: null,
      purpose: 'email_verification',
      tokenHash: hashAccountToken(token),
      expiresAt: new Date('2028-01-01T00:00:00Z'),
      usedAt: null,
    };
    const store: AccountTokenStore = {
      async findByTokenHash() { return record; },
      async markUsed() { return true; },
    };

    expect(await consumeAccountToken({ token, purpose: 'password_reset', store, now: new Date('2027-01-01T00:00:00Z') })).toBeNull();
    expect(await consumeAccountToken({ token, purpose: 'email_verification', store, now: new Date('2029-01-01T00:00:00Z') })).toBeNull();
  });
});
