import { describe, expect, it } from 'vitest';
import { OpenAICompatibleProviderAdapter } from './provider-adapter.js';
import type { ProviderConnection } from './types.js';

const provider: ProviderConnection = {
  id: 'provider-1',
  workspaceId: 'workspace-1',
  providerType: 'openai-compatible',
  name: 'Groq Qwen',
  baseUrl: 'https://api.groq.com/openai/v1',
  modelDefault: 'qwen/qwen3.8-27b',
  secretCiphertext: 'encrypted',
  config: {},
  status: 'active',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('OpenAICompatibleProviderAdapter safe diagnostics', () => {
  it('preserves only upstream HTTP status on provider rejection', async () => {
    const fetchImpl = async () => new Response(
      JSON.stringify({ error: { message: 'sensitive upstream detail must not escape' } }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
    const adapter = new OpenAICompatibleProviderAdapter(fetchImpl as typeof fetch);

    await expect(adapter.complete(
      { model: provider.modelDefault, messages: [{ role: 'user', content: 'hi' }] },
      provider,
      'secret-value',
    )).rejects.toThrow('PROVIDER_HTTP_400');
  });
});
