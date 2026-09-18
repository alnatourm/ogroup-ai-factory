import { Pool, type PoolClient } from 'pg';
import { hashApiKey, type ApiKeyVerifier, type VerifiedApiKey } from './auth.js';
import type { ProviderConnection, ProviderType } from './types.js';

type ProviderRow = {
  id: string;
  workspace_id: string;
  provider_type: ProviderType;
  name: string;
  base_url: string | null;
  model_default: string | null;
  secret_ciphertext: Buffer;
  config: Record<string, unknown>;
  status: 'active' | 'disabled' | 'error';
  created_at: Date;
  updated_at: Date;
};

export interface ProviderRepository {
  create(input: {
    workspaceId: string;
    providerType: ProviderType;
    name: string;
    baseUrl?: string;
    modelDefault?: string;
    secretCiphertext: string;
    config?: Record<string, unknown>;
  }): Promise<ProviderConnection>;
  list(workspaceId: string): Promise<ProviderConnection[]>;
  get(workspaceId: string, id: string): Promise<ProviderConnection | undefined>;
  remove(workspaceId: string, id: string): Promise<boolean>;
}

function mapProvider(row: ProviderRow): ProviderConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    providerType: row.provider_type,
    name: row.name,
    ...(row.base_url ? { baseUrl: row.base_url } : {}),
    ...(row.model_default ? { modelDefault: row.model_default } : {}),
    secretCiphertext: row.secret_ciphertext.toString('utf8'),
    config: row.config,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PostgresProviderRepository implements ProviderRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    workspaceId: string;
    providerType: ProviderType;
    name: string;
    baseUrl?: string;
    modelDefault?: string;
    secretCiphertext: string;
    config?: Record<string, unknown>;
  }): Promise<ProviderConnection> {
    const result = await this.pool.query<ProviderRow>(
      `insert into provider_connections
        (workspace_id, provider_type, name, base_url, model_default, secret_ciphertext, config)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning *`,
      [
        input.workspaceId,
        input.providerType,
        input.name,
        input.baseUrl ?? null,
        input.modelDefault ?? null,
        Buffer.from(input.secretCiphertext, 'utf8'),
        input.config ?? {},
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('PROVIDER_CREATE_FAILED');
    return mapProvider(row);
  }

  async list(workspaceId: string): Promise<ProviderConnection[]> {
    const result = await this.pool.query<ProviderRow>(
      'select * from provider_connections where workspace_id = $1 order by created_at desc',
      [workspaceId],
    );
    return result.rows.map(mapProvider);
  }

  async get(workspaceId: string, id: string): Promise<ProviderConnection | undefined> {
    const result = await this.pool.query<ProviderRow>(
      'select * from provider_connections where workspace_id = $1 and id = $2 limit 1',
      [workspaceId, id],
    );
    const row = result.rows[0];
    return row ? mapProvider(row) : undefined;
  }

  async remove(workspaceId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      'delete from provider_connections where workspace_id = $1 and id = $2',
      [workspaceId, id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export class PostgresApiKeyVerifier implements ApiKeyVerifier {
  constructor(private readonly pool: Pool) {}

  async verify(rawKey: string): Promise<VerifiedApiKey | null> {
    const keyHash = hashApiKey(rawKey);
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      created_by: string | null;
      scopes: string[];
    }>(
      `select id, workspace_id, created_by, scopes
         from api_keys
        where key_hash = $1
          and revoked_at is null
          and (expires_at is null or expires_at > now())
        limit 1`,
      [keyHash],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      apiKeyId: row.id,
      workspaceId: row.workspace_id,
      userId: row.created_by ?? `api-key:${row.id}`,
      role: 'developer',
      scopes: Array.isArray(row.scopes) ? row.scopes : [],
    };
  }
}

export function createPostgresPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 10 });
}

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const value = await fn(client);
    await client.query('commit');
    return value;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
