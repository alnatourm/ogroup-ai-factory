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

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/usage/summary', expect.objectContaining({
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
});
