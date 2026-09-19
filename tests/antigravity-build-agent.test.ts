import { describe, expect, it, vi } from 'vitest';
import { AntigravityBuildAgent } from '../modules/build-agents/antigravity.js';

describe('AntigravityBuildAgent', () => {
  it('starts a governed background build without exposing the API key in the body', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(JSON.stringify(body)).not.toContain('test-secret');
      expect(body.agent).toBe('antigravity-preview-09-2026');
      expect(body.background).toBe(true);
      expect(body.agent_config).toEqual({
        type: 'antigravity',
        max_total_tokens: 50000,
      });

      return new Response(JSON.stringify({
        id: 'interaction-1',
        environment_id: 'environment-1',
        status: 'in_progress',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const agent = new AntigravityBuildAgent({
      apiKey: 'test-secret',
      fetchImpl: fetchMock as typeof fetch,
    });

    const result = await agent.start({
      taskId: 'frontend-001',
      productId: 'arabic-ai-ipaas',
      instructions: 'Build the approved frontend.',
    });

    expect(result).toEqual({
      provider: 'google-antigravity',
      interactionId: 'interaction-1',
      environmentId: 'environment-1',
      status: 'in_progress',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-secret',
        }),
      }),
    );
  });

  it('polls a build interaction to completion', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: 'interaction-2',
      environment_id: 'environment-2',
      status: 'completed',
      output_text: 'Build finished',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const agent = new AntigravityBuildAgent({
      apiKey: 'test-secret',
      fetchImpl: fetchMock as typeof fetch,
    });

    const result = await agent.get('interaction-2');

    expect(result.status).toBe('completed');
    expect(result.outputText).toBe('Build finished');
  });

  it('fails closed when no API key is configured', () => {
    expect(() => new AntigravityBuildAgent({ apiKey: '' }))
      .toThrow('ANTIGRAVITY_API_KEY_REQUIRED');
  });
});
