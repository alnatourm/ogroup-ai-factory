export type WorkspaceRole =
  | 'workspace_owner'
  | 'workspace_admin'
  | 'developer'
  | 'automation_builder'
  | 'viewer'
  | 'partner_admin';

export type RequestContext = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export type ProviderType = 'openai-compatible' | 'gemini' | 'anthropic-compatible' | 'custom-http';

export type ProviderConnection = {
  id: string;
  workspaceId: string;
  providerType: ProviderType;
  name: string;
  baseUrl?: string;
  modelDefault?: string;
  secretCiphertext: string;
  config: Record<string, unknown>;
  status: 'active' | 'disabled' | 'error';
  createdAt: string;
  updatedAt: string;
};

export type SafeProviderConnection = Omit<ProviderConnection, 'secretCiphertext'> & {
  hasSecret: boolean;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type GatewayRequest = {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  stream?: boolean;
};

export type GatewayResponse = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: 'stop';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/* Data Governance */
export type DataPolicyTier = 'PRIVATE' | 'ANONYMOUS_TELEMETRY' | 'IMPROVEMENT_OPT_IN';

export type DataPolicyConfig = {
  workspaceId: string;
  dataZone: DataPolicyTier;
  piiMaskingEnabled: boolean;
  retentionDays: number;
  auditLoggingEnabled: boolean;
  strictZdrLevel: number;
  dualAdminApprovalRequired: boolean;
  optInConfirmed: boolean;
  rightsBasis?: string;
  updatedAt: string;
};

/* Workflows */
export type WorkflowStepType =
  | 'trigger'
  | 'pii_masking'
  | 'condition'
  | 'llm_transform'
  | 'manager_approval'
  | 'notification'
  | 'archive'
  | 'transform'
  | 'http.request'
  | 'ai.extract';

export type WorkflowStepDefinition = {
  id: string;
  titleAr?: string;
  titleEn?: string;
  type: string;
  stepType?: WorkflowStepType;
  descriptionAr?: string;
  descriptionEn?: string;
  config?: Record<string, unknown>;
};

export type WorkflowJsonV1 = {
  version: number | string;
  name?: string;
  trigger?: {
    type: string;
    schema?: string;
    config?: Record<string, unknown>;
  };
  condition?: Record<string, unknown>;
  action?: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps?: WorkflowStepDefinition[];
};

export type WorkflowRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  schemaVersion: string;
  definition: WorkflowJsonV1;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStepRunRecord = {
  id: string;
  workspaceId: string;
  workflowRunId: string;
  stepKey: string;
  stepType: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
};

export type WorkflowRunRecord = {
  id: string;
  workspaceId: string;
  workflowId: string;
  triggerType: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  stepRuns: WorkflowStepRunRecord[];
};

/* Document Intelligence */
export type AcceptedMediaType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/tiff';

export type DocumentRecord = {
  id: string;
  workspaceId: string;
  filename: string;
  mediaType: string;
  objectKey: string;
  sizeBytes: number;
  sha256?: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleted';
  createdBy?: string;
  createdAt: string;
};

export type DocumentExtractionRecord = {
  id: string;
  workspaceId: string;
  documentId: string;
  schemaVersion: string;
  engineVersion?: string;
  markdown?: string;
  structuredJson?: Record<string, unknown>;
  language?: string;
  pageCount?: number;
  status: 'processing' | 'ready' | 'failed';
  errorMessage?: string;
  createdAt: string;
};

export type DocumentReviewRecord = {
  id: string;
  workspaceId: string;
  documentId: string;
  extractionId: string;
  status: 'draft' | 'approved';
  reviewedJson: Record<string, unknown>;
  reviewedBy: string;
  approvalDigest?: string;
  createdAt: string;
};

/* Gateway Traces & Observability */
export type GatewayTraceRecord = {
  id: string;
  workspaceId: string;
  providerConnectionId?: string;
  routeId?: string;
  requestId?: string;
  detectedLanguage?: string;
  detectedDialect?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'succeeded' | 'failed';
  errorCode?: string;
  safeMetadata: Record<string, unknown>;
  createdAt: string;
};

export type UsageSummary = {
  totalRequests: number;
  totalTokens: number;
  activeWorkflows: number;
  processedDocuments: number;
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
};

export type ProviderMetric = {
  providerId: string;
  providerName: string;
  model: string;
  status: 'active' | 'degraded' | 'maintenance';
  requestCount: number;
  successRate: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  tokenCount: number;
};

export type UsageSummaryResponse = {
  summary: UsageSummary;
  providers: ProviderMetric[];
};

/* Audit Events */
export type AuditEventRecord = {
  id: string;
  workspaceId?: string;
  actorUserId?: string;
  actorType: string;
  action: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
