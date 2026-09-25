import { describe, expect, it, vi } from 'vitest';
import { GeminiProviderAdapter } from './provider-adapter.js';
import type { ProviderConnection } from './types.js';

const provider: ProviderConnection = {
  id: 'gemini-provider',
  workspaceId: 'workspace-1',
  providerType: 'gemini',
  name: 'Google Gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  modelDefault: 'gemini-3.8-flash',
  secretCiphertext: 'encrypted',
  config: {},
  status: 'active',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('GeminiProviderAdapter', () => {
  it('maps Wasl chat messages to Gemini generateContent and returns normalized usage', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'gemini-secret' });
      const body = JSON.parse(String(init?.body));
      expect(body.systemInstruction.parts[0].text).toBe('أجب بالعربية');
      expect(body.contents).toEqual([
        { role: 'user', parts: [{ text: 'مرحبا' }] },
        { role: 'model', parts: [{ text: 'أهلا' }] },
        { role: 'user', parts: [{ text: 'كيف حالك؟' }] },
      ]);
      return new Response(JSON.stringify({
        modelVersion: 'gemini-3.8-flash',
        candidates: [{ content: { parts: [{ text: 'بخير، شكراً.' }] } }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const adapter = new GeminiProviderAdapter(fetchImpl as typeof fetch);
    const result = await adapter.complete({
      model: 'gemini-3.8-flash',
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'أجب بالعربية' },
        { role: 'user', content: 'مرحبا' },
        { role: 'assistant', content: 'أهلا' },
        { role: 'user', content: 'كيف حالك؟' },
      ],
    }, provider, 'gemini-secret');

    expect(result).toEqual({
      model: 'gemini-3.8-flash',
      content: 'بخير، شكراً.',
      promptTokens: 12,
      completionTokens: 6,
    });
  });

  it('returns only a safe HTTP status code on Gemini rejection', async () => {
    const adapter = new GeminiProviderAdapter(
      (async () => new Response('sensitive provider detail', { status: 429 })) as typeof fetch,
    );
    await expect(adapter.complete(
      { messages: [{ role: 'user', content: 'hi' }] },
      provider,
      'gemini-secret',
    )).rejects.toThrow('PROVIDER_HTTP_429');
  });
});
