import { describe, expect, it } from 'vitest';
import { OpenAICompatibleProviderAdapter } from '../apps/arabic-ai-ipaas-api/src/provider-adapter.js';

const apiKey = process.env.LIVE_PROVIDER_API_KEY;
const baseUrl = process.env.LIVE_PROVIDER_BASE_URL;
const model = process.env.LIVE_PROVIDER_MODEL;
const describeLive = apiKey && baseUrl && model ? describe : describe.skip;

describeLive('Arabic AI iPaaS controlled live-provider proof', () => {
  it('sends an Arabic prompt to a real OpenAI-compatible provider and receives a non-empty answer', async () => {
    const adapter = new OpenAICompatibleProviderAdapter();

    const result = await adapter.complete(
      {
        model,
        messages: [
          {
            role: 'user',
            content: 'أجب بجملة عربية قصيرة تؤكد أن الاتصال الحقيقي بمزود الذكاء الاصطناعي يعمل.',
          },
        ],
        temperature: 0,
      },
      {
        id: 'live-provider-proof',
        workspaceId: 'factory-live-proof',
        providerType: 'openai-compatible',
        name: 'Controlled live provider',
        baseUrl,
        modelDefault: model,
        secretCiphertext: 'not-used-by-adapter-proof',
        config: {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      apiKey,
    );

    expect(result.content.trim().length).toBeGreaterThan(0);
    expect(result.model.length).toBeGreaterThan(0);

    console.log(JSON.stringify({
      proof: 'LIVE_PROVIDER_PASS',
      model: result.model,
      responseCharacters: result.content.length,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    }));
  }, 30_000);
});
