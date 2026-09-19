import { describe, expect, it, vi } from 'vitest';
import { AntigravityBuildAgent } from '../modules/build-agents/antigravity.js';

describe('AntigravityBuildAgent', () => {
  it('starts a governed background build through the official Google GenAI interactions client', async () => {
    const create = vi.fn(async (input: Record<string, unknown>) => {
      expect(input.agent).toBe('antigravity-preview-09-2026');
      expect(input.background).toBe(true);
      expect(input.agent_config).toEqual({
        type: 'antigravity',
        max_total_tokens: 50000,
      });

      return {
        id: 'interaction-1',
        environment_id: 'environment-1',
        status: 'in_progress',
      };
    });

    const get = vi.fn();

    const agent = new AntigravityBuildAgent({
      apiKey: 'test-secret',
      client: { create, get },
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
    expect(create).toHaveBeenCalledOnce();
  });

  it('polls a build interaction to completion', async () => {
    const create = vi.fn();
    const get = vi.fn(async (interactionId: string) => {
      expect(interactionId).toBe('interaction-2');
      return {
        id: 'interaction-2',
        environment_id: 'environment-2',
        status: 'completed',
        output_text: 'Build finished',
      };
    });

    const agent = new AntigravityBuildAgent({
      apiKey: 'test-secret',
      client: { create, get },
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
