import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArabicAiIpaasClient } from '../api/client';

describe('production QC API contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads truthful usage values from the live API without synthesizing metrics', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        summary: {
          totalRequests: 0,
          totalTokens: 0,
          activeWorkflows: 0,
          processedDocuments: 0,
          successRate: 0,
          avgLatencyMs: 0,
          errorRate: 0,
        },
        providers: [],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await ArabicAiIpaasClient.getUsageSummary();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/v1\/usage\/summary$/), expect.objectContaining({
      credentials: 'same-origin',
    }));
    expect(result.summary.totalRequests).toBe(0);
    expect(result.providers).toEqual([]);
  });

  it('maps backend workflow run states without placeholder history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        id: 'run-1',
        workflowId: 'workflow-1',
        triggerType: 'manual',
        status: 'succeeded',
        durationMs: 12,
        startedAt: '2026-09-20T00:00:00.000Z',
        stepRuns: [{
          id: 'step-run-1',
          stepKey: 'mask',
          stepType: 'pii_masking',
          status: 'succeeded',
          durationMs: 5,
          output: { maskedCount: 1 },
        }],
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const runs = await ArabicAiIpaasClient.listWorkflowRuns();

    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe('success');
    expect(runs[0]?.completedSteps).toBe(1);
    expect(runs[0]?.stepRuns[0]?.outputPayload).toEqual({ maskedCount: 1 });
  });

  it('uploads real document bytes before reporting an unconfigured OCR worker truthfully', async () => {
    const bytes = new Uint8Array(512);
    bytes.set(new TextEncoder().encode('%PDF-1.7'));
    const file = new File([bytes], 'invoice.pdf', { type: 'application/pdf' });
    const document = {
      id: 'document-1',
      workspaceId: 'workspace-1',
      filename: 'invoice.pdf',
      mediaType: 'application/pdf',
      objectKey: 'documents/workspace-1/document-1/invoice.pdf',
      sizeBytes: file.size,
      status: 'processing',
      createdAt: '2026-09-20T00:00:00.000Z',
    };
    const upload = {
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      mediaType: 'application/pdf',
      sizeBytes: file.size,
      sha256: 'a'.repeat(64),
      uploadedAt: '2026-09-20T00:00:01.000Z',
    };
    const extraction = {
      id: 'extraction-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      schemaVersion: 'document-extraction-json-v1',
      status: 'processing',
      errorMessage: 'OCR_ENGINE_NOT_CONFIGURED',
      createdAt: '2026-09-20T00:00:02.000Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { ...document, status: 'uploaded' },
        uploadConfigured: true,
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: upload,
        uploadConfigured: true,
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { document, extraction, configured: false },
        workerState: 'not_configured',
      }), { status: 202, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await ArabicAiIpaasClient.processDocument(file);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/\/v1\/documents\/document-1\/content$/);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      method: 'PUT',
      body: file,
      credentials: 'same-origin',
    }));
    expect(result.uploadConfigured).toBe(true);
    expect(result.upload.sha256).toBe('a'.repeat(64));
    expect(result.workerState).toBe('not_configured');
    expect(result.extraction.status).toBe('processing');
  });

});
