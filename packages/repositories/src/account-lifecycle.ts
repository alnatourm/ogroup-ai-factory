import { randomUUID } from 'node:crypto';
import {
  createAccountToken,
  hashAccountToken,
  type AccountTokenIssuer,
  type AccountTokenPurpose,
  type AccountTokenRecord,
  type AccountTokenStore,
} from '@ogroup/account-lifecycle';
import type { SqlClient } from './index.js';

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

interface AccountTokenRow {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  email: string | null;
  purpose: AccountTokenPurpose;
  token_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
}

function mapRow(row: AccountTokenRow): AccountTokenRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    email: row.email,
    purpose: row.purpose,
    tokenHash: row.token_hash,
    expiresAt: asDate(row.expires_at),
    usedAt: row.used_at ? asDate(row.used_at) : null,
  };
}

export class SqlAccountTokenRepository implements AccountTokenStore, AccountTokenIssuer {
  constructor(private readonly db: SqlClient) {}

  async create(input: {
    tenantId?: string | null;
    userId?: string | null;
    email?: string | null;
    purpose: AccountTokenPurpose;
    expiresAt: Date;
  }): Promise<{ token: string; record: AccountTokenRecord }> {
    const token = createAccountToken();
    const tokenHash = hashAccountToken(token);
    const id = randomUUID();
    const normalizedEmail = input.email?.trim().toLowerCase() ?? null;

    const result = await this.db.query<AccountTokenRow>(
      `INSERT INTO account_tokens (
         id, tenant_id, user_id, email, purpose, token_hash, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, user_id, email, purpose, token_hash, expires_at, used_at`,
      [
        id,
        input.tenantId ?? null,
        input.userId ?? null,
        normalizedEmail,
        input.purpose,
        tokenHash,
        input.expiresAt.toISOString(),
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('ACCOUNT_TOKEN_CREATE_FAILED');
    }

    return { token, record: mapRow(row) };
  }

  async findByTokenHash(tokenHash: string): Promise<AccountTokenRecord | null> {
    const result = await this.db.query<AccountTokenRow>(
      `SELECT id, tenant_id, user_id, email, purpose, token_hash, expires_at, used_at
       FROM account_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );

    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async markUsed(input: { id: string; usedAt: Date }): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE account_tokens
       SET used_at = $2
       WHERE id = $1 AND used_at IS NULL AND expires_at > $2
       RETURNING id`,
      [input.id, input.usedAt.toISOString()],
    );

    return result.rows.length === 1;
  }
}
