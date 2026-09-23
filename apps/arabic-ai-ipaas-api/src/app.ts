import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import type { ApiKeyVerifier, BrowserSessionVerifier } from './auth.js';
import { MemoryAuditRepository, type AuditRepository } from './audit-service.js';
import {
  handleDataPolicyUpdate,
  MemoryDataPolicyRepository,
  type DataPolicyRepository,
} from './data-policy.js';
import {
  MemoryDocumentRepository,
  queueDocumentExtraction,
  validateDocumentUpload,
  type DocumentRepository,
} from './document-service.js';
import {
  createApprovalDigest,
  createVerifiedInvoiceExport,
  parseReviewInvoice,
  requireApprovableInvoice,
} from './document-review.js';
import {
  MemoryDocumentContentStore,
  validateDocumentContent,
  type DocumentContentStore,
} from './document-content-store.js';
import { MemoryProviderRepository } from './memory-repository.js';
import {
  GeminiDocumentOcrAdapter,
  type DocumentOcrAdapter,
} from './document-ocr-adapter.js';
import { runDocumentOcr } from './document-ocr-service.js';
import { OpenAICompatibleProviderAdapter, type ProviderAdapter } from './provider-adapter.js';
import type { ProviderRepository } from './postgres.js';
import { decryptSecret, encryptSecret, redactProvider, validateProviderBaseUrl } from './security.js';
import {
  getUsageSummaryForWorkspace,
  MemoryTraceRepository,
  type TraceRepository,
} from './usage-service.js';
import {
  executeWorkflow,
  MemoryWorkflowRepository,
  validateWorkflowDefinition,
  type WorkflowRepository,
} from './workflow-engine.js';
import type {
  DataPolicyConfig,
  GatewayRequest,
  ProviderType,
  RequestContext,
  WorkspaceRole,
} from './types.js';

type FactoryRequest = Request & { factoryContext?: RequestContext };

function setContext(req: Request, context: RequestContext): void {
  (req as FactoryRequest).factoryContext = context;
}

function getContext(req: Request): RequestContext {
  const context = (req as FactoryRequest).factoryContext;
  if (!context) throw new Error('FACTORY_CONTEXT_MISSING');
  return context;
}

function getPathId(req: Request): string {
  const id = req.params.id;
  if (typeof id !== 'string') throw new Error('INVALID_PATH_PARAMETER');
  return id;
}

function encodeContentDispositionFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

const VALID_ROLES = new Set<WorkspaceRole>([
  'workspace_owner',
  'workspace_admin',
  'developer',
  'automation_builder',
  'viewer',
  'partner_admin',
]);

const VALID_PROVIDER_TYPES = new Set<ProviderType>([
  'openai-compatible',
  'gemini',
  'anthropic-compatible',
  'custom-http',
]);

const VALID_WORKFLOW_STATUSES = new Set(['draft', 'active', 'paused', 'archived']);

function buildContextMiddleware(
  apiKeyVerifier: ApiKeyVerifier | undefined,
  browserSessionVerifier: BrowserSessionVerifier | undefined,
  allowInsecureTestHeaders: boolean,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.header('authorization');
    if (auth?.startsWith('Bearer ') && apiKeyVerifier) {
      const verified = await apiKeyVerifier.verify(auth.slice('Bearer '.length).trim());
      if (verified) {
        setContext(req, {
          workspaceId: verified.workspaceId,
          userId: verified.userId,
          role: verified.role,
        });
        next();
        return;
      }
    }

    if (browserSessionVerifier) {
      const verified = await browserSessionVerifier.verify({
        cookieHeader: req.header('cookie'),
        method: req.method,
        origin: req.header('origin'),
      });
      if (verified) {
        setContext(req, {
          workspaceId: verified.workspaceId,
          userId: verified.userId,
          role: verified.role,
        });
        next();
        return;
      }
    }

    if (allowInsecureTestHeaders) {
      const workspaceId = req.header('x-workspace-id');
      const userId = req.header('x-user-id');
      const role = req.header('x-workspace-role') as WorkspaceRole | undefined;
      if (workspaceId && userId && role && VALID_ROLES.has(role)) {
        setContext(req, { workspaceId, userId, role });
        next();
        return;
      }
    }

    res.status(401).json({ error: 'INVALID_AUTHENTICATION' });
  };
}

function requireRoles(roles: WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(getContext(req).role)) {
      res.status(403).json({ error: 'INSUFFICIENT_ROLE' });
      return;
    }
    next();
  };
}

const requireWriteRole = requireRoles(['workspace_owner', 'workspace_admin', 'developer']);
const requireWorkflowWriteRole = requireRoles([
  'workspace_owner',
  'workspace_admin',
  'developer',
  'automation_builder',
]);
const requirePolicyWriteRole = requireRoles(['workspace_owner', 'workspace_admin']);

function dataPolicyUpdates(body: unknown): Partial<DataPolicyConfig> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('INVALID_DATA_POLICY');
  }
  const record = body as Record<string, unknown>;
  const allowed = new Set([
    'dataZone',
    'piiMaskingEnabled',
    'retentionDays',
    'auditLoggingEnabled',
    'strictZdrLevel',
    'dualAdminApprovalRequired',
    'optInConfirmed',
    'rightsBasis',
  ]);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    throw new Error('INVALID_DATA_POLICY_FIELD');
  }
  for (const key of ['piiMaskingEnabled', 'auditLoggingEnabled', 'dualAdminApprovalRequired', 'optInConfirmed']) {
    if (record[key] !== undefined && typeof record[key] !== 'boolean') {
      throw new Error('INVALID_DATA_POLICY');
    }
  }
  for (const key of ['retentionDays', 'strictZdrLevel']) {
    const value = record[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
      throw new Error('INVALID_DATA_POLICY');
    }
  }
  if (record.rightsBasis !== undefined && typeof record.rightsBasis !== 'string') {
    throw new Error('INVALID_DATA_POLICY');
  }
  return record as Partial<DataPolicyConfig>;
}

export function createApp(options: {
  masterKey?: string;
  providerRepository?: ProviderRepository;
  workflowRepository?: WorkflowRepository;
  dataPolicyRepository?: DataPolicyRepository;
  auditRepository?: AuditRepository;
  documentRepository?: DocumentRepository;
  documentContentStore?: DocumentContentStore;
  documentOcrAdapter?: DocumentOcrAdapter;
  traceRepository?: TraceRepository;
  adapter?: ProviderAdapter;
  apiKeyVerifier?: ApiKeyVerifier;
  browserSessionVerifier?: BrowserSessionVerifier;
  publicAuthRouter?: Router;
  allowInsecureTestHeaders?: boolean;
} = {}) {
  const app = express();
  const providerRepository = options.providerRepository ?? new MemoryProviderRepository();
  const workflowRepository = options.workflowRepository ?? new MemoryWorkflowRepository();
  const dataPolicyRepository = options.dataPolicyRepository ?? new MemoryDataPolicyRepository();
  const auditRepository = options.auditRepository ?? new MemoryAuditRepository();
  const documentRepository = options.documentRepository ?? new MemoryDocumentRepository();
  const documentContentStore = options.documentContentStore ?? new MemoryDocumentContentStore();
  const documentOcrAdapter = options.documentOcrAdapter ?? new GeminiDocumentOcrAdapter();
  const traceRepository = options.traceRepository ?? new MemoryTraceRepository();
  const adapter = options.adapter ?? new OpenAICompatibleProviderAdapter();
  const masterKey = options.masterKey ?? process.env.PROVIDER_SECRET_MASTER_KEY;

  if (!masterKey) {
    throw new Error('PROVIDER_SECRET_MASTER_KEY_REQUIRED');
  }

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'arabic-ai-ipaas-control-api', version: '0.4.0' });
  });

  if (options.publicAuthRouter) app.use('/auth', options.publicAuthRouter);

  app.use(
    '/v1',
    buildContextMiddleware(
      options.apiKeyVerifier,
      options.browserSessionVerifier,
      options.allowInsecureTestHeaders === true,
    ),
  );

  app.get('/v1/provider-connections', async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      res.json({ data: (await providerRepository.list(workspaceId)).map(redactProvider) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/provider-connections', requireWriteRole, async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      const { providerType, name, apiKey, baseUrl, modelDefault, config } = req.body as {
        providerType?: ProviderType;
        name?: string;
        apiKey?: string;
        baseUrl?: string;
        modelDefault?: string;
        config?: Record<string, unknown>;
      };

      if (!providerType || !VALID_PROVIDER_TYPES.has(providerType) || !name || !apiKey) {
        res.status(400).json({ error: 'INVALID_PROVIDER_CONNECTION' });
        return;
      }
      if (baseUrl) validateProviderBaseUrl(baseUrl);

      const provider = await providerRepository.create({
        workspaceId,
        providerType,
        name,
        ...(baseUrl ? { baseUrl } : {}),
        ...(modelDefault ? { modelDefault } : {}),
        secretCiphertext: encryptSecret(apiKey, masterKey),
        ...(config ? { config } : {}),
      });

      res.status(201).json({ data: redactProvider(provider) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/v1/provider-connections/:id', requireWriteRole, async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      const providerId = req.params.id;
      if (typeof providerId !== 'string' || !(await providerRepository.remove(workspaceId, providerId))) {
        res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/workflows', async (req, res, next) => {
    try {
      res.json({ data: await workflowRepository.list(getContext(req).workspaceId) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/workflows', requireWorkflowWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const { name, description, definition } = req.body as {
        name?: string;
        description?: string;
        definition?: unknown;
      };
      if (!name?.trim()) {
        res.status(400).json({ error: 'WORKFLOW_NAME_REQUIRED' });
        return;
      }
      const workflow = await workflowRepository.create({
        workspaceId: context.workspaceId,
        name: name.trim(),
        ...(typeof description === 'string' ? { description } : {}),
        definition: validateWorkflowDefinition(definition),
        createdBy: context.userId,
      });
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'workflow.created',
        entityType: 'workflow',
        entityId: workflow.id,
        metadata: { version: workflow.version },
      });
      res.status(201).json({ data: workflow });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/workflows/:id', async (req, res, next) => {
    try {
      const workflow = await workflowRepository.get(getContext(req).workspaceId, req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'WORKFLOW_NOT_FOUND' });
        return;
      }
      res.json({ data: workflow });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/v1/workflows/:id', requireWorkflowWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const body = req.body as Record<string, unknown>;
      const allowed = new Set(['name', 'description', 'definition', 'status']);
      if (!body || Object.keys(body).some((key) => !allowed.has(key))) {
        res.status(400).json({ error: 'INVALID_WORKFLOW_UPDATE' });
        return;
      }
      if (body.status !== undefined && (typeof body.status !== 'string' || !VALID_WORKFLOW_STATUSES.has(body.status))) {
        res.status(400).json({ error: 'INVALID_WORKFLOW_STATUS' });
        return;
      }
      const workflow = await workflowRepository.update(context.workspaceId, getPathId(req), {
        ...(typeof body.name === 'string' && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.description === 'string' ? { description: body.description } : {}),
        ...(body.definition !== undefined ? { definition: validateWorkflowDefinition(body.definition) } : {}),
        ...(typeof body.status === 'string' ? { status: body.status as 'draft' | 'active' | 'paused' | 'archived' } : {}),
      });
      if (!workflow) {
        res.status(404).json({ error: 'WORKFLOW_NOT_FOUND' });
        return;
      }
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'workflow.updated',
        entityType: 'workflow',
        entityId: workflow.id,
        metadata: { version: workflow.version, status: workflow.status },
      });
      res.json({ data: workflow });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/workflows/:id/runs', requireWorkflowWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const workflow = await workflowRepository.get(context.workspaceId, getPathId(req));
      if (!workflow) {
        res.status(404).json({ error: 'WORKFLOW_NOT_FOUND' });
        return;
      }
      if (workflow.status !== 'active') {
        res.status(409).json({ error: 'WORKFLOW_NOT_ACTIVE' });
        return;
      }
      const input = req.body?.input;
      if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) {
        res.status(400).json({ error: 'INVALID_WORKFLOW_INPUT' });
        return;
      }
      const run = await executeWorkflow(
        workflow,
        'manual',
        (input ?? {}) as Record<string, unknown>,
        workflowRepository,
      );
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'workflow.executed',
        entityType: 'workflow_run',
        entityId: run.id,
        metadata: { workflowId: workflow.id, status: run.status },
      });
      res.status(201).json({ data: run });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/workflow-runs', async (req, res, next) => {
    try {
      const workflowId = typeof req.query.workflowId === 'string' ? req.query.workflowId : undefined;
      res.json({ data: await workflowRepository.listRuns(getContext(req).workspaceId, workflowId) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/workflow-runs/:id', async (req, res, next) => {
    try {
      const run = await workflowRepository.getRun(getContext(req).workspaceId, req.params.id);
      if (!run) {
        res.status(404).json({ error: 'WORKFLOW_RUN_NOT_FOUND' });
        return;
      }
      res.json({ data: run });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/data-policy', async (req, res, next) => {
    try {
      res.json({ data: await dataPolicyRepository.get(getContext(req).workspaceId) });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/v1/data-policy', requirePolicyWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const policy = await handleDataPolicyUpdate(
        context.workspaceId,
        dataPolicyUpdates(req.body),
        context.userId,
        dataPolicyRepository,
        auditRepository,
      );
      res.json({ data: policy });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/documents', async (req, res, next) => {
    try {
      res.json({ data: await documentRepository.list(getContext(req).workspaceId) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/documents', requireWorkflowWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const { filename, mediaType, sizeBytes } = req.body as Record<string, unknown>;
      const metadata = validateDocumentUpload(filename, mediaType, sizeBytes);
      const document = await documentRepository.create({
        workspaceId: context.workspaceId,
        createdBy: context.userId,
        ...metadata,
      });
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'document.registered',
        entityType: 'document',
        entityId: document.id,
        metadata: { mediaType: document.mediaType, sizeBytes: document.sizeBytes },
      });
      res.status(201).json({ data: document, uploadConfigured: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/documents/:id', async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      const document = await documentRepository.get(workspaceId, req.params.id);
      if (!document) {
        res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
        return;
      }
      const extraction = await documentRepository.getExtraction(workspaceId, document.id);
      const review = await documentRepository.getLatestReview(workspaceId, document.id);
      res.json({ data: { document, extraction: extraction ?? null, review: review ?? null } });
    } catch (error) {
      next(error);
    }
  });

  app.put('/v1/documents/:id/review', requireWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const documentId = getPathId(req);
      const document = await documentRepository.get(context.workspaceId, documentId);
      if (!document) {
        res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
        return;
      }
      const extraction = await documentRepository.getExtraction(context.workspaceId, documentId);
      if (!extraction || extraction.status !== 'ready') {
        res.status(409).json({ error: 'DOCUMENT_EXTRACTION_NOT_READY' });
        return;
      }
      const invoice = parseReviewInvoice(req.body?.invoice);
      const review = await documentRepository.createReview({
        workspaceId: context.workspaceId,
        documentId,
        extractionId: extraction.id,
        status: 'draft',
        reviewedJson: invoice as unknown as Record<string, unknown>,
        reviewedBy: context.userId,
      });
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'document.review_saved',
        entityType: 'document_review',
        entityId: review.id,
        metadata: {
          documentId,
          extractionId: extraction.id,
          status: review.status,
          validationWarningCount: invoice.validationWarnings.length,
        },
      });
      res.json({ data: review });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/documents/:id/approve', requireWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const documentId = getPathId(req);
      const document = await documentRepository.get(context.workspaceId, documentId);
      if (!document) {
        res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
        return;
      }
      const extraction = await documentRepository.getExtraction(context.workspaceId, documentId);
      if (!extraction || extraction.status !== 'ready') {
        res.status(409).json({ error: 'DOCUMENT_EXTRACTION_NOT_READY' });
        return;
      }
      const latestReview = await documentRepository.getLatestReview(context.workspaceId, documentId);
      const structured = extraction.structuredJson;
      const extractedInvoice = structured?.schemaVersion === 'document-extraction-json-v2' &&
        structured.documentType === 'invoice'
        ? structured.invoice
        : undefined;
      const invoice = parseReviewInvoice(req.body?.invoice ?? latestReview?.reviewedJson ?? extractedInvoice);
      requireApprovableInvoice(invoice);
      const approvalDigest = createApprovalDigest({
        documentId,
        extractionId: extraction.id,
        invoice,
      });
      const review = await documentRepository.createReview({
        workspaceId: context.workspaceId,
        documentId,
        extractionId: extraction.id,
        status: 'approved',
        reviewedJson: invoice as unknown as Record<string, unknown>,
        reviewedBy: context.userId,
        approvalDigest,
      });
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'document.review_approved',
        entityType: 'document_review',
        entityId: review.id,
        metadata: {
          documentId,
          extractionId: extraction.id,
          approvalDigest,
        },
      });
      res.json({ data: review });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/documents/:id/verified-json', async (req, res, next) => {
    try {
      const context = getContext(req);
      const documentId = getPathId(req);
      const document = await documentRepository.get(context.workspaceId, documentId);
      if (!document) {
        res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
        return;
      }
      const review = await documentRepository.getLatestReview(context.workspaceId, documentId);
      if (!review || review.status !== 'approved') {
        res.status(409).json({ error: 'DOCUMENT_REVIEW_NOT_APPROVED' });
        return;
      }
      const verified = createVerifiedInvoiceExport(document, review);
      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'document.verified_json_exported',
        entityType: 'document_review',
        entityId: review.id,
        metadata: {
          documentId,
          extractionId: review.extractionId,
          approvalDigest: review.approvalDigest,
        },
      });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="verified-invoice.json"; filename*=UTF-8''${encodeContentDispositionFilename(`${document.filename}.verified.json`)}`,
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(JSON.stringify(verified, null, 2));
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/documents/:id/content', async (req, res, next) => {
    try {
      const context = getContext(req);
      const documentId = getPathId(req);
      const document = await documentRepository.get(context.workspaceId, documentId);
      if (!document) {
        res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
        return;
      }
      const stored = await documentContentStore.get(context.workspaceId, documentId);
      if (!stored) {
        res.status(409).json({ error: 'DOCUMENT_CONTENT_NOT_FOUND' });
        return;
      }

      await auditRepository.record({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        actorType: 'user',
        action: 'document.content_downloaded',
        entityType: 'document',
        entityId: documentId,
        metadata: {
          mediaType: stored.metadata.mediaType,
          sizeBytes: stored.metadata.sizeBytes,
          sha256: stored.metadata.sha256,
        },
      });

      res.setHeader('Content-Type', stored.metadata.mediaType);
      res.setHeader('Content-Length', String(stored.content.length));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="document"; filename*=UTF-8''${encodeContentDispositionFilename(document.filename)}`,
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).send(stored.content);
    } catch (error) {
      next(error);
    }
  });

  app.put(
    '/v1/documents/:id/content',
    requireWorkflowWriteRole,
    express.raw({ type: () => true, limit: '25mb' }),
    async (req, res, next) => {
      try {
        const context = getContext(req);
        const documentId = getPathId(req);
        const document = await documentRepository.get(context.workspaceId, documentId);
        if (!document) {
          res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
          return;
        }
        const mediaType = (req.header('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase() ?? '';
        const validated = validateDocumentContent(document, mediaType, req.body);
        const stored = await documentContentStore.put({
          workspaceId: context.workspaceId,
          documentId,
          mediaType,
          content: validated.content,
        });
        await auditRepository.record({
          workspaceId: context.workspaceId,
          actorUserId: context.userId,
          actorType: 'user',
          action: 'document.content_uploaded',
          entityType: 'document',
          entityId: documentId,
          metadata: {
            mediaType: stored.mediaType,
            sizeBytes: stored.sizeBytes,
            sha256: stored.sha256,
          },
        });
        res.status(201).json({ data: stored, uploadConfigured: true });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post('/v1/documents/:id/extractions', requireWorkflowWriteRole, async (req, res, next) => {
    try {
      const context = getContext(req);
      const documentId = getPathId(req);
      if (!(await documentRepository.get(context.workspaceId, documentId))) {
        res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
        return;
      }
      if (!(await documentContentStore.has(context.workspaceId, documentId))) {
        res.status(409).json({ error: 'DOCUMENT_CONTENT_REQUIRED' });
        return;
      }
      const providers = (await providerRepository.list(context.workspaceId))
        .filter((provider) => provider.status === 'active');
      const provider = providers.find((candidate) => documentOcrAdapter.supports(candidate));
      if (!provider) {
        const queued = await queueDocumentExtraction(
          context.workspaceId,
          documentId,
          documentRepository,
        );
        await auditRepository.record({
          workspaceId: context.workspaceId,
          actorUserId: context.userId,
          actorType: 'user',
          action: 'document.extraction_requested',
          entityType: 'document',
          entityId: documentId,
          metadata: { workerConfigured: false },
        });
        res.status(202).json({ data: queued, workerState: 'not_configured' });
        return;
      }

      try {
        const completed = await runDocumentOcr({
          workspaceId: context.workspaceId,
          documentId,
          documentRepository,
          contentStore: documentContentStore,
          provider,
          secret: decryptSecret(provider.secretCiphertext, masterKey),
          adapter: documentOcrAdapter,
        });
        await auditRepository.record({
          workspaceId: context.workspaceId,
          actorUserId: context.userId,
          actorType: 'user',
          action: 'document.extraction_completed',
          entityType: 'document',
          entityId: documentId,
          metadata: {
            workerConfigured: true,
            providerConnectionId: provider.id,
            engineVersion: completed.extraction.engineVersion,
            language: completed.extraction.language,
            pageCount: completed.extraction.pageCount,
          },
        });
        res.status(200).json({ data: completed, workerState: 'configured' });
      } catch (error) {
        const errorCode = error instanceof Error
          ? (error.message.split(':')[0] ?? 'OCR_PROCESSING_FAILED')
          : 'OCR_PROCESSING_FAILED';
        await auditRepository.record({
          workspaceId: context.workspaceId,
          actorUserId: context.userId,
          actorType: 'user',
          action: 'document.extraction_failed',
          entityType: 'document',
          entityId: documentId,
          metadata: {
            workerConfigured: true,
            providerConnectionId: provider.id,
            errorCode,
          },
        });
        next(error);
      }
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/usage/summary', async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      res.json({
        data: await getUsageSummaryForWorkspace(
          workspaceId,
          traceRepository,
          workflowRepository,
          documentRepository,
          providerRepository,
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/chat/completions', async (req, res, next) => {
    const startedAt = Date.now();
    try {
      const workspaceId = getContext(req).workspaceId;
      const providers = (await providerRepository.list(workspaceId)).filter((item) => item.status === 'active');
      const provider = providers[0];
      if (!provider) {
        res.status(409).json({ error: 'NO_ACTIVE_PROVIDER_CONNECTION' });
        return;
      }
      if (provider.providerType !== 'openai-compatible') {
        res.status(501).json({ error: 'PROVIDER_ADAPTER_NOT_IMPLEMENTED', providerType: provider.providerType });
        return;
      }

      const input = req.body as GatewayRequest;
      if (!Array.isArray(input.messages) || input.messages.length === 0) {
        res.status(400).json({ error: 'MESSAGES_REQUIRED' });
        return;
      }

      const secret = decryptSecret(provider.secretCiphertext, masterKey);
      try {
        const completion = await adapter.complete(input, provider, secret);
        await traceRepository.record({
          workspaceId,
          providerConnectionId: provider.id,
          model: completion.model,
          inputTokens: completion.promptTokens,
          outputTokens: completion.completionTokens,
          latencyMs: Date.now() - startedAt,
          status: 'succeeded',
          safeMetadata: { model: completion.model },
        });
        res.json({
          id: `chatcmpl_${crypto.randomUUID()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: completion.model,
          choices: [{ index: 0, message: { role: 'assistant', content: completion.content }, finish_reason: 'stop' }],
          usage: {
            prompt_tokens: completion.promptTokens,
            completion_tokens: completion.completionTokens,
            total_tokens: completion.promptTokens + completion.completionTokens,
          },
        });
      } catch {
        await traceRepository.record({
          workspaceId,
          providerConnectionId: provider.id,
          model: input.model ?? provider.modelDefault ?? 'unknown',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startedAt,
          status: 'failed',
          errorCode: 'PROVIDER_REQUEST_FAILED',
          safeMetadata: { model: input.model ?? provider.modelDefault ?? 'unknown' },
        });
        res.status(502).json({ error: 'PROVIDER_REQUEST_FAILED' });
      }
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const code = message.split(':')[0] ?? 'UNKNOWN_ERROR';
    const badRequestCodes = new Set([
      'INVALID_WORKFLOW_DEFINITION',
      'INVALID_WORKFLOW_VERSION',
      'INVALID_DATA_ZONE',
      'INVALID_DATA_POLICY',
      'INVALID_DATA_POLICY_FIELD',
      'INVALID_FILENAME',
      'UNSUPPORTED_MEDIA_TYPE',
      'INVALID_FILE_SIZE',
      'FILE_TOO_LARGE',
      'INVALID_PROVIDER_BASE_URL',
      'PROVIDER_BASE_URL_MUST_USE_HTTPS',
      'PROVIDER_BASE_URL_NOT_ALLOWED',
      'DOCUMENT_MEDIA_TYPE_MISMATCH',
      'DOCUMENT_SIZE_MISMATCH',
      'DOCUMENT_SIGNATURE_MISMATCH',
      'INVALID_DOCUMENT_CONTENT',
      'INVALID_INVOICE_REVIEW',
    ]);
    if (badRequestCodes.has(code)) {
      res.status(400).json({ error: code });
      return;
    }
    if (code === 'OCR_DOCUMENT_TOO_LARGE_FOR_INLINE') {
      res.status(413).json({ error: code });
      return;
    }
    if (
      code === 'OCR_MODEL_NOT_CONFIGURED' ||
      code === 'INVALID_OCR_MODEL' ||
      code === 'OCR_PROVIDER_NOT_ENABLED' ||
      code === 'DOCUMENT_CONTENT_INTEGRITY_FAILED'
    ) {
      res.status(409).json({ error: code });
      return;
    }
    if (
      code === 'OCR_PROVIDER_HTTP_429' ||
      code === 'OCR_PROVIDER_DAILY_QUOTA_EXHAUSTED'
    ) {
      res.status(429).json({ error: code });
      return;
    }
    if (code === 'OCR_PROVIDER_INVALID_RESPONSE' || code.startsWith('OCR_PROVIDER_HTTP_')) {
      res.status(502).json({ error: code });
      return;
    }
    if ((error as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ error: 'FILE_TOO_LARGE' });
      return;
    }
    if (
      code === 'EXPLICIT_OPT_IN_REQUIRED' ||
      code === 'DOCUMENT_CONTENT_REQUIRED' ||
      code === 'DOCUMENT_EXTRACTION_NOT_READY' ||
      code === 'INVOICE_REVIEW_VALIDATION_REQUIRED' ||
      code === 'DOCUMENT_REVIEW_NOT_APPROVED'
    ) {
      res.status(409).json({ error: code });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });

  return app;
}
