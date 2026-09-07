import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type AccountTokenPurpose =
  | 'email_verification'
  | 'password_reset'
  | 'invitation';

export interface AccountTokenRecord {
  id: string;
  tenantId: string | null;
  userId: string | null;
  email: string | null;
  purpose: AccountTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface AccountTokenIssuer {
  create(input: {
    tenantId?: string | null;
    userId?: string | null;
    email?: string | null;
    purpose: AccountTokenPurpose;
    expiresAt: Date;
  }): Promise<{ token: string; record: AccountTokenRecord }>;
}

export interface AccountTokenStore {
  findByTokenHash(tokenHash: string): Promise<AccountTokenRecord | null>;
  markUsed(input: { id: string; usedAt: Date }): Promise<boolean>;
}

export function createAccountToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashAccountToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function accountTokenMatches(token: string, tokenHash: string): boolean {
  const candidate = Buffer.from(hashAccountToken(token), 'utf8');
  const expected = Buffer.from(tokenHash, 'utf8');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function isUsableAccountToken(
  record: AccountTokenRecord,
  purpose: AccountTokenPurpose,
  now: Date = new Date(),
): boolean {
  return record.purpose === purpose && record.usedAt === null && record.expiresAt > now;
}

export async function consumeAccountToken(input: {
  token: string;
  purpose: AccountTokenPurpose;
  store: AccountTokenStore;
  now?: Date;
}): Promise<AccountTokenRecord | null> {
  const now = input.now ?? new Date();
  const record = await input.store.findByTokenHash(hashAccountToken(input.token));

  if (!record || !isUsableAccountToken(record, input.purpose, now)) {
    return null;
  }

  const consumed = await input.store.markUsed({ id: record.id, usedAt: now });
  return consumed ? { ...record, usedAt: now } : null;
}
