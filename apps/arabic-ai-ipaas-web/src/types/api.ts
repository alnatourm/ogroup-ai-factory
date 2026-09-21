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

export type SafeProviderConnection = {
  id: string;
  workspaceId: string;
  providerType: ProviderType;
  name: string;
  baseUrl?: string | undefined;
  modelDefault?: string | undefined;
  hasSecret: boolean;
  config: Record<string, unknown>;
  status: 'active' | 'disabled' | 'error';
  createdAt: string;
  updatedAt: string;
};

export type CreateProviderInput = {
  providerType: ProviderType;
  name: string;
  apiKey: string;
  baseUrl?: string | undefined;
  modelDefault?: string | undefined;
  config?: Record<string, unknown> | undefined;
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

export type GatewayChoice = {
  index: number;
  message: { role: 'assistant'; content: string };
  finish_reason: 'stop';
};

export type GatewayUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type GatewayResponse = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: GatewayChoice[];
  usage: GatewayUsage;
};

export type GatewayTrace = {
  id: string;
  timestamp: string;
  workspaceId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: 'success' | 'error';
  arabicProcessed: boolean;
  dialect?: string;
  entitiesMasked: number;
};

/* Data Governance Tiers from Database v0.1 */
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
  updatedAt: string;
};

/* Workflow Types */
export type WorkflowStepType =
  | 'trigger'
  | 'pii_masking'
  | 'condition'
  | 'llm_transform'
  | 'manager_approval'
  | 'notification'
  | 'archive';

export type WorkflowStep = {
  id: string;
  titleAr: string;
  titleEn: string;
  stepType: WorkflowStepType;
  descriptionAr: string;
  descriptionEn: string;
  config: Record<string, unknown>;
  status: 'configured' | 'pending_auth' | 'warning';
};

export type WorkflowDefinition = {
  id: string;
  workspaceId: string;
  nameAr: string;
  nameEn: string;
  promptInstructionAr: string;
  status: 'draft' | 'active' | 'archived';
  steps: WorkflowStep[];
  rawJsonV1: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunStatus = 'success' | 'running' | 'failed' | 'pending';

export type WorkflowStepRun = {
  stepId: string;
  stepName: string;
  stepType: WorkflowStepType;
  status: 'success' | 'failed' | 'running' | 'skipped';
  durationMs: number;
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerType: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
  status: WorkflowRunStatus;
  startedAt: string;
  durationMs: number;
  stepsCount: number;
  completedSteps: number;
  stepRuns: WorkflowStepRun[];
};

/* Document Intelligence Types */
export type ExtractedEntity = {
  field: string;
  labelAr: string;
  labelEn: string;
  value: string;
  confidence: number;
  isPii?: boolean;
};

export type DocumentMetadata = {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  pageCount: number;
  detectedLanguage: string;
  documentType: string;
  classificationConfidence: number;
};

export type DocumentExtractionResult = {
  metadata: DocumentMetadata;
  fullTextAr: string;
  extractedEntities: ExtractedEntity[];
  rawMarkdown: string;
  status: 'processed' | 'processing' | 'failed';
  ocrEngine: string;
  piiMaskedCount: number;
};

/* Usage & Dashboard Types */
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

export type DailyUsagePoint = {
  date: string;
  requests: number;
  tokens: number;
  errors: number;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  region: string;
  dataPolicy: DataPolicyTier;
  createdAt: string;
};


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

export type DocumentContentMetadata = {
  workspaceId: string;
  documentId: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
};

export type DocumentProcessingJob = {
  document: DocumentRecord;
  upload: DocumentContentMetadata;
  extraction: DocumentExtractionRecord;
  workerState: 'configured' | 'not_configured';
  uploadConfigured: boolean;
};
