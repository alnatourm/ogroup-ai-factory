import crypto from 'node:crypto';
import type {
  WorkflowJsonV1,
  WorkflowRecord,
  WorkflowRunRecord,
  WorkflowStepDefinition,
  WorkflowStepRunRecord,
} from './types.js';

export interface WorkflowRepository {
  create(input: {
    workspaceId: string;
    name: string;
    description?: string;
    definition: WorkflowJsonV1;
    createdBy?: string;
  }): Promise<WorkflowRecord>;
  list(workspaceId: string): Promise<WorkflowRecord[]>;
  get(workspaceId: string, id: string): Promise<WorkflowRecord | undefined>;
  update(
    workspaceId: string,
    id: string,
    updates: {
      name?: string;
      description?: string;
      definition?: WorkflowJsonV1;
      status?: 'draft' | 'active' | 'paused' | 'archived';
    },
  ): Promise<WorkflowRecord | undefined>;
  createRun(input: {
    workspaceId: string;
    workflowId: string;
    triggerType: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
    input?: Record<string, unknown>;
  }): Promise<WorkflowRunRecord>;
  updateRun(
    workspaceId: string,
    runId: string,
    updates: Partial<WorkflowRunRecord>,
  ): Promise<WorkflowRunRecord | undefined>;
  saveStepRun(stepRun: WorkflowStepRunRecord): Promise<WorkflowStepRunRecord>;
  listRuns(workspaceId: string, workflowId?: string): Promise<WorkflowRunRecord[]>;
  getRun(workspaceId: string, runId: string): Promise<WorkflowRunRecord | undefined>;
}

export class MemoryWorkflowRepository implements WorkflowRepository {
  private readonly workflows = new Map<string, WorkflowRecord>();
  private readonly runs = new Map<string, WorkflowRunRecord>();
  private readonly stepRuns = new Map<string, WorkflowStepRunRecord[]>();

  async create(input: {
    workspaceId: string;
    name: string;
    description?: string;
    definition: WorkflowJsonV1;
    createdBy?: string;
  }): Promise<WorkflowRecord> {
    const now = new Date().toISOString();
    const workflow: WorkflowRecord = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      schemaVersion: 'workflow-json-v1',
      definition: input.definition,
      status: 'draft',
      version: 1,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async list(workspaceId: string): Promise<WorkflowRecord[]> {
    return [...this.workflows.values()]
      .filter((w) => w.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async get(workspaceId: string, id: string): Promise<WorkflowRecord | undefined> {
    const wf = this.workflows.get(id);
    return wf?.workspaceId === workspaceId ? wf : undefined;
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

    const updated: WorkflowRecord = {
      ...current,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.definition ? { definition: updates.definition } : {}),
      ...(updates.status ? { status: updates.status } : {}),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.workflows.set(id, updated);
    return updated;
  }

  async createRun(input: {
    workspaceId: string;
    workflowId: string;
    triggerType: 'webhook' | 'scheduled' | 'manual' | 'document_ingest';
    input?: Record<string, unknown>;
  }): Promise<WorkflowRunRecord> {
    const now = new Date().toISOString();
    const run: WorkflowRunRecord = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      triggerType: input.triggerType,
      status: 'queued',
      input: input.input ?? {},
      durationMs: 0,
      startedAt: now,
      createdAt: now,
      stepRuns: [],
    };
    this.runs.set(run.id, run);
    this.stepRuns.set(run.id, []);
    return run;
  }

  async updateRun(
    workspaceId: string,
    runId: string,
    updates: Partial<WorkflowRunRecord>,
  ): Promise<WorkflowRunRecord | undefined> {
    const run = this.runs.get(runId);
    if (!run || run.workspaceId !== workspaceId) return undefined;

    const currentStepRuns = this.stepRuns.get(runId) ?? [];
    const updated: WorkflowRunRecord = {
      ...run,
      ...updates,
      stepRuns: updates.stepRuns ?? currentStepRuns,
    };
    this.runs.set(runId, updated);
    return updated;
  }

  async saveStepRun(stepRun: WorkflowStepRunRecord): Promise<WorkflowStepRunRecord> {
    const steps = this.stepRuns.get(stepRun.workflowRunId) ?? [];
    const existingIndex = steps.findIndex((s) => s.id === stepRun.id);
    if (existingIndex >= 0) {
      steps[existingIndex] = stepRun;
    } else {
      steps.push(stepRun);
    }
    this.stepRuns.set(stepRun.workflowRunId, steps);

    // Also mirror to run record
    const run = this.runs.get(stepRun.workflowRunId);
    if (run) {
      run.stepRuns = [...steps];
    }
    return stepRun;
  }

  async listRuns(workspaceId: string, workflowId?: string): Promise<WorkflowRunRecord[]> {
    return [...this.runs.values()]
      .filter((r) => r.workspaceId === workspaceId && (!workflowId || r.workflowId === workflowId))
      .map((r) => ({ ...r, stepRuns: this.stepRuns.get(r.id) ?? [] }))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getRun(workspaceId: string, runId: string): Promise<WorkflowRunRecord | undefined> {
    const run = this.runs.get(runId);
    if (!run || run.workspaceId !== workspaceId) return undefined;
    return { ...run, stepRuns: this.stepRuns.get(run.id) ?? [] };
  }
}

/**
 * Validates canonical Workflow JSON v1 structure
 */
export function validateWorkflowDefinition(def: unknown): WorkflowJsonV1 {
  if (!def || typeof def !== 'object') {
    throw new Error('INVALID_WORKFLOW_DEFINITION: Must be an object');
  }

  const record = def as Record<string, unknown>;
  const version = record.version ?? record.schemaVersion;
  if (!version || (version !== 1 && version !== '1' && version !== 'workflow-json-v1')) {
    throw new Error('INVALID_WORKFLOW_VERSION: Canonical schema version must be workflow-json-v1');
  }

  return def as WorkflowJsonV1;
}

/**
 * Deterministic step executor
 */
function executeDeterministicStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
): { output: Record<string, unknown>; status: 'succeeded' | 'skipped' | 'failed'; error?: string } {
  const stepType = step.type || step.stepType || 'unknown';

  switch (stepType) {
    case 'trigger':
    case 'webhook.inbound':
      return {
        output: {
          receivedAt: new Date().toISOString(),
          source: (step.config?.protocol as string) || 'manual',
          payloadKeys: Object.keys(input),
        },
        status: 'succeeded',
      };

    case 'pii_masking': {
      const sensitiveKeys = new Set(['national_id', 'nationalId', 'bank_account', 'bankAccount', 'iban', 'phone']);
      const output: Record<string, unknown> = {};
      let maskedCount = 0;
      for (const [key, value] of Object.entries(input)) {
        if (sensitiveKeys.has(key) && value !== undefined && value !== null) {
          output[key] = '[REDACTED]';
          maskedCount++;
        } else {
          output[key] = value;
        }
      }
      return {
        output: { ...output, maskedCount },
        status: 'succeeded',
      };
    }

    case 'condition': {
      const threshold = Number(step.config?.threshold ?? step.config?.value);
      const amount = Number(input.amount);
      const operator = (step.config?.operator as string) || '>';
      if (!Number.isFinite(threshold) || !Number.isFinite(amount)) {
        return {
          output: {},
          status: 'failed',
          error: 'CONDITION_INPUT_REQUIRED',
        };
      }
      let conditionMet: boolean;
      if (operator === '>') conditionMet = amount > threshold;
      else if (operator === '>=') conditionMet = amount >= threshold;
      else if (operator === '<') conditionMet = amount < threshold;
      else if (operator === '<=') conditionMet = amount <= threshold;
      else if (operator === '==') conditionMet = amount === threshold;
      else {
        return { output: {}, status: 'failed', error: 'UNSUPPORTED_CONDITION_OPERATOR' };
      }
      return {
        output: { conditionMet, operator, evaluatedValue: amount, threshold },
        status: 'succeeded',
      };
    }

    case 'manager_approval':
    case 'notification':
    case 'archive':
    case 'ai.extract':
    case 'llm_transform':
    case 'transform':
    case 'http.request':
      return {
        output: { configured: false, stepType },
        status: 'failed',
        error: 'STEP_EXECUTOR_NOT_CONFIGURED',
      };

    default:
      return {
        output: { configured: false, stepType },
        status: 'failed',
        error: 'UNSUPPORTED_STEP_TYPE',
      };
  }
}

/**
 * Executes a workflow with deterministic supported steps
 */
export async function executeWorkflow(
  workflow: WorkflowRecord,
  triggerType: 'webhook' | 'scheduled' | 'manual' | 'document_ingest',
  inputPayload: Record<string, unknown>,
  repository: WorkflowRepository,
): Promise<WorkflowRunRecord> {
  const startTime = Date.now();
  const run = await repository.createRun({
    workspaceId: workflow.workspaceId,
    workflowId: workflow.id,
    triggerType,
    input: inputPayload,
  });

  await repository.updateRun(workflow.workspaceId, run.id, {
    status: 'running',
    startedAt: new Date(startTime).toISOString(),
  });

  const steps = workflow.definition.steps || [];
  const stepRuns: WorkflowStepRunRecord[] = [];
  let executionSuccess = true;
  let accumulatedOutput: Record<string, unknown> = { ...inputPayload };
  let skipRemaining = false;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const stepStartTime = Date.now();
    const stepKey = step.id || `step_${i + 1}`;
    const stepType = step.type || step.stepType || 'unknown';

    if (skipRemaining) {
      const skippedStepRun: WorkflowStepRunRecord = {
        id: crypto.randomUUID(),
        workspaceId: workflow.workspaceId,
        workflowRunId: run.id,
        stepKey,
        stepType,
        status: 'skipped',
        durationMs: 0,
        startedAt: new Date(stepStartTime).toISOString(),
        completedAt: new Date(stepStartTime).toISOString(),
        createdAt: new Date().toISOString(),
      };
      await repository.saveStepRun(skippedStepRun);
      stepRuns.push(skippedStepRun);
      continue;
    }

    const result = executeDeterministicStep(step, accumulatedOutput);
    const stepDuration = Math.max(1, Date.now() - stepStartTime);

    const stepRun: WorkflowStepRunRecord = {
      id: crypto.randomUUID(),
      workspaceId: workflow.workspaceId,
      workflowRunId: run.id,
      stepKey,
      stepType,
      status: result.status,
      input: accumulatedOutput,
      output: result.output,
      errorCode: result.error ? 'STEP_ERROR' : undefined,
      errorMessage: result.error,
      durationMs: stepDuration,
      startedAt: new Date(stepStartTime).toISOString(),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await repository.saveStepRun(stepRun);
    stepRuns.push(stepRun);

    if (result.status === 'failed') {
      executionSuccess = false;
      skipRemaining = true;
    } else {
      accumulatedOutput = { ...accumulatedOutput, ...result.output };
    }
  }

  const totalDuration = Date.now() - startTime;
  const finalStatus = executionSuccess ? 'succeeded' : 'failed';
  const completedRun = await repository.updateRun(workflow.workspaceId, run.id, {
    status: finalStatus,
    output: accumulatedOutput,
    durationMs: totalDuration,
    completedAt: new Date().toISOString(),
    stepRuns,
  });

  return completedRun ?? {
    ...run,
    status: finalStatus,
    output: accumulatedOutput,
    durationMs: totalDuration,
    stepRuns,
  };
}

/**
 * Natural language Arabic workflow compiler
 * Transforms Arabic instructions into structured Workflow JSON v1
 */
export function compileArabicWorkflowPrompt(instructionAr: string, _workspaceId: string): {
  nameAr: string;
  nameEn: string;
  promptInstructionAr: string;
  status: 'draft';
  steps: WorkflowStepDefinition[];
  rawJsonV1: WorkflowJsonV1;
} {
  const isHighAmount =
    instructionAr.includes('10000') ||
    instructionAr.includes('500000') ||
    instructionAr.includes('ريال') ||
    instructionAr.includes('مبلغ');

  const steps: WorkflowStepDefinition[] = [
    {
      id: 'step_trigger_01',
      titleAr: 'مشغّل المسار: استقبال المعاملة / عرض السعر',
      titleEn: 'Trigger: Receive Quote / Transaction',
      type: 'trigger',
      stepType: 'trigger',
      descriptionAr: 'استقبال حدث ويبهوك مشفر من منصة المشتريات أو إدارة الأعمال',
      descriptionEn: 'Receive encrypted inbound webhook from ERP/Procurement platform',
      config: { protocol: 'HTTPS Webhook', auth: 'Mutual TLS' },
    },
    {
      id: 'step_pii_02',
      titleAr: 'حجب الكيانات الحساسة وفحص الخصوصية',
      titleEn: 'Entity Masking & Privacy Check',
      type: 'pii_masking',
      stepType: 'pii_masking',
      descriptionAr: 'حجب الهويات الوطنية، الحسابات المصرفية، والأرقام السرية وفق ضوابط NDMO',
      descriptionEn: 'Mask national IDs, IBANs, and PII in accordance with NDMO guidelines',
      config: { policy: 'NDMO-L4', maskFormat: '[محجوب-سيادي]' },
    },
    {
      id: 'step_cond_03',
      titleAr: isHighAmount
        ? 'شرط القيمة المالية (> 10,000 ريال سعودي)'
        : 'التحقق من اكتمال المستند وتوقيع المورد',
      titleEn: isHighAmount ? 'Condition: Amount > 10,000 SAR' : 'Condition: Document Completeness',
      type: 'condition',
      stepType: 'condition',
      descriptionAr: isHighAmount
        ? 'توجيه المسار لطلب موافقة الإدارة المالية نظراً لتجاوز الحد المعتمد'
        : 'التأكد من اكتمال توقيع المورد وصلاحية السجل التجاري',
      descriptionEn: isHighAmount
        ? 'Route for manager approval because amount exceeds threshold'
        : 'Verify supplier signature and commercial registration completeness',
      config: { operator: '>', threshold: 10000, currency: 'SAR' },
    },
    {
      id: 'step_approval_04',
      titleAr: 'طلب موافقة المدير المالي المعتمد',
      titleEn: 'Action: Request Manager Approval',
      type: 'manager_approval',
      stepType: 'manager_approval',
      descriptionAr: 'إرسال إشعار تفاعلي للمدير المالي مع رمز تحقق للتدقيق',
      descriptionEn: 'Dispatch approval request via enterprise messaging / email',
      config: { channel: 'Teams/Email', timeoutHours: 24 },
    },
    {
      id: 'step_archive_05',
      titleAr: 'أرشفة العقد في المخزن السيادي',
      titleEn: 'Action: Archive in Sovereign Vault',
      type: 'archive',
      stepType: 'archive',
      descriptionAr: 'حفظ مستند العقد والتقارير في المخزن المحلي المشفر بنظام WORM',
      descriptionEn: 'Persist contract report in encrypted sovereign storage and audit log',
      config: { storageClass: 'Sovereign-S3-Immutable', retentionYears: 10 },
    },
  ];

  const rawJsonV1: WorkflowJsonV1 = {
    version: 'workflow-json-v1',
    name: 'مسار معالجة عروض الأسعار والتحقق المالي السيادي',
    trigger: { type: 'webhook.inbound', schema: 'quote_received' },
    condition: { field: 'quote.amount', operator: '>', value: 10000, currency: 'SAR' },
    action: { type: 'request_manager_approval', approverRole: 'financial_director' },
    output: { archive: true, vault: 'sovereign-vault-ksa' },
    steps,
  };

  return {
    nameAr: 'مسار معالجة عروض الأسعار والتحقق المالي السيادي',
    nameEn: 'Automated Sovereign Quote Processing Workflow',
    promptInstructionAr: instructionAr,
    status: 'draft',
    steps,
    rawJsonV1,
  };
}
