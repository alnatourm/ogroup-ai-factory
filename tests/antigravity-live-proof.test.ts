import { describe, expect, it } from 'vitest';
import { AntigravityBuildAgent } from '../modules/build-agents/antigravity.js';

const apiKey = process.env.ANTIGRAVITY_API_KEY;
const live = apiKey ? describe : describe.skip;

live('Antigravity controlled live proof', () => {
  it('starts and retrieves a real background interaction', async () => {
    const agent = new AntigravityBuildAgent({ apiKey: apiKey! });

    const started = await agent.start({
      taskId: 'antigravity-live-proof',
      productId: 'ogroup-ai-factory',
      instructions: 'Create a file named proof.txt containing exactly: ANTIGRAVITY_CONNECTED',
      maxTotalTokens: 5000,
    });

    expect(started.interactionId.length).toBeGreaterThan(0);

    let current = started;
    const deadline = Date.now() + 180_000;

    while (current.status === 'queued' || current.status === 'in_progress') {
      if (Date.now() > deadline) {
        throw new Error('ANTIGRAVITY_LIVE_PROOF_TIMEOUT');
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      current = await agent.get(started.interactionId);
    }

    expect(current.status).toBe('completed');

    console.log(JSON.stringify({
      proof: 'ANTIGRAVITY_LIVE_PASS',
      interactionId: current.interactionId,
      status: current.status,
      environmentIdPresent: Boolean(current.environmentId),
    }));
  }, 210_000);
});
