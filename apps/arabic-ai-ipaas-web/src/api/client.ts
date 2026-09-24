import {
  type CreateProviderInput,
  type DataPolicyConfig,
  type DocumentProcessingJob,
  type DocumentRecord,
  type DocumentDetail,
  type DocumentReviewRecord,
  type StructuredInvoice,
  type GatewayRequest,
  type GatewayResponse,
  type SafeProviderConnection,
  type UsageSummary,
  type ProviderMetric,
  type WorkflowDefinition,
  type WorkflowRun,
  type WorkflowStepRun,
} from '../types/api.js';
import { getApiConfig } from './config.js';

export const AUTHENTICATION_REQUIRED_EVENT = 'ogroup:authentication-required';

/* =========================================================================
 * NON-PRODUCTION PLACEHOLDER SEED DATA
 * Used when backend endpoints are either unreachable or not yet implemented
 * ========================================================================= */

let mockProviders: SafeProviderConnection[] = [
  {
    id: 'conn_azure_openai_01',
    workspaceId: 'workspace-a',
    providerType: 'openai-compatible',
    name: 'بوابة Azure OpenAI السيادية (KSA)',
    baseUrl: 'https://wasl-sovereign-azure.openai.azure.com/v1',
    modelDefault: 'gpt-4o',
    hasSecret: true,
    config: { region: 'ksa-central', hsmTier: 'FIPS-140-3' },
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'conn_vertex_gemini_02',
    workspaceId: 'workspace-a',
    providerType: 'gemini',
    name: 'Google Cloud Vertex AI / Gemini Enterprise',
    baseUrl: 'https://me-central2-aiplatform.googleapis.com/v1',
    modelDefault: 'gemini-1.5-pro',
    hasSecret: true,
    config: { zone: 'dammam', sovereignCompliance: 'NDMO-L4' },
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'conn_anthropic_03',
    workspaceId: 'workspace-a',
    providerType: 'anthropic-compatible',
    name: 'Anthropic Claude 3.5 Sonnet Enterprise Gateway',
    baseUrl: 'https://api.anthropic-sovereign.local/v1',
    modelDefault: 'claude-3-5-sonnet',
    hasSecret: true,
    config: { maxTokens: 8192 },
    status: 'disabled',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];


/* Helper to build request headers */
function buildHeaders(config = getApiConfig()): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else if (config.allowDevIdentityHeaders) {
    if (!config.workspaceId || !config.userId) {
      throw new Error('Development identity headers require VITE_WORKSPACE_ID and VITE_USER_ID.');
    }
    headers['x-workspace-id'] = config.workspaceId;
    headers['x-user-id'] = config.userId;
    headers['x-workspace-role'] = config.role;
  }

  return headers;
}

function buildBinaryHeaders(mediaType: string, config = getApiConfig()): Record<string, string> {
  const headers = buildHeaders(config);
  headers['Content-Type'] = mediaType;
  return headers;
}

async function throwResponseError(response: Response, fallbackCode: string): Promise<never> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTHENTICATION_REQUIRED_EVENT));
    }
    throw new Error('AUTHENTICATION_REQUIRED');
  }
  throw new Error(body.error || fallbackCode);
}

function requireMockFallback(): void {
  if (!getApiConfig().useMockFallback) {
    throw new Error('Backend capability is unavailable and mock fallback is disabled.');
  }
}

export class ArabicAiIpaasClient {
  static async getAuthStatus(): Promise<{
    configured: boolean;
    authenticated: boolean;
    session?: {
      workspaceId: string;
      userId: string;
      role: 'workspace_owner' | 'workspace_admin' | 'developer' | 'automation_builder' | 'viewer' | 'partner_admin';
    };
  }> {
    const config = getApiConfig();
    const response = await fetch(`${config.baseUrl}/auth/status`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error('Authentication status is unavailable.');
    return await response.json();
  }

  /**
   * Check control API health
   * Live backend endpoint: GET /health
   */
  static async getHealth(): Promise<{ status: string; service: string; version: string }> {
    const config = getApiConfig();
    try {
      const response = await fetch(`${config.baseUrl}/health`, {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fall through to explicit mock gate.
    }
    requireMockFallback();
    return { status: 'mock', service: 'arabic-ai-ipaas-control-api', version: '0.2.0-demo' };
  }

  /**
   * List provider connections
   * Live backend endpoint: GET /v1/provider-connections
   */
  static async listProviderConnections(): Promise<SafeProviderConnection[]> {
    const config = getApiConfig();
    try {
      const response = await fetch(`${config.baseUrl}/v1/provider-connections`, {
        headers: buildHeaders(config),
      });
      if (response.ok) {
        const body = (await response.json()) as { data: SafeProviderConnection[] };
        return body.data;
      }
    } catch {
      // Fall through to explicit mock gate.
    }
    requireMockFallback();
    return [...mockProviders];
  }

  /**
   * Create provider connection
   * Live backend endpoint: POST /v1/provider-connections
   * STRICT SECURITY: Secrets are sent securely over HTTPS and never echoed back in plaintext.
   */
  static async createProviderConnection(input: CreateProviderInput): Promise<SafeProviderConnection> {
    const config = getApiConfig();
    try {
      const response = await fetch(`${config.baseUrl}/v1/provider-connections`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(input),
      });
      if (response.ok) {
        const body = (await response.json()) as { data: SafeProviderConnection };
        return body.data;
      }
    } catch {
      // Fall through to explicit mock gate.
    }

    requireMockFallback();
    // In-memory demo fallback: redact secret completely
    const newProvider: SafeProviderConnection = {
      id: `conn_${Date.now()}`,
      workspaceId: config.workspaceId,
      providerType: input.providerType,
      name: input.name,
      baseUrl: input.baseUrl,
      modelDefault: input.modelDefault,
      hasSecret: true,
      config: input.config || {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockProviders = [newProvider, ...mockProviders];
    return newProvider;
  }

  /**
   * Delete provider connection
   * Live backend endpoint: DELETE /v1/provider-connections/:id
   */
  static async deleteProviderConnection(providerId: string): Promise<boolean> {
    const config = getApiConfig();
    try {
      const response = await fetch(`${config.baseUrl}/v1/provider-connections/${encodeURIComponent(providerId)}`, {
        method: 'DELETE',
        headers: buildHeaders(config),
      });
      if (response.ok || response.status === 204) {
        mockProviders = mockProviders.filter((p) => p.id !== providerId);
        return true;
      }
    } catch {
      // Fall through to explicit mock gate.
    }
    requireMockFallback();
    mockProviders = mockProviders.filter((p) => p.id !== providerId);
    return true;
  }

  /**
   * Arabic AI Gateway Chat Completion
   * Live backend endpoint: POST /v1/chat/completions
   * Open-AI compatible payload & response shape
   */
  static async createChatCompletion(request: GatewayRequest): Promise<GatewayResponse> {
    const config = getApiConfig();
    try {
      const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(request),
      });
      if (response.ok) {
        return (await response.json()) as GatewayResponse;
      }
    } catch {
      // Fall through to explicit mock gate.
    }

    requireMockFallback();
    // Simulated OpenAI-compatible demo response for Arabic Gateway Playground
    const userMessage = [...request.messages].reverse().find((m) => m.role === 'user')?.content || 'مرحباً';
    const completionText = `تمت معالجة الطلب بنجاح عبر بوابة «وصل» للذكاء الاصطناعي السيادي.\n\n` +
      `تحليل الاستعلام العربي:\n` +
      `• تم التحقق من النص والحفاظ على سياق الأعمال باللغة العربية.\n` +
      `• وضع العرض التجريبي: لا توجد مطالبة امتثال أو معالجة فعلية للبيانات الحساسة في هذه الاستجابة.\n` +
      `• الملخص التنفيذي للاستعلام: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? '...' : ''}"\n\n` +
      `هذه استجابة تجريبية محلية ولا تمثل إثباتاً على التخزين أو عدم التخزين لدى أي مزود.`;

    const promptTokens = Math.max(12, Math.floor(userMessage.length / 2.5));
    const completionTokens = Math.max(25, Math.floor(completionText.length / 2.8));

    return {
      id: `chatcmpl_wasl_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model || 'gpt-4o',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: completionText,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  /* =========================================================================
   * NON-PRODUCTION PLACEHOLDER API METHODS
   * Clearly marked: backend capabilities for workflows, documents, analytics,
   * and policy updates are currently pending backend v0.2 implementation.
   * ========================================================================= */

  /**
   * [NON-PRODUCTION PLACEHOLDER]
   * Compile Arabic natural language workflow instruction into structured steps.
   */
  static async compileWorkflowPrompt(instructionAr: string): Promise<WorkflowDefinition> {
    requireMockFallback();
    // Artificial slight delay to give realistic compiler feedback
    await new Promise((resolve) => setTimeout(resolve, 350));

    const isHighAmount = instructionAr.includes('10000') || instructionAr.includes('500000') || instructionAr.includes('ريال');

    const steps = [
      {
        id: 'step_trigger_01',
        titleAr: 'مشغّل المسار: استقبال المعاملة / عرض السعر',
        titleEn: 'Trigger: Receive Quote / Transaction',
        stepType: 'trigger' as const,
        descriptionAr: 'استقبال حدث ويبهوك مشفر من منصة اعتماد أو نظام إدارة المشتريات المؤسسي',
        descriptionEn: 'Receive encrypted inbound webhook from procurement or ERP system',
        config: { protocol: 'HTTPS Webhook', auth: 'Mutual TLS' },
        status: 'configured' as const,
      },
      {
        id: 'step_pii_02',
        titleAr: 'حجب الكيانات الحساسة وفحص الخصوصية',
        titleEn: 'Entity Masking & Privacy Check',
        stepType: 'pii_masking' as const,
        descriptionAr: 'حجب الهويات الوطنية، الحسابات المصرفية، والأرقام السرية وفق ضوابط NDMO',
        descriptionEn: 'Mask national IDs, IBANs, and PII in accordance with NDMO guidelines',
        config: { policy: 'NDMO-L4', maskFormat: '[محجوب-سيادي]' },
        status: 'configured' as const,
      },
      {
        id: 'step_cond_03',
        titleAr: isHighAmount ? 'شرط القيمة المالية (> 10,000 ريال سعودي)' : 'التحقق من صحة واكتمال المستند',
        titleEn: isHighAmount ? 'Condition: Amount > 10,000 SAR' : 'Condition: Document Completeness',
        stepType: 'condition' as const,
        descriptionAr: isHighAmount
          ? 'المسار يتفرع لطلب موافقة الإدارة المالية والامتثال نظراً لتجاوز الحد المعتمد'
          : 'التأكد من توقيع المورد وصلاحية السجل التجاري قبل المتابعة',
        descriptionEn: isHighAmount
          ? 'Branch path to request finance approval because amount exceeds threshold'
          : 'Verify supplier signature and commercial registration before continuing',
        config: { operator: '>', threshold: 10000, currency: 'SAR' },
        status: 'configured' as const,
      },
      {
        id: 'step_approval_04',
        titleAr: 'طلب موافقة المدير المالي المعتمد',
        titleEn: 'Action: Request Manager Approval',
        stepType: 'manager_approval' as const,
        descriptionAr: 'إرسال إشعار تفاعلي عبر تطبيق المراسلة المؤسسي / البريد المشفر مع زر الموافقة',
        descriptionEn: 'Dispatch approval request via enterprise Teams / Email with audit token',
        config: { channel: 'Teams/Email', timeoutHours: 24 },
        status: 'configured' as const,
      },
      {
        id: 'step_archive_05',
        titleAr: 'أرشفة العقد في المخزن السيادي وتحديث لوحة المتابعة',
        titleEn: 'Action: Archive in Sovereign Vault',
        stepType: 'archive' as const,
        descriptionAr: 'حفظ مستند العقد والتقارير في مخزن البيانات المحلي المشفر بنظام WORM',
        descriptionEn: 'Persist contract report in encrypted sovereign storage and audit log',
        config: { storageClass: 'Sovereign-S3-Immutable', retentionYears: 10 },
        status: 'configured' as const,
      },
    ];

    return {
      id: `wf_${Date.now()}`,
      workspaceId: getApiConfig().workspaceId,
      nameAr: 'مسار معالجة عروض الأسعار والتحقق المالي السيادي',
      nameEn: 'Automated Sovereign Quote Processing Workflow',
      promptInstructionAr: instructionAr,
      status: 'draft',
      steps,
      rawJsonV1: {
        version: 'workflow-json-v1',
        trigger: { type: 'webhook.inbound', schema: 'quote_received' },
        condition: { field: 'quote.amount', operator: '>', value: 10000, currency: 'SAR' },
        action: { type: 'request_manager_approval', approverRole: 'financial_director' },
        output: { archive: true, vault: 'sovereign-vault-ksa' },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * List workflow run histories from the authenticated workspace API.
   */
  static async listWorkflowRuns(): Promise<WorkflowRun[]> {
    const config = getApiConfig();
    const response = await fetch(`${config.baseUrl}/v1/workflow-runs`, {
      headers: buildHeaders(config),
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`WORKFLOW_RUNS_LOAD_FAILED_${response.status}`);
    }

    type ApiStepRun = {
      id: string;
      stepKey: string;
      stepType: string;
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
      durationMs: number;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      errorMessage?: string;
    };
    type ApiWorkflowRun = {
      id: string;
      workflowId: string;
      triggerType: WorkflowRun['triggerType'];
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      durationMs: number;
      startedAt: string;
      stepRuns: ApiStepRun[];
    };

    const body = (await response.json()) as { data: ApiWorkflowRun[] };
    return body.data.map((run) => ({
      id: run.id,
      workflowId: run.workflowId,
      workflowName: run.workflowId,
      triggerType: run.triggerType,
      status:
        run.status === 'succeeded'
          ? 'success'
          : run.status === 'queued'
            ? 'pending'
            : run.status === 'cancelled'
              ? 'failed'
              : run.status,
      startedAt: run.startedAt,
      durationMs: run.durationMs,
      stepsCount: run.stepRuns.length,
      completedSteps: run.stepRuns.filter((step) =>
        ['succeeded', 'failed', 'skipped'].includes(step.status),
      ).length,
      stepRuns: run.stepRuns.map((step) => ({
        stepId: step.id,
        stepName: step.stepKey,
        stepType: step.stepType as WorkflowStepRun['stepType'],
        status: step.status === 'succeeded' ? 'success' : step.status === 'queued' ? 'running' : step.status,
        durationMs: step.durationMs,
        ...(step.input ? { inputPayload: step.input } : {}),
        ...(step.output ? { outputPayload: step.output } : {}),
        ...(step.errorMessage ? { errorMessage: step.errorMessage } : {}),
      })),
    }));
  }

  /**
   * List persisted documents for the authenticated workspace.
   */
  static async listDocuments(): Promise<DocumentRecord[]> {
    const config = getApiConfig();
    const response = await fetch(`${config.baseUrl}/v1/documents`, {
      headers: buildHeaders(config),
      credentials: 'same-origin',
    });
    if (!response.ok) {
      await throwResponseError(response, `DOCUMENT_HISTORY_LOAD_FAILED_${response.status}`);
    }
    const body = (await response.json()) as { data: DocumentRecord[] };
    return body.data;
  }

  /** Load a persisted document, its latest extraction, and latest human review. */
  static async getDocument(documentId: string): Promise<DocumentDetail> {
    const config = getApiConfig();
    const response = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(documentId)}`,
      { headers: buildHeaders(config), credentials: 'same-origin' },
    );
    if (!response.ok) await throwResponseError(response, `DOCUMENT_DETAIL_FAILED_${response.status}`);
    return ((await response.json()) as { data: DocumentDetail }).data;
  }

  /** Save a human-reviewed invoice without mutating the source extraction. */
  static async saveDocumentReview(documentId: string, invoice: StructuredInvoice): Promise<DocumentReviewRecord> {
    const config = getApiConfig();
    const response = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(documentId)}/review`,
      {
        method: 'PUT',
        headers: buildHeaders(config),
        credentials: 'same-origin',
        body: JSON.stringify({ invoice }),
      },
    );
    if (!response.ok) await throwResponseError(response, `DOCUMENT_REVIEW_SAVE_FAILED_${response.status}`);
    const body = (await response.json()) as { data: DocumentReviewRecord };
    return body.data;
  }

  /** Approve a reviewed invoice and receive its immutable approval digest. */
  static async approveDocumentReview(documentId: string, invoice: StructuredInvoice): Promise<DocumentReviewRecord> {
    const config = getApiConfig();
    const response = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(documentId)}/approve`,
      {
        method: 'POST',
        headers: buildHeaders(config),
        credentials: 'same-origin',
        body: JSON.stringify({ invoice }),
      },
    );
    if (!response.ok) await throwResponseError(response, `DOCUMENT_REVIEW_APPROVE_FAILED_${response.status}`);
    const body = (await response.json()) as { data: DocumentReviewRecord };
    return body.data;
  }

  /** Download the approved, verified JSON artifact for accounting/workflow handoff. */
  static async downloadVerifiedInvoiceJson(document: DocumentRecord): Promise<void> {
    const config = getApiConfig();
    const response = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(document.id)}/verified-json`,
      { headers: buildHeaders(config), credentials: 'same-origin' },
    );
    if (!response.ok) await throwResponseError(response, `VERIFIED_JSON_DOWNLOAD_FAILED_${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = window.document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${document.filename}.verified.json`;
      anchor.rel = 'noopener';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }


  static async comparePurchaseOrderInvoice(purchaseOrderDocumentId: string, invoiceDocumentId: string): Promise<import('../types/api.js').PurchaseOrderInvoiceMatch> {
    const config=getApiConfig();
    const response=await fetch(`${config.baseUrl}/v1/document-matches/po-invoice`,{method:'POST',headers:buildHeaders(config),credentials:'same-origin',body:JSON.stringify({purchaseOrderDocumentId,invoiceDocumentId})});
    if(!response.ok) await throwResponseError(response,`DOCUMENT_MATCH_FAILED_${response.status}`);
    return ((await response.json()) as {data:{match:import('../types/api.js').PurchaseOrderInvoiceMatch}}).data.match;
  }

  static async getPurchaseOrderInvoiceDecision(purchaseOrderDocumentId: string, invoiceDocumentId: string): Promise<import('../types/api.js').MatchDecisionRecord | null> {
    const config=getApiConfig();
    const qs=new URLSearchParams({purchaseOrderDocumentId,invoiceDocumentId});
    const response=await fetch(`${config.baseUrl}/v1/document-matches/po-invoice/decision?${qs}`,{headers:buildHeaders(config),credentials:'same-origin'});
    if(!response.ok) await throwResponseError(response,`MATCH_DECISION_LOAD_FAILED_${response.status}`);
    return ((await response.json()) as {data:import('../types/api.js').MatchDecisionRecord|null}).data;
  }

  static async listWorkflows(): Promise<import('../types/api.js').WorkflowRecord[]> {
    const config=getApiConfig(); const response=await fetch(`${config.baseUrl}/v1/workflows`,{headers:buildHeaders(config),credentials:'same-origin'});
    if(!response.ok) await throwResponseError(response,`WORKFLOWS_LOAD_FAILED_${response.status}`);
    return ((await response.json()) as {data:import('../types/api.js').WorkflowRecord[]}).data;
  }

  static async decidePurchaseOrderInvoice(purchaseOrderDocumentId: string, invoiceDocumentId: string, decision: 'accepted'|'rejected'|'escalated', reason: string, workflowId?: string): Promise<{decision:import('../types/api.js').MatchDecisionRecord; workflowRun:import('../types/api.js').WorkflowRun|null}> {
    const config=getApiConfig();
    const response=await fetch(`${config.baseUrl}/v1/document-matches/po-invoice/decision`,{method:'POST',headers:buildHeaders(config),credentials:'same-origin',body:JSON.stringify({purchaseOrderDocumentId,invoiceDocumentId,decision,reason,...(workflowId?{workflowId}:{})})});
    if(!response.ok) await throwResponseError(response,`MATCH_DECISION_SAVE_FAILED_${response.status}`);
    const body=(await response.json()) as {data:import('../types/api.js').MatchDecisionRecord; workflowRun:import('../types/api.js').WorkflowRun|null};
    return {decision:body.data,workflowRun:body.workflowRun};
  }

  /**
   * Download original bytes from the authenticated, tenant-scoped endpoint.
   */
  static async downloadDocument(document: DocumentRecord): Promise<void> {
    const config = getApiConfig();
    const response = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(document.id)}/content`,
      {
        headers: buildHeaders(config),
        credentials: 'same-origin',
      },
    );
    if (!response.ok) {
      await throwResponseError(response, `DOCUMENT_DOWNLOAD_FAILED_${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = window.document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = document.filename;
      anchor.rel = 'noopener';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Retry extraction for an already stored, tenant-scoped document.
   * Reuses the verified original bytes and never creates a duplicate document.
   */
  static async retryDocumentExtraction(documentId: string): Promise<void> {
    const config = getApiConfig();
    const response = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(documentId)}/extractions`,
      { method: 'POST', headers: buildHeaders(config), credentials: 'same-origin' },
    );
    if (!response.ok) {
      await throwResponseError(response, `DOCUMENT_EXTRACTION_RETRY_FAILED_${response.status}`);
    }
  }

  /**
   * Register metadata, upload validated bytes, then request extraction.
   * OCR remains explicitly not configured until a real worker adapter is connected.
   */
  static async processDocument(file: File): Promise<DocumentProcessingJob> {
    const config = getApiConfig();
    if (!file.type) throw new Error('UNSUPPORTED_MEDIA_TYPE');

    const registrationResponse = await fetch(`${config.baseUrl}/v1/documents`, {
      method: 'POST',
      headers: buildHeaders(config),
      credentials: 'same-origin',
      body: JSON.stringify({ filename: file.name, mediaType: file.type, sizeBytes: file.size }),
    });
    if (!registrationResponse.ok) {
      await throwResponseError(
        registrationResponse,
        `DOCUMENT_REGISTRATION_FAILED_${registrationResponse.status}`,
      );
    }
    const registration = (await registrationResponse.json()) as {
      data: DocumentProcessingJob['document'];
      uploadConfigured: boolean;
    };

    const uploadResponse = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(registration.data.id)}/content`,
      {
        method: 'PUT',
        headers: buildBinaryHeaders(file.type, config),
        credentials: 'same-origin',
        body: file,
      },
    );
    if (!uploadResponse.ok) {
      await throwResponseError(uploadResponse, `DOCUMENT_UPLOAD_FAILED_${uploadResponse.status}`);
    }
    const upload = (await uploadResponse.json()) as {
      data: DocumentProcessingJob['upload'];
      uploadConfigured: boolean;
    };

    const extractionResponse = await fetch(
      `${config.baseUrl}/v1/documents/${encodeURIComponent(registration.data.id)}/extractions`,
      { method: 'POST', headers: buildHeaders(config), credentials: 'same-origin' },
    );
    if (!extractionResponse.ok) {
      await throwResponseError(
        extractionResponse,
        `DOCUMENT_EXTRACTION_REQUEST_FAILED_${extractionResponse.status}`,
      );
    }
    const extraction = (await extractionResponse.json()) as {
      data: {
        document: DocumentProcessingJob['document'];
        extraction: DocumentProcessingJob['extraction'];
      };
      workerState: DocumentProcessingJob['workerState'];
    };

    return {
      document: extraction.data.document,
      upload: upload.data,
      extraction: extraction.data.extraction,
      workerState: extraction.workerState,
      uploadConfigured: upload.uploadConfigured,
    };
  }

  /**
   * Get truthful usage and reliability metrics from the live control API.
   */
  static async getUsageSummary(): Promise<{ summary: UsageSummary; providers: ProviderMetric[] }> {
    const config = getApiConfig();
    const response = await fetch(`${config.baseUrl}/v1/usage/summary`, {
      headers: buildHeaders(config),
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`USAGE_SUMMARY_LOAD_FAILED_${response.status}`);
    }
    const body = (await response.json()) as {
      data: { summary: UsageSummary; providers: ProviderMetric[] };
    };
    return body.data;
  }

  /**
   * Get the authenticated workspace data policy from the live control API.
   */
  static async getDataPolicy(): Promise<DataPolicyConfig> {
    const config = getApiConfig();
    const response = await fetch(`${config.baseUrl}/v1/data-policy`, {
      headers: buildHeaders(config),
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`DATA_POLICY_LOAD_FAILED_${response.status}`);
    }
    const body = (await response.json()) as { data: DataPolicyConfig };
    return body.data;
  }

  /**
   * Update the authenticated workspace data policy through the live control API.
   */
  static async updateDataPolicy(
    updates: Partial<Omit<DataPolicyConfig, 'workspaceId' | 'updatedAt'>> & {
      rightsBasis?: string;
    },
  ): Promise<DataPolicyConfig> {
    const config = getApiConfig();
    const response = await fetch(`${config.baseUrl}/v1/data-policy`, {
      method: 'PATCH',
      headers: buildHeaders(config),
      credentials: 'same-origin',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `DATA_POLICY_UPDATE_FAILED_${response.status}`);
    }
    const body = (await response.json()) as { data: DataPolicyConfig };
    return body.data;
  }
}
