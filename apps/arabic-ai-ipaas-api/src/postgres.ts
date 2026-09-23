import crypto from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { hashApiKey, type ApiKeyVerifier, type VerifiedApiKey } from './auth.js';
import type {
  AuditEventRecord,
  DataPolicyConfig,
  DocumentExtractionRecord,
  DocumentRecord,
  DocumentReviewRecord,
  GatewayTraceRecord,
  ProviderConnection,
  ProviderType,
  WorkflowJsonV1,
  WorkflowRecord,
  WorkflowRunRecord,
  WorkflowStepRunRecord,
} from './types.js';
import type { WorkflowRepository } from './workflow-engine.js';
import type { DataPolicyRepository } from './data-policy.js';
import type { DocumentRepository } from './document-service.js';
import type { TraceRepository } from './usage-service.js';
import type { AuditRepository } from './audit-service.js';
import { getDefaultDataPolicy } from './data-policy.js';
import type { MatchDecisionRecord, MatchDecisionRepository } from './document-match-decision.js';

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
  update?(
    workspaceId: string,
    id: string,
    updates: Partial<{
      name: string;
      baseUrl: string;
      modelDefault: string;
      secretCiphertext: string;
      status: 'active' | 'disabled' | 'error';
      config: Record<string, unknown>;
    }>,
  ): Promise<ProviderConnection | undefined>;
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

export class PostgresWorkflowRepository implements WorkflowRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    workspaceId: string;
    name: string;
    description?: string;
    definition: WorkflowJsonV1;
    createdBy?: string;
  }): Promise<WorkflowRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      name: string;
      description: string | null;
      schema_version: string;
      definition: WorkflowJsonV1;
      status: 'draft' | 'active' | 'paused' | 'archived';
      version: number;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `insert into workflows (workspace_id, name, description, schema_version, definition, created_by)
       values ($1, $2, $3, 'workflow-json-v1', $4, $5)
       returning *`,
      [input.workspaceId, input.name, input.description ?? null, input.definition, input.createdBy ?? null],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description ?? undefined,
      schemaVersion: row.schema_version,
      definition: row.definition,
      status: row.status,
      version: row.version,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async list(workspaceId: string): Promise<WorkflowRecord[]> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      name: string;
      description: string | null;
      schema_version: string;
      definition: WorkflowJsonV1;
      status: 'draft' | 'active' | 'paused' | 'archived';
      version: number;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      'select * from workflows where workspace_id = $1 order by updated_at desc',
      [workspaceId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description ?? undefined,
      schemaVersion: row.schema_version,
      definition: row.definition,
      status: row.status,
      version: row.version,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async get(workspaceId: string, id: string): Promise<WorkflowRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      name: string;
      description: string | null;
      schema_version: string;
      definition: WorkflowJsonV1;
      status: 'draft' | 'active' | 'paused' | 'archived';
      version: number;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      'select * from workflows where workspace_id = $1 and id = $2 limit 1',
      [workspaceId, id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description ?? undefined,
      schemaVersion: row.schema_version,
      definition: row.definition,
      status: row.status,
      version: row.version,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async update(
    workspaceId: string,
    id: string,
    updates: {
      name?: string;
      description?: string;
      definition?: WorkflowJsonV1;
      status?: 'draft' | 'active' | 'paused' | 'archived';
    },
  ): Promise<WorkflowRecord | undefined> {
    const current = await this.get(workspaceId, id);
    if (!current) return undefined;

    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      name: string;
      description: string | null;
      schema_version: string;
      definition: WorkflowJsonV1;
      status: 'draft' | 'active' | 'paused' | 'archived';
      version: number;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `update workflows
         set name = coalesce($3, name),
             description = coalesce($4, description),
             definition = coalesce($5, definition),
             status = coalesce($6, status),
             version = version + 1,
             updated_at = now()
       where workspace_id = $1 and id = $2
       returning *`,
      [
        workspaceId,
        id,
        updates.name ?? null,
        updates.description ?? null,
        updates.definition ? JSON.stringify(updates.definition) : null,
        updates.status ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description ?? undefined,
      schemaVersion: row.schema_version,
      definition: row.definition,
      status: row.status,
      version: row.version,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async createRun(input: {
    workspaceId: string;
    workflowId: string;
    triggerType: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
    input?: Record<string, unknown>;
  }): Promise<WorkflowRunRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      trigger_type: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      input: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error_code: string | null;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(
      `insert into workflow_runs (workspace_id, workflow_id, trigger_type, status, input, started_at)
       values ($1, $2, $3, 'queued', $4, now())
       returning *`,
      [input.workspaceId, input.workflowId, input.triggerType, input.input ?? {}],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workflowId: row.workflow_id,
      triggerType: row.trigger_type,
      status: row.status,
      input: row.input ?? {},
      output: row.output ?? undefined,
      durationMs: 0,
      startedAt: row.started_at?.toISOString() ?? new Date().toISOString(),
      createdAt: row.created_at.toISOString(),
      stepRuns: [],
    };
  }

  async updateRun(
    workspaceId: string,
    runId: string,
    updates: Partial<WorkflowRunRecord>,
  ): Promise<WorkflowRunRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      trigger_type: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      input: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error_code: string | null;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(
      `update workflow_runs
         set status = coalesce($3, status),
             output = coalesce($4, output),
             error_code = coalesce($5, error_code),
             error_message = coalesce($6, error_message),
             completed_at = coalesce($7, completed_at)
       where workspace_id = $1 and id = $2
       returning *`,
      [
        workspaceId,
        runId,
        updates.status ?? null,
        updates.output ? JSON.stringify(updates.output) : null,
        updates.errorCode ?? null,
        updates.errorMessage ?? null,
        updates.completedAt ? new Date(updates.completedAt) : null,
      ],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const stepRuns = await this.getStepRuns(runId);
    const duration = updates.durationMs ?? (row.completed_at && row.started_at ? row.completed_at.getTime() - row.started_at.getTime() : 0);
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workflowId: row.workflow_id,
      triggerType: row.trigger_type,
      status: row.status,
      input: row.input ?? undefined,
      output: row.output ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      durationMs: duration,
      startedAt: row.started_at?.toISOString() ?? new Date().toISOString(),
      completedAt: row.completed_at?.toISOString() ?? undefined,
      createdAt: row.created_at.toISOString(),
      stepRuns,
    };
  }

  private async getStepRuns(runId: string): Promise<WorkflowStepRunRecord[]> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_run_id: string;
      step_key: string;
      step_type: string;
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
      input: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error_code: string | null;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(
      'select * from workflow_step_runs where workflow_run_id = $1 order by created_at asc',
      [runId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      workflowRunId: row.workflow_run_id,
      stepKey: row.step_key,
      stepType: row.step_type,
      status: row.status,
      input: row.input ?? undefined,
      output: row.output ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      durationMs: row.completed_at && row.started_at ? row.completed_at.getTime() - row.started_at.getTime() : 0,
      startedAt: row.started_at?.toISOString() ?? new Date().toISOString(),
      completedAt: row.completed_at?.toISOString() ?? undefined,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async saveStepRun(stepRun: WorkflowStepRunRecord): Promise<WorkflowStepRunRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_run_id: string;
      step_key: string;
      step_type: string;
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
      input: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error_code: string | null;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(
      `insert into workflow_step_runs
        (id, workspace_id, workflow_run_id, step_key, step_type, status, input, output, error_code, error_message, started_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update
         set status = excluded.status,
             output = excluded.output,
             error_code = excluded.error_code,
             error_message = excluded.error_message,
             completed_at = excluded.completed_at
       returning *`,
      [
        stepRun.id,
        stepRun.workspaceId,
        stepRun.workflowRunId,
        stepRun.stepKey,
        stepRun.stepType,
        stepRun.status,
        stepRun.input ?? {},
        stepRun.output ?? {},
        stepRun.errorCode ?? null,
        stepRun.errorMessage ?? null,
        new Date(stepRun.startedAt),
        stepRun.completedAt ? new Date(stepRun.completedAt) : null,
      ],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workflowRunId: row.workflow_run_id,
      stepKey: row.step_key,
      stepType: row.step_type,
      status: row.status,
      input: row.input ?? undefined,
      output: row.output ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      durationMs: stepRun.durationMs,
      startedAt: row.started_at?.toISOString() ?? stepRun.startedAt,
      completedAt: row.completed_at?.toISOString() ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async listRuns(workspaceId: string, workflowId?: string): Promise<WorkflowRunRecord[]> {
    const query = workflowId
      ? 'select * from workflow_runs where workspace_id = $1 and workflow_id = $2 order by created_at desc'
      : 'select * from workflow_runs where workspace_id = $1 order by created_at desc';
    const params = workflowId ? [workspaceId, workflowId] : [workspaceId];

    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      trigger_type: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      input: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error_code: string | null;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(query, params);

    return Promise.all(
      result.rows.map(async (row) => {
        const stepRuns = await this.getStepRuns(row.id);
        const duration = row.completed_at && row.started_at ? row.completed_at.getTime() - row.started_at.getTime() : 0;
        return {
          id: row.id,
          workspaceId: row.workspace_id,
          workflowId: row.workflow_id,
          triggerType: row.trigger_type,
          status: row.status,
          input: row.input ?? undefined,
          output: row.output ?? undefined,
          errorCode: row.error_code ?? undefined,
          errorMessage: row.error_message ?? undefined,
          durationMs: duration,
          startedAt: row.started_at?.toISOString() ?? row.created_at.toISOString(),
          completedAt: row.completed_at?.toISOString() ?? undefined,
          createdAt: row.created_at.toISOString(),
          stepRuns,
        };
      }),
    );
  }

  async getRun(workspaceId: string, runId: string): Promise<WorkflowRunRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      workflow_id: string;
      trigger_type: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      input: Record<string, unknown> | null;
      output: Record<string, unknown> | null;
      error_code: string | null;
      error_message: string | null;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
    }>(
      'select * from workflow_runs where workspace_id = $1 and id = $2 limit 1',
      [workspaceId, runId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const stepRuns = await this.getStepRuns(row.id);
    const duration = row.completed_at && row.started_at ? row.completed_at.getTime() - row.started_at.getTime() : 0;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      workflowId: row.workflow_id,
      triggerType: row.trigger_type,
      status: row.status,
      input: row.input ?? undefined,
      output: row.output ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      durationMs: duration,
      startedAt: row.started_at?.toISOString() ?? row.created_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? undefined,
      createdAt: row.created_at.toISOString(),
      stepRuns,
    };
  }
}

export class PostgresDataPolicyRepository implements DataPolicyRepository {
  constructor(private readonly pool: Pool) {}

  async get(workspaceId: string): Promise<DataPolicyConfig> {
    const result = await this.pool.query<{
      workspace_id: string;
      data_zone: DataPolicyConfig['dataZone'];
      pii_masking_enabled: boolean;
      retention_days: number;
      audit_logging_enabled: boolean;
      strict_zdr_level: number;
      dual_admin_approval_required: boolean;
      opt_in_confirmed: boolean;
      rights_basis: string | null;
      updated_at: Date;
    }>(
      'select * from workspace_data_policies where workspace_id = $1 limit 1',
      [workspaceId],
    );
    const row = result.rows[0];
    if (!row) return getDefaultDataPolicy(workspaceId);
    return {
      workspaceId: row.workspace_id,
      dataZone: row.data_zone,
      piiMaskingEnabled: row.pii_masking_enabled,
      retentionDays: row.retention_days,
      auditLoggingEnabled: row.audit_logging_enabled,
      strictZdrLevel: row.strict_zdr_level,
      dualAdminApprovalRequired: row.dual_admin_approval_required,
      optInConfirmed: row.opt_in_confirmed,
      rightsBasis: row.rights_basis ?? undefined,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async update(workspaceId: string, updates: Partial<DataPolicyConfig>): Promise<DataPolicyConfig> {
    const current = await this.get(workspaceId);
    const updated: DataPolicyConfig = {
      ...current,
      ...updates,
      workspaceId,
      updatedAt: new Date().toISOString(),
    };

    await this.pool.query(
      `insert into workspace_data_policies (
           workspace_id, data_zone, pii_masking_enabled, retention_days,
           audit_logging_enabled, strict_zdr_level, dual_admin_approval_required,
           opt_in_confirmed, rights_basis, updated_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         on conflict (workspace_id) do update
           set data_zone = excluded.data_zone,
               pii_masking_enabled = excluded.pii_masking_enabled,
               retention_days = excluded.retention_days,
               audit_logging_enabled = excluded.audit_logging_enabled,
               strict_zdr_level = excluded.strict_zdr_level,
               dual_admin_approval_required = excluded.dual_admin_approval_required,
               opt_in_confirmed = excluded.opt_in_confirmed,
               rights_basis = excluded.rights_basis,
               updated_at = now()`,
        [
          workspaceId,
          updated.dataZone,
          updated.piiMaskingEnabled,
          updated.retentionDays,
          updated.auditLoggingEnabled,
          updated.strictZdrLevel,
          updated.dualAdminApprovalRequired,
          updated.optInConfirmed,
          updated.rightsBasis ?? null,
      ],
    );

    return updated;
  }
}

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    workspaceId: string;
    filename: string;
    mediaType: string;
    sizeBytes: number;
    createdBy?: string;
  }): Promise<DocumentRecord> {
    const id = crypto.randomUUID();
    const objectKey = `documents/${input.workspaceId}/${id}/${input.filename}`;
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      filename: string;
      media_type: string;
      object_key: string;
      size_bytes: string | number;
      status: DocumentRecord['status'];
      created_by: string | null;
      created_at: Date;
    }>(
      `insert into documents (id, workspace_id, filename, media_type, object_key, size_bytes, status, created_by)
       values ($1, $2, $3, $4, $5, $6, 'uploaded', $7)
       returning *`,
      [id, input.workspaceId, input.filename, input.mediaType, objectKey, input.sizeBytes, input.createdBy ?? null],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      filename: row.filename,
      mediaType: row.media_type,
      objectKey: row.object_key,
      sizeBytes: Number(row.size_bytes),
      status: row.status,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async get(workspaceId: string, id: string): Promise<DocumentRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      filename: string;
      media_type: string;
      object_key: string;
      size_bytes: string | number;
      status: DocumentRecord['status'];
      created_by: string | null;
      created_at: Date;
    }>(
      'select * from documents where workspace_id = $1 and id = $2 limit 1',
      [workspaceId, id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      filename: row.filename,
      mediaType: row.media_type,
      objectKey: row.object_key,
      sizeBytes: Number(row.size_bytes),
      status: row.status,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async list(workspaceId: string): Promise<DocumentRecord[]> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      filename: string;
      media_type: string;
      object_key: string;
      size_bytes: string | number;
      status: DocumentRecord['status'];
      created_by: string | null;
      created_at: Date;
    }>(
      'select * from documents where workspace_id = $1 order by created_at desc',
      [workspaceId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      filename: row.filename,
      mediaType: row.media_type,
      objectKey: row.object_key,
      sizeBytes: Number(row.size_bytes),
      status: row.status,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    status: DocumentRecord['status'],
  ): Promise<DocumentRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      filename: string;
      media_type: string;
      object_key: string;
      size_bytes: string | number;
      status: DocumentRecord['status'];
      created_by: string | null;
      created_at: Date;
    }>(
      'update documents set status = $3 where workspace_id = $1 and id = $2 returning *',
      [workspaceId, id, status],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      filename: row.filename,
      mediaType: row.media_type,
      objectKey: row.object_key,
      sizeBytes: Number(row.size_bytes),
      status: row.status,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async createOrUpdateExtraction(
    workspaceId: string,
    documentId: string,
    extraction: Omit<DocumentExtractionRecord, 'id' | 'workspaceId' | 'documentId' | 'createdAt'>,
  ): Promise<DocumentExtractionRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      document_id: string;
      schema_version: string;
      engine_version: string | null;
      markdown: string | null;
      structured_json: Record<string, unknown> | null;
      language: string | null;
      page_count: number | null;
      status: 'processing' | 'ready' | 'failed';
      error_message: string | null;
      created_at: Date;
    }>(
      `insert into document_extractions
        (workspace_id, document_id, schema_version, engine_version, markdown, structured_json, language, page_count, status, error_message)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        workspaceId,
        documentId,
        extraction.schemaVersion ?? 'document-extraction-json-v1',
        extraction.engineVersion ?? null,
        extraction.markdown ?? null,
        extraction.structuredJson ? JSON.stringify(extraction.structuredJson) : null,
        extraction.language ?? null,
        extraction.pageCount ?? null,
        extraction.status,
        extraction.errorMessage ?? null,
      ],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      documentId: row.document_id,
      schemaVersion: row.schema_version,
      engineVersion: row.engine_version ?? undefined,
      markdown: row.markdown ?? undefined,
      structuredJson: row.structured_json ?? undefined,
      language: row.language ?? undefined,
      pageCount: row.page_count ?? undefined,
      status: row.status,
      errorMessage: row.error_message ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async getExtraction(workspaceId: string, documentId: string): Promise<DocumentExtractionRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      document_id: string;
      schema_version: string;
      engine_version: string | null;
      markdown: string | null;
      structured_json: Record<string, unknown> | null;
      language: string | null;
      page_count: number | null;
      status: 'processing' | 'ready' | 'failed';
      error_message: string | null;
      created_at: Date;
    }>(
      'select * from document_extractions where workspace_id = $1 and document_id = $2 order by created_at desc limit 1',
      [workspaceId, documentId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      documentId: row.document_id,
      schemaVersion: row.schema_version,
      engineVersion: row.engine_version ?? undefined,
      markdown: row.markdown ?? undefined,
      structuredJson: row.structured_json ?? undefined,
      language: row.language ?? undefined,
      pageCount: row.page_count ?? undefined,
      status: row.status,
      errorMessage: row.error_message ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async createReview(input: {
    workspaceId: string;
    documentId: string;
    extractionId: string;
    status: DocumentReviewRecord['status'];
    reviewedJson: Record<string, unknown>;
    reviewedBy: string;
    approvalDigest?: string;
  }): Promise<DocumentReviewRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      document_id: string;
      extraction_id: string;
      status: DocumentReviewRecord['status'];
      reviewed_json: Record<string, unknown>;
      reviewed_by: string;
      approval_digest: string | null;
      created_at: Date;
    }>(
      `insert into document_reviews
        (workspace_id, document_id, extraction_id, status, reviewed_json, reviewed_by, approval_digest)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        input.workspaceId,
        input.documentId,
        input.extractionId,
        input.status,
        JSON.stringify(input.reviewedJson),
        input.reviewedBy,
        input.approvalDigest ?? null,
      ],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      documentId: row.document_id,
      extractionId: row.extraction_id,
      status: row.status,
      reviewedJson: row.reviewed_json,
      reviewedBy: row.reviewed_by,
      approvalDigest: row.approval_digest ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async getLatestReview(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentReviewRecord | undefined> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      document_id: string;
      extraction_id: string;
      status: DocumentReviewRecord['status'];
      reviewed_json: Record<string, unknown>;
      reviewed_by: string;
      approval_digest: string | null;
      created_at: Date;
    }>(
      `select * from document_reviews
        where workspace_id = $1 and document_id = $2
        order by created_at desc, id desc
        limit 1`,
      [workspaceId, documentId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      documentId: row.document_id,
      extractionId: row.extraction_id,
      status: row.status,
      reviewedJson: row.reviewed_json,
      reviewedBy: row.reviewed_by,
      approvalDigest: row.approval_digest ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

}

export class PostgresMatchDecisionRepository implements MatchDecisionRepository {
  constructor(private readonly pool: Pool) {}
  async create(input: Omit<MatchDecisionRecord, 'id' | 'createdAt'>): Promise<MatchDecisionRecord> {
    const result = await this.pool.query<{
      id:string; workspace_id:string; purchase_order_document_id:string; invoice_document_id:string;
      decision:MatchDecisionRecord['decision']; reason:string; decided_by:string; created_at:Date;
    }>(`insert into document_match_decisions
      (workspace_id,purchase_order_document_id,invoice_document_id,decision,reason,decided_by)
      values ($1,$2,$3,$4,$5,$6) returning *`,
      [input.workspaceId,input.purchaseOrderDocumentId,input.invoiceDocumentId,input.decision,input.reason,input.decidedBy]);
    const row=result.rows[0]!;
    return {id:row.id,workspaceId:row.workspace_id,purchaseOrderDocumentId:row.purchase_order_document_id,invoiceDocumentId:row.invoice_document_id,decision:row.decision,reason:row.reason,decidedBy:row.decided_by,createdAt:row.created_at.toISOString()};
  }
  async getLatest(workspaceId:string,purchaseOrderDocumentId:string,invoiceDocumentId:string): Promise<MatchDecisionRecord|undefined> {
    const result=await this.pool.query<{
      id:string; workspace_id:string; purchase_order_document_id:string; invoice_document_id:string;
      decision:MatchDecisionRecord['decision']; reason:string; decided_by:string; created_at:Date;
    }>(`select * from document_match_decisions where workspace_id=$1 and purchase_order_document_id=$2 and invoice_document_id=$3 order by created_at desc,id desc limit 1`,
      [workspaceId,purchaseOrderDocumentId,invoiceDocumentId]);
    const row=result.rows[0]; if(!row) return undefined;
    return {id:row.id,workspaceId:row.workspace_id,purchaseOrderDocumentId:row.purchase_order_document_id,invoiceDocumentId:row.invoice_document_id,decision:row.decision,reason:row.reason,decidedBy:row.decided_by,createdAt:row.created_at.toISOString()};
  }
}

export class PostgresTraceRepository implements TraceRepository {
  constructor(private readonly pool: Pool) {}

  async record(trace: Omit<GatewayTraceRecord, 'id' | 'createdAt'>): Promise<GatewayTraceRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      provider_connection_id: string | null;
      route_id: string | null;
      request_id: string | null;
      detected_language: string | null;
      detected_dialect: string | null;
      input_tokens: number;
      output_tokens: number;
      latency_ms: number;
      status: 'succeeded' | 'failed';
      error_code: string | null;
      safe_metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `insert into gateway_traces
        (workspace_id, provider_connection_id, route_id, request_id, detected_language, detected_dialect, input_tokens, output_tokens, latency_ms, status, error_code, safe_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        trace.workspaceId,
        trace.providerConnectionId ?? null,
        trace.routeId ?? null,
        trace.requestId ?? null,
        trace.detectedLanguage ?? null,
        trace.detectedDialect ?? null,
        trace.inputTokens ?? 0,
        trace.outputTokens ?? 0,
        trace.latencyMs ?? 0,
        trace.status,
        trace.errorCode ?? null,
        { ...(trace.safeMetadata ?? {}), model: trace.model },
      ],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      providerConnectionId: row.provider_connection_id ?? undefined,
      routeId: row.route_id ?? undefined,
      requestId: row.request_id ?? undefined,
      detectedLanguage: row.detected_language ?? undefined,
      detectedDialect: row.detected_dialect ?? undefined,
      model: trace.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      latencyMs: row.latency_ms,
      status: row.status,
      errorCode: row.error_code ?? undefined,
      safeMetadata: row.safe_metadata,
      createdAt: row.created_at.toISOString(),
    };
  }

  async list(workspaceId: string): Promise<GatewayTraceRecord[]> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string;
      provider_connection_id: string | null;
      route_id: string | null;
      request_id: string | null;
      detected_language: string | null;
      detected_dialect: string | null;
      input_tokens: number;
      output_tokens: number;
      latency_ms: number;
      status: 'succeeded' | 'failed';
      error_code: string | null;
      safe_metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      'select * from gateway_traces where workspace_id = $1 order by created_at desc',
      [workspaceId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      providerConnectionId: row.provider_connection_id ?? undefined,
      routeId: row.route_id ?? undefined,
      requestId: row.request_id ?? undefined,
      detectedLanguage: row.detected_language ?? undefined,
      detectedDialect: row.detected_dialect ?? undefined,
      model: (row.safe_metadata?.model as string) || 'default',
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      latencyMs: row.latency_ms,
      status: row.status,
      errorCode: row.error_code ?? undefined,
      safeMetadata: row.safe_metadata,
      createdAt: row.created_at.toISOString(),
    }));
  }
}

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  async record(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<AuditEventRecord> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string | null;
      actor_user_id: string | null;
      actor_type: string;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      request_id: string | null;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `insert into audit_events
        (workspace_id, actor_user_id, actor_type, action, entity_type, entity_id, request_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        event.workspaceId ?? null,
        event.actorUserId ?? null,
        event.actorType,
        event.action,
        event.entityType ?? null,
        event.entityId ?? null,
        event.requestId ?? null,
        event.metadata ?? {},
      ],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      actorUserId: row.actor_user_id ?? undefined,
      actorType: row.actor_type,
      action: row.action,
      entityType: row.entity_type ?? undefined,
      entityId: row.entity_id ?? undefined,
      requestId: row.request_id ?? undefined,
      metadata: row.metadata,
      createdAt: row.created_at.toISOString(),
    };
  }

  async list(workspaceId: string): Promise<AuditEventRecord[]> {
    const result = await this.pool.query<{
      id: string;
      workspace_id: string | null;
      actor_user_id: string | null;
      actor_type: string;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      request_id: string | null;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      'select * from audit_events where workspace_id = $1 order by created_at desc',
      [workspaceId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      actorUserId: row.actor_user_id ?? undefined,
      actorType: row.actor_type,
      action: row.action,
      entityType: row.entity_type ?? undefined,
      entityId: row.entity_id ?? undefined,
      requestId: row.request_id ?? undefined,
      metadata: row.metadata,
      createdAt: row.created_at.toISOString(),
    }));
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
