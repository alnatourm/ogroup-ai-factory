import { describe, expect, it } from 'vitest';
import { MemoryDataPolicyRepository, handleDataPolicyUpdate } from './data-policy.js';
import { MemoryAuditRepository } from './audit-service.js';
import { MemoryDocumentRepository, queueDocumentExtraction, validateDocumentUpload } from './document-service.js';
import { MemoryWorkflowRepository, executeWorkflow } from './workflow-engine.js';
import { validateProviderBaseUrl } from './security.js';
import type { WorkflowRecord } from './types.js';

describe('Factory integration safety review', () => {
  it('keeps data policies isolated by workspace and requires explicit improvement opt-in', async () => {
    const policies = new MemoryDataPolicyRepository();
    const audit = new MemoryAuditRepository();

    await expect(
      handleDataPolicyUpdate(
        'workspace-a',
        { dataZone: 'IMPROVEMENT_OPT_IN', optInConfirmed: false },
        'user-a',
        policies,
        audit,
      ),
    ).rejects.toThrow('EXPLICIT_OPT_IN_REQUIRED');

    const updated = await handleDataPolicyUpdate(
      'workspace-a',
      { dataZone: 'IMPROVEMENT_OPT_IN', optInConfirmed: true },
      'user-a',
      policies,
      audit,
    );

    expect(updated.dataZone).toBe('IMPROVEMENT_OPT_IN');
    expect((await policies.get('workspace-b')).dataZone).toBe('PRIVATE');
    expect((await audit.list('workspace-a')).length).toBe(1);
    expect((await audit.list('workspace-b')).length).toBe(0);
  });

  it('never reports fake OCR success when OCR is not configured', async () => {
    const previous = process.env.OCR_WORKER_ENABLED;
    delete process.env.OCR_WORKER_ENABLED;
    try {
      const repository = new MemoryDocumentRepository();
      const meta = validateDocumentUpload('invoice.pdf', 'application/pdf', 2048);
      const document = await repository.create({ workspaceId: 'workspace-a', ...meta });
      const queued = await queueDocumentExtraction('workspace-a', document.id, repository);

      expect(queued.configured).toBe(false);
      expect(queued.extraction.status).toBe('processing');
      expect(queued.extraction.markdown).toBeUndefined();
      expect(queued.extraction.structuredJson).toBeUndefined();
      expect(queued.extraction.errorMessage).toContain('OCR_ENGINE_NOT_CONFIGURED');
      expect(await repository.get('workspace-b', document.id)).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.OCR_WORKER_ENABLED;
      else process.env.OCR_WORKER_ENABLED = previous;
    }
  });

  it('fails closed instead of fabricating success for unconfigured workflow actions', async () => {
    const repository = new MemoryWorkflowRepository();
    const workflow: WorkflowRecord = {
      id: 'wf-1',
      workspaceId: 'workspace-a',
      name: 'Approval workflow',
      schemaVersion: 'workflow-json-v1',
      definition: {
        version: 'workflow-json-v1',
        steps: [
          { id: 's1', type: 'trigger' },
          { id: 's2', type: 'manager_approval' },
          { id: 's3', type: 'archive' },
        ],
      },
      status: 'active',
      version: 1,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };

    const run = await executeWorkflow(workflow, 'manual', { amount: 12000 }, repository);

    expect(run.status).toBe('failed');
    expect(run.stepRuns[1]?.errorMessage).toBe('STEP_EXECUTOR_NOT_CONFIGURED');
    expect(run.stepRuns[2]?.status).toBe('skipped');
  });

  it('performs deterministic masking without claiming fields were masked when absent', async () => {
    const repository = new MemoryWorkflowRepository();
    const workflow: WorkflowRecord = {
      id: 'wf-mask',
      workspaceId: 'workspace-a',
      name: 'Mask',
      schemaVersion: 'workflow-json-v1',
      definition: { version: 'workflow-json-v1', steps: [{ id: 's1', type: 'pii_masking' }] },
      status: 'active',
      version: 1,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };

    const run = await executeWorkflow(
      workflow,
      'manual',
      { national_id: '1234567890', note: 'keep' },
      repository,
    );

    expect(run.status).toBe('succeeded');
    expect(run.output?.national_id).toBe('[REDACTED]');
    expect(run.output?.note).toBe('keep');
    expect(run.output?.maskedCount).toBe(1);
  });

  it('rejects obviously unsafe provider destinations', () => {
    expect(() => validateProviderBaseUrl('http://api.example.com')).toThrow('MUST_USE_HTTPS');
    expect(() => validateProviderBaseUrl('https://127.0.0.1/v1')).toThrow('NOT_ALLOWED');
    expect(() => validateProviderBaseUrl('https://metadata.google.internal/v1')).toThrow('NOT_ALLOWED');
    expect(() => validateProviderBaseUrl('https://api.groq.com/openai/v1')).not.toThrow();
  });
});
