import { describe, expect, it } from 'vitest';
import { isRetryableProviderError, providersForCapability } from './provider-router.js';
import type { ProviderConnection } from './types.js';

function provider(id: string, providerType: ProviderConnection['providerType'], config: Record<string, unknown> = {}): ProviderConnection {
  return {
    id, workspaceId: 'w1', providerType, name: id, secretCiphertext: 'x',
    config, status: 'active', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
  };
}

describe('capability provider router', () => {
  it('keeps preferred chat provider first and preserves capable fallback providers', () => {
    const gemini = provider('gemini', 'gemini');
    const groq = provider('groq', 'openai-compatible');
    expect(providersForCapability([gemini, groq], 'chat', 'gemini').map((item) => item.id))
      .toEqual(['gemini', 'groq']);
  });

  it('only treats OpenAI-compatible providers as document capable when explicitly enabled', () => {
    const gemini = provider('gemini', 'gemini', { documentOcrEnabled: true });
    const groqChatOnly = provider('groq-chat', 'openai-compatible');
    const groqDocument = provider('groq-doc', 'openai-compatible', { documentOcrEnabled: true });
    expect(providersForCapability([gemini, groqChatOnly, groqDocument], 'document-extraction').map((item) => item.id))
      .toEqual(['gemini', 'groq-doc']);
  });

  it('fails over only on transient/provider availability failures', () => {
    expect(isRetryableProviderError(new Error('PROVIDER_HTTP_429'))).toBe(true);
    expect(isRetryableProviderError(new Error('PROVIDER_HTTP_503'))).toBe(true);
    expect(isRetryableProviderError(new Error('OCR_PROVIDER_DAILY_QUOTA_EXHAUSTED'))).toBe(true);
    expect(isRetryableProviderError(new Error('PROVIDER_HTTP_401'))).toBe(false);
    expect(isRetryableProviderError(new Error('PROVIDER_INVALID_RESPONSE'))).toBe(false);
  });
});
