import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { MemoryAuditRepository } from './audit-service.js';

const ownerA = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'owner-a',
  'x-workspace-role': 'workspace_owner',
};

const ownerB = {
  'x-workspace-id': 'workspace-b',
  'x-user-id': 'owner-b',
  'x-workspace-role': 'workspace_owner',
};

const viewerA = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'viewer-a',
  'x-workspace-role': 'viewer',
};

function testApp() {
  return createApp({ masterKey: 'route-test-master-key', allowInsecureTestHeaders: true });
}

describe('Arabic AI iPaaS integration routes', () => {
  it('wires workflow CRUD and execution with tenant isolation and fail-closed actions', async () => {
    const app = testApp();
    const created = await request(app)
      .post('/v1/workflows')
      .set(ownerA)
      .send({
        name: 'Approval flow',
        definition: {
          version: 'workflow-json-v1',
          steps: [
            { id: 'trigger', type: 'trigger' },
            { id: 'approval', type: 'manager_approval' },
          ],
        },
      });

    expect(created.status).toBe(201);
    const workflowId = created.body.data.id as string;

    const hiddenFromOtherWorkspace = await request(app).get(`/v1/workflows/${workflowId}`).set(ownerB);
    expect(hiddenFromOtherWorkspace.status).toBe(404);

    const activated = await request(app)
      .patch(`/v1/workflows/${workflowId}`)
      .set(ownerA)
      .send({ status: 'active' });
    expect(activated.status).toBe(200);

    const run = await request(app)
      .post(`/v1/workflows/${workflowId}/runs`)
      .set(ownerA)
      .send({ input: { amount: 12000 } });

    expect(run.status).toBe(201);
    expect(run.body.data.status).toBe('failed');
    expect(run.body.data.stepRuns[1].errorMessage).toBe('STEP_EXECUTOR_NOT_CONFIGURED');
  });

  it('protects data-policy writes and requires explicit improvement opt-in', async () => {
    const app = testApp();
    const forbidden = await request(app)
      .patch('/v1/data-policy')
      .set(viewerA)
      .send({ piiMaskingEnabled: false });
    expect(forbidden.status).toBe(403);

    const rejected = await request(app)
      .patch('/v1/data-policy')
      .set(ownerA)
      .send({ dataZone: 'IMPROVEMENT_OPT_IN', optInConfirmed: false });
    expect(rejected.status).toBe(409);
    expect(rejected.body.error).toBe('EXPLICIT_OPT_IN_REQUIRED');

    const accepted = await request(app)
      .patch('/v1/data-policy')
      .set(ownerA)
      .send({
        dataZone: 'IMPROVEMENT_OPT_IN',
        optInConfirmed: true,
        rightsBasis: 'customer-contract-v1',
      });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.dataZone).toBe('IMPROVEMENT_OPT_IN');

    const otherWorkspace = await request(app).get('/v1/data-policy').set(ownerB);
    expect(otherWorkspace.body.data.dataZone).toBe('PRIVATE');
    expect(otherWorkspace.body.data.optInConfirmed).toBe(false);
  });

  it('uploads verified bytes with tenant isolation before exposing the truthful OCR seam', async () => {
    const previous = process.env.OCR_WORKER_ENABLED;
    delete process.env.OCR_WORKER_ENABLED;
    try {
      const auditRepository = new MemoryAuditRepository();
      const app = createApp({
        masterKey: 'route-test-master-key',
        allowInsecureTestHeaders: true,
        auditRepository,
      });
      const pdf = Buffer.alloc(128);
      pdf.write('%PDF-private-customer-content', 'ascii');

      const created = await request(app)
        .post('/v1/documents')
        .set(ownerA)
        .send({ filename: 'invoice.pdf', mediaType: 'application/pdf', sizeBytes: pdf.length });

      expect(created.status).toBe(201);
      expect(created.body.uploadConfigured).toBe(true);
      const documentId = created.body.data.id as string;

      const extractionBeforeUpload = await request(app)
        .post(`/v1/documents/${documentId}/extractions`)
        .set(ownerA)
        .send({});
      expect(extractionBeforeUpload.status).toBe(409);
      expect(extractionBeforeUpload.body.error).toBe('DOCUMENT_CONTENT_REQUIRED');

      const hiddenFromOtherWorkspace = await request(app)
        .put(`/v1/documents/${documentId}/content`)
        .set(ownerB)
        .set('Content-Type', 'application/pdf')
        .send(pdf);
      expect(hiddenFromOtherWorkspace.status).toBe(404);

      const uploaded = await request(app)
        .put(`/v1/documents/${documentId}/content`)
        .set(ownerA)
        .set('Content-Type', 'application/pdf')
        .send(pdf);
      expect(uploaded.status).toBe(201);
      expect(uploaded.body.uploadConfigured).toBe(true);
      expect(uploaded.body.data.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(uploaded.body.data.sizeBytes).toBe(pdf.length);

      const queued = await request(app)
        .post(`/v1/documents/${documentId}/extractions`)
        .set(ownerA)
        .send({});

      expect(queued.status).toBe(202);
      expect(queued.body.workerState).toBe('not_configured');
      expect(queued.body.data.configured).toBe(false);
      expect(queued.body.data.extraction.status).toBe('processing');
      expect(queued.body.data.extraction.markdown).toBeUndefined();
      expect(queued.body.data.extraction.structuredJson).toBeUndefined();

      const auditJson = JSON.stringify(await auditRepository.list('workspace-a'));
      expect(auditJson).not.toContain('private-customer-content');
      expect(auditJson).toContain('document.content_uploaded');
    } finally {
      if (previous === undefined) delete process.env.OCR_WORKER_ENABLED;
      else process.env.OCR_WORKER_ENABLED = previous;
    }
  });

  it('rejects document bytes that do not match registered size or signature', async () => {
    const app = testApp();
    const created = await request(app)
      .post('/v1/documents')
      .set(ownerA)
      .send({ filename: 'invoice.pdf', mediaType: 'application/pdf', sizeBytes: 16 });
    const documentId = created.body.data.id as string;

    const wrongSize = await request(app)
      .put(`/v1/documents/${documentId}/content`)
      .set(ownerA)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('%PDF-short'));
    expect(wrongSize.status).toBe(400);
    expect(wrongSize.body.error).toBe('DOCUMENT_SIZE_MISMATCH');

    const invalidSignature = await request(app)
      .put(`/v1/documents/${documentId}/content`)
      .set(ownerA)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.alloc(16, 1));
    expect(invalidSignature.status).toBe(400);
    expect(invalidSignature.body.error).toBe('DOCUMENT_SIGNATURE_MISMATCH');
  });

  it('returns truthful zero usage metrics before any gateway requests', async () => {
    const response = await request(testApp()).get('/v1/usage/summary').set(ownerA);
    expect(response.status).toBe(200);
    expect(response.body.data.summary).toEqual({
      totalRequests: 0,
      totalTokens: 0,
      activeWorkflows: 0,
      processedDocuments: 0,
      successRate: 0,
      avgLatencyMs: 0,
      errorRate: 0,
    });
    expect(response.body.data.providers).toEqual([]);
  });
});
