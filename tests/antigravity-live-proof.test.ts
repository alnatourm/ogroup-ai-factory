import { describe, expect, it } from 'vitest';
import { AntigravityBuildAgent } from '../modules/build-agents/antigravity.js';

const apiKey = process.env.ANTIGRAVITY_API_KEY;
const live = apiKey ? describe : describe.skip;

live('Antigravity controlled live proof', () => {
  it('executes a real Antigravity task end-to-end', async () => {
    const agent = new AntigravityBuildAgent({ apiKey: apiKey! });

    const result = await agent.start({
      taskId: 'antigravity-live-proof',
      productId: 'ogroup-ai-factory',
      instructions: 'Create a file named proof.txt containing exactly: ANTIGRAVITY_CONNECTED. Then reply with exactly ANTIGRAVITY_CONNECTED.',
      maxTotalTokens: 50000,
      executionMode: 'foreground',
    });

    expect(result.interactionId.length).toBeGreaterThan(0);
    expect(result.status).toBe('completed');
    expect(result.outputText?.trim()).toContain('ANTIGRAVITY_CONNECTED');

    console.log(JSON.stringify({
      proof: 'ANTIGRAVITY_LIVE_PASS',
      interactionIdPresent: Boolean(result.interactionId),
      status: result.status,
      environmentIdPresent: Boolean(result.environmentId),
      outputVerified: result.outputText?.includes('ANTIGRAVITY_CONNECTED') ?? false,
    }));
  }, 210_000);
});
