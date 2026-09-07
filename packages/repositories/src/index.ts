import { randomUUID } from 'node:crypto';
import {
  createSessionToken,
  hashSessionToken,
  type CredentialRecord,
  type CredentialStore,
  type MembershipResolver,
  type SessionRecord,
  type SessionStore,
} from '@ogroup/auth';

export interface SqlQueryResult<T> {
  rows: T[];
}

export interface SqlClient {
  query<T>(sql: string, params?: unknown[]): Promise<SqlQueryResult<T>>;
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string | Date;
  revoked_at: string | Date | null;
}

export class SqlSessionRepository implements SessionStore {
  constructor(private readonly db: SqlClient) {}

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const result = await this.db.query<SessionRow>(
      `SELECT id, user_id, token_hash, expires_at, revoked_at
       FROM sessions
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: asDate(row.expires_at),
      revokedAt: row.revoked_at ? asDate(row.revoked_at) : null,
    };
  }

  async create(input: {
    userId: string;
    expiresAt: Date;
  }): Promise<{ token: string; session: SessionRecord }> {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const id = randomUUID();

    const result = await this.db.query<SessionRow>(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, token_hash, expires_at, revoked_at`,
      [id, input.userId, tokenHash, input.expiresAt.toISOString()],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('SESSION_CREATE_FAILED');
    }

    return {
      token,
      session: {
        id: row.id,
        userId: row.user_id,
        tokenHash: row.token_hash,
        expiresAt: asDate(row.expires_at),
        revokedAt: row.revoked_at ? asDate(row.revoked_at) : null,
      },
    };
  }

  async revoke(input: { sessionId: string; userId: string }): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE sessions
       SET revoked_at = now()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [input.sessionId, input.userId],
    );

    return result.rows.length === 1;
  }
}

interface CredentialRow {
  id: string;
  email: string;
  password_hash: string;
}

export class SqlCredentialRepository implements CredentialStore {
  constructor(private readonly db: SqlClient) {}

  async findByEmail(email: string): Promise<CredentialRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.db.query<CredentialRow>(
      `SELECT id, email, password_hash
       FROM users
       WHERE lower(email) = $1 AND password_hash IS NOT NULL
       LIMIT 1`,
      [normalizedEmail],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      userId: row.id,
      email: row.email,
      passwordHash: row.password_hash,
    };
  }

  async setPasswordHash(input: { userId: string; passwordHash: string }): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE users
       SET password_hash = $2, updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [input.userId, input.passwordHash],
    );

    return result.rows.length === 1;
  }
}

interface MembershipRow {
  id: string;
}

interface PermissionRow {
  key: string;
}

export class SqlMembershipResolver implements MembershipResolver {
  constructor(private readonly db: SqlClient) {}

  async resolve(userId: string, tenantId: string): Promise<{
    membershipId: string;
    permissions: string[];
  } | null> {
    const membershipResult = await this.db.query<MembershipRow>(
      `SELECT id
       FROM memberships
       WHERE user_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [userId, tenantId],
    );

    const membership = membershipResult.rows[0];
    if (!membership) {
      return null;
    }

    const permissionResult = await this.db.query<PermissionRow>(
      `SELECT DISTINCT p.key
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.membership_id = $1 AND r.tenant_id = $2
       ORDER BY p.key`,
      [membership.id, tenantId],
    );

    return {
      membershipId: membership.id,
      permissions: permissionResult.rows.map((row) => row.key),
    };
  }
}
