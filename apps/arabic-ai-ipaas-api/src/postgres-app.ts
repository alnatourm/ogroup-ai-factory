import type { Pool } from 'pg';
import type { Router } from 'express';
import { createApp } from './app.js';
import type { ProviderAdapter } from './provider-adapter.js';
import type { BrowserSessionVerifier } from './auth.js';
import { PostgresDocumentContentStore } from './postgres-document-content-store.js';
import {
  PostgresApiKeyVerifier,
  PostgresAuditRepository,
  PostgresDataPolicyRepository,
  PostgresDocumentRepository,
  PostgresMatchDecisionRepository,
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
  browserSessionVerifier?: BrowserSessionVerifier;
  publicAuthRouter?: Router;
}) {
  const { pool } = options;
  return createApp({
    masterKey: options.masterKey,
    providerRepository: new PostgresProviderRepository(pool),
    workflowRepository: new PostgresWorkflowRepository(pool),
    dataPolicyRepository: new PostgresDataPolicyRepository(pool),
    auditRepository: new PostgresAuditRepository(pool),
    documentRepository: new PostgresDocumentRepository(pool),
    matchDecisionRepository: new PostgresMatchDecisionRepository(pool),
    documentContentStore: new PostgresDocumentContentStore(pool),
    traceRepository: new PostgresTraceRepository(pool),
    apiKeyVerifier: new PostgresApiKeyVerifier(pool),
    ...(options.browserSessionVerifier ? { browserSessionVerifier: options.browserSessionVerifier } : {}),
    ...(options.publicAuthRouter ? { publicAuthRouter: options.publicAuthRouter } : {}),
    ...(options.adapter ? { adapter: options.adapter } : {}),
    allowInsecureTestHeaders: false,
  });
}
