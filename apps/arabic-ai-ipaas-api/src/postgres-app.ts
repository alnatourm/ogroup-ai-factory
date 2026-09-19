import type { Pool } from 'pg';
import { createApp } from './app.js';
import type { ProviderAdapter } from './provider-adapter.js';
import {
  PostgresApiKeyVerifier,
  PostgresAuditRepository,
  PostgresDataPolicyRepository,
  PostgresDocumentRepository,
  PostgresProviderRepository,
  PostgresTraceRepository,
  PostgresWorkflowRepository,
} from './postgres.js';

/**
 * Production repository bootstrap.
 *
 * Deliberately requires an existing PostgreSQL pool so the deployment owns
 * connection lifecycle and can run migrations before accepting traffic.
 * Insecure identity headers remain disabled.
 */
export function createPostgresApp(options: {
  pool: Pool;
  masterKey?: string;
  adapter?: ProviderAdapter;
}) {
  const { pool } = options;
  return createApp({
    masterKey: options.masterKey,
    providerRepository: new PostgresProviderRepository(pool),
    workflowRepository: new PostgresWorkflowRepository(pool),
    dataPolicyRepository: new PostgresDataPolicyRepository(pool),
    auditRepository: new PostgresAuditRepository(pool),
    documentRepository: new PostgresDocumentRepository(pool),
    traceRepository: new PostgresTraceRepository(pool),
    apiKeyVerifier: new PostgresApiKeyVerifier(pool),
    ...(options.adapter ? { adapter: options.adapter } : {}),
    allowInsecureTestHeaders: false,
  });
}
