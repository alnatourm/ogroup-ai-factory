import {
  type CreateProviderInput,
  type DataPolicyConfig,
  type DocumentExtractionResult,
  type GatewayRequest,
  type GatewayResponse,
  type SafeProviderConnection,
  type UsageSummary,
  type ProviderMetric,
  type WorkflowDefinition,
  type WorkflowRun,
} from '../types/api.js';
import { getApiConfig } from './config.js';

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

let mockDataPolicy: DataPolicyConfig = {
  workspaceId: 'workspace-a',
  dataZone: 'PRIVATE',
  piiMaskingEnabled: true,
  retentionDays: 90,
  auditLoggingEnabled: true,
  strictZdrLevel: 4,
  dualAdminApprovalRequired: true,
  updatedAt: new Date().toISOString(),
};

const mockWorkflowRuns: WorkflowRun[] = [
  {
    id: 'RUN-2025-08912',
    workflowId: 'wf-approval-01',
    workflowName: 'معالجة وتدقيق عروض أسعار الموردين والتحقق المالي',
    triggerType: 'webhook',
    status: 'success',
    startedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    durationMs: 1240,
    stepsCount: 4,
    completedSteps: 4,
    stepRuns: [
      {
        stepId: 's1',
        stepName: 'استقبال المعاملة الحكومية وتدقيق التوقيع',
        stepType: 'trigger',
        status: 'success',
        durationMs: 140,
        outputPayload: { source: 'Etimad Webhook', payloadSize: '24KB' },
      },
      {
        stepId: 's2',
        stepName: 'فحص الكيانات وحجب البيانات الحساسة (PII)',
        stepType: 'pii_masking',
        status: 'success',
        durationMs: 320,
        outputPayload: { maskedCount: 2, fields: ['national_id', 'bank_account'] },
      },
      {
        stepId: 's3',
        stepName: 'تقييم العرض المالي ومطابقة اللائحة (BYOAI)',
        stepType: 'llm_transform',
        status: 'success',
        durationMs: 650,
        outputPayload: { status: 'compliant', riskScore: 0.04 },
      },
      {
        stepId: 's4',
        stepName: 'إشعار المدير المالي وأرشفة السجل السيادي',
        stepType: 'notification',
        status: 'success',
        durationMs: 130,
        outputPayload: { recipient: 'cfo@org.gov.sa', archiveId: 'ARCH-9902' },
      },
    ],
  },
  {
    id: 'RUN-2025-08911',
    workflowId: 'wf-ocr-contract-02',
    workflowName: 'استخراج وثائق السجلات التجارية والمطابقة الضريبية',
    triggerType: 'document_ingest',
    status: 'success',
    startedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    durationMs: 3180,
    stepsCount: 4,
    completedSteps: 4,
    stepRuns: [
      {
        stepId: 's1',
        stepName: 'رفع المستند المشفر بصيغة PDF',
        stepType: 'trigger',
        status: 'success',
        durationMs: 250,
      },
      {
        stepId: 's2',
        stepName: 'معالجة OCR بالذكاء الاصطناعي مع حفظ الترتيب RTL',
        stepType: 'llm_transform',
        status: 'success',
        durationMs: 2200,
      },
      {
        stepId: 's3',
        stepName: 'استخراج الأرقام الضريبية ورقم السجل التجاري',
        stepType: 'pii_masking',
        status: 'success',
        durationMs: 450,
      },
      {
        stepId: 's4',
        stepName: 'المطابقة مع سجلات الهيئة العامة للزكاة والضريبة',
        stepType: 'archive',
        status: 'success',
        durationMs: 280,
      },
    ],
  },
  {
    id: 'RUN-2025-08910',
    workflowId: 'wf-support-routing',
    workflowName: 'تصنيف استفسارات العملاء باللهجات العربية وتوجيهها',
    triggerType: 'webhook',
    status: 'failed',
    startedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    durationMs: 1840,
    stepsCount: 3,
    completedSteps: 1,
    stepRuns: [
      {
        stepId: 's1',
        stepName: 'استقبال الرسالة الواردة',
        stepType: 'trigger',
        status: 'success',
        durationMs: 110,
      },
      {
        stepId: 's2',
        stepName: 'تحديد اللهجة والتحويل إلى العربية الفصحى (MSA)',
        stepType: 'llm_transform',
        status: 'failed',
        durationMs: 1730,
        errorMessage: 'انتهت مهلة استجابة مزود الذكاء الاصطناعي الخارجي (Upstream Gateway Timeout)',
      },
    ],
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
  } else {
    throw new Error('Authentication is required. Configure a runtime API credential or explicitly enable development identity headers.');
  }

  return headers;
}

function requireMockFallback(): void {
  if (!getApiConfig().useMockFallback) {
    throw new Error('Backend capability is unavailable and mock fallback is disabled.');
  }
}

export class ArabicAiIpaasClient {
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
   * [NON-PRODUCTION PLACEHOLDER]
   * List workflow run histories
   */
  static async listWorkflowRuns(): Promise<WorkflowRun[]> {
    requireMockFallback();
    return [...mockWorkflowRuns];
  }

  /**
   * [NON-PRODUCTION PLACEHOLDER]
   * Document Intelligence OCR & entity extraction
   */
  static async processDocument(file: { name: string; size: number; type: string }): Promise<DocumentExtractionResult> {
    requireMockFallback();
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      metadata: {
        id: `doc_${Date.now()}`,
        filename: file.name || 'عقد_توريد_تقني_مؤسسي_معتمد_KSA_v4.pdf',
        fileSize: file.size || 2457600,
        mimeType: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        pageCount: 3,
        detectedLanguage: 'العربية (Arabic) 99.8%',
        documentType: 'عقد توريد حلول برمجية وبنية تحتية',
        classificationConfidence: 0.994,
      },
      fullTextAr:
        `عقد توريد حلول البنية التحتية والذكاء الاصطناعي السيادي\n` +
        `المملكة العربية السعودية\n\n` +
        `إنه في يوم الأحد الموافق 01 رجب 1446هـ تم الاتفاق بين كل من:\n` +
        `الطرف الأول: وزارة التجارة والذكاء الاصطناعي (المشتري)\n` +
        `الطرف الثاني: الشركة الوطنية للحلول السحابية المتقدمة (المورد) - س.ت: 1010892341\n` +
        `الرقم الضريبي: 310294857200003\n\n` +
        `البند الثالث: القيمة الإجمالية للعقد:\n` +
        `اتفق الطرفان على أن القيمة الإجمالية لتوريد ونشر رخص منصة الذكاء الاصطناعي هي 4,750,000 ريال سعودي (أربعة ملايين وسبعمائة وخمسون ألف ريال سعودي).\n\n` +
        `البند الرابع: حوكمة البيانات والسرية:\n` +
        `تلتزم الشركة الموردة بعدم نقل أي بيانات خارج الحدود الجغرافية للمملكة، وتطبيق معايير ضوابط الأمن السيبراني الوطنية وسياسة Zero Data Retention.`,
      rawMarkdown:
        `# عقد توريد حلول البنية التحتية والذكاء الاصطناعي السيادي\n\n` +
        `**التاريخ:** 01 رجب 1446هـ  \n` +
        `**الطرف الأول:** وزارة التجارة والذكاء الاصطناعي  \n` +
        `**الطرف الثاني:** الشركة الوطنية للحلول السحابية المتقدمة  \n\n` +
        `| الحقل | القيمة المستخرجة | نسبة الدقة |\n` +
        `| :--- | :--- | :--- |\n` +
        `| السجل التجاري | 1010892341 | 99.8% |\n` +
        `| الرقم الضريبي | 310294857200003 | 99.9% |\n` +
        `| القيمة الإجمالية | 4,750,000 ر.س | 100% |\n` +
        `| مستوى تصنيف البيانات | سري للغاية (NDMO Level 4) | 100% |`,
      extractedEntities: [
        { field: 'contract_party_1', labelAr: 'الطرف الأول (المشتري)', labelEn: 'First Party', value: 'وزارة التجارة والذكاء الاصطناعي', confidence: 0.99 },
        { field: 'contract_party_2', labelAr: 'الطرف الثاني (المورد)', labelEn: 'Second Party', value: 'الشركة الوطنية للحلول السحابية المتقدمة', confidence: 0.99 },
        { field: 'cr_number', labelAr: 'رقم السجل التجاري', labelEn: 'CR Number', value: '1010892341', confidence: 0.998 },
        { field: 'vat_number', labelAr: 'الرقم الضريبي (VAT)', labelEn: 'VAT Number', value: '310294857200003', confidence: 0.999 },
        { field: 'contract_amount', labelAr: 'القيمة المالية الإجمالية', labelEn: 'Total Amount', value: '4,750,000 ريال سعودي', confidence: 1.0 },
        { field: 'contract_date', labelAr: 'تاريخ السريان', labelEn: 'Effective Date', value: '01 رجب 1446هـ', confidence: 0.98 },
        { field: 'jurisdiction', labelAr: 'النطاق الجغرافي والسيادة', labelEn: 'Jurisdiction', value: 'المملكة العربية السعودية (KSA)', confidence: 1.0 },
      ],
      status: 'processed',
      ocrEngine: 'Wasl Sovereign Multimodal OCR v3.4 (RTL-Native)',
      piiMaskedCount: 3,
    };
  }

  /**
   * [NON-PRODUCTION PLACEHOLDER]
   * Get Usage & SLA Metrics
   */
  static async getUsageSummary(): Promise<{ summary: UsageSummary; providers: ProviderMetric[] }> {
    requireMockFallback();
    return {
      summary: {
        totalRequests: 248920,
        totalTokens: 184500210,
        activeWorkflows: 14,
        processedDocuments: 1820,
        successRate: 99.82,
        avgLatencyMs: 412,
        errorRate: 0.08,
      },
      providers: [
        {
          providerId: 'p1',
          providerName: 'بوابة Azure OpenAI السيادية (KSA)',
          model: 'gpt-4o',
          status: 'active',
          requestCount: 164200,
          successRate: 99.91,
          avgLatencyMs: 380,
          p99LatencyMs: 820,
          tokenCount: 122000000,
        },
        {
          providerId: 'p2',
          providerName: 'Google Cloud Vertex AI Enterprise',
          model: 'gemini-1.5-pro',
          status: 'active',
          requestCount: 62400,
          successRate: 99.85,
          avgLatencyMs: 440,
          p99LatencyMs: 910,
          tokenCount: 48500000,
        },
        {
          providerId: 'p3',
          providerName: 'Anthropic Claude 3.5 Sonnet Gateway',
          model: 'claude-3-5-sonnet',
          status: 'degraded',
          requestCount: 22320,
          successRate: 98.40,
          avgLatencyMs: 620,
          p99LatencyMs: 1450,
          tokenCount: 14000210,
        },
      ],
    };
  }

  /**
   * [NON-PRODUCTION PLACEHOLDER]
   * Get Data Policy Configuration
   */
  static async getDataPolicy(): Promise<DataPolicyConfig> {
    requireMockFallback();
    return { ...mockDataPolicy };
  }

  /**
   * [NON-PRODUCTION PLACEHOLDER]
   * Update Data Policy Configuration
   */
  static async updateDataPolicy(updates: Partial<DataPolicyConfig>): Promise<DataPolicyConfig> {
    requireMockFallback();
    mockDataPolicy = {
      ...mockDataPolicy,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockDataPolicy };
  }
}
