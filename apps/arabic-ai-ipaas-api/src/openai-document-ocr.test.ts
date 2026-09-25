import { describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleDocumentOcrAdapter } from './document-ocr-adapter.js';
import type { ProviderConnection } from './types.js';

const provider: ProviderConnection = {
  id: 'groq-qwen', workspaceId: 'w1', providerType: 'openai-compatible',
  name: 'Groq Qwen', baseUrl: 'https://api.groq.com/openai/v1',
  modelDefault: 'qwen/qwen3.8-27b', secretCiphertext: 'encrypted',
  config: { documentOcrEnabled: true }, status: 'active',
  createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
};

describe('OpenAICompatibleDocumentOcrAdapter', () => {
  it('uses vision image_url data input for PNG/JPEG document images', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.messages[0].content[1].type).toBe('image_url');
      expect(body.messages[0].content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          markdown: 'PO 123', language: 'en', pageCount: 1, textDirection: 'ltr',
          documentType: 'other', invoice: null, purchaseOrder: null, entities: [],
        }) } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const adapter = new OpenAICompatibleDocumentOcrAdapter(fetchImpl as typeof fetch);
    const result = await adapter.extract({
      content: Buffer.from('image'), mediaType: 'image/png', filename: 'po.png',
      provider, secret: 'secret',
    });
    expect(result.markdown).toBe('PO 123');
  });

  it('refuses PDF rather than sending an unsupported file shape to a vision endpoint', async () => {
    const adapter = new OpenAICompatibleDocumentOcrAdapter(vi.fn() as unknown as typeof fetch);
    await expect(adapter.extract({
      content: Buffer.from('pdf'), mediaType: 'application/pdf', filename: 'po.pdf',
      provider, secret: 'secret',
    })).rejects.toThrow('OCR_PROVIDER_MEDIA_TYPE_UNSUPPORTED');
  });
});
