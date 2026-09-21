import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { GeminiDocumentOcrAdapter, type DocumentOcrAdapter } from './document-ocr-adapter.js';
import { MemoryAuditRepository } from './audit-service.js';
import type { ProviderConnection } from './types.js';

const owner = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'owner-a',
  'x-workspace-role': 'workspace_owner',
};

function geminiProvider(): ProviderConnection {
  return {
    id: 'provider-gemini',
    workspaceId: 'workspace-a',
    providerType: 'gemini',
    name: 'Gemini document worker',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    modelDefault: 'gemini-document-model',
    secretCiphertext: 'not-used-in-adapter-unit-test',
    config: { documentOcrEnabled: true },
    status: 'active',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

describe('document OCR adapter', () => {
  it('sends document bytes inline without putting the secret in the URL and validates structured output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      steps: [{
        content: [{
          type: 'text',
          text: JSON.stringify({
            markdown: '# فاتورة\n\nالمجموع: 100 ريال',
            language: 'ar',
            pageCount: 1,
            textDirection: 'rtl',
            entities: [{ label: 'total', value: '100 ريال', confidence: 0.98 }],
          }),
        }],
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new GeminiDocumentOcrAdapter(fetchMock);

    const result = await adapter.extract({
      content: Buffer.from('%PDF-1.7 Arabic invoice'),
      mediaType: 'application/pdf',
      filename: 'invoice.pdf',
      provider: geminiProvider(),
      secret: 'test-secret',
    });

    expect(result.language).toBe('ar');
    expect(result.structuredJson.textDirection).toBe('rtl');
    expect(result.structuredJson.entities[0]?.value).toBe('100 ريال');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.hostname).toBe('generativelanguage.googleapis.com');
    expect(url.pathname).toBe('/v1beta/interactions');
    expect(url.toString()).not.toContain('test-secret');
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe('test-secret');
    const requestBody = JSON.parse(String(init.body)) as {
      model: string;
      input: Array<{ type: string; data?: string; mime_type?: string }>;
      response_format: { type: string; mime_type: string; schema: unknown };
    };
    expect(requestBody.model).toBe('gemini-document-model');
    expect(requestBody.input[0]).toEqual({
      type: 'document',
      data: Buffer.from('%PDF-1.7 Arabic invoice').toString('base64'),
      mime_type: 'application/pdf',
    });
    expect(requestBody.response_format.type).toBe('text');
    expect(requestBody.response_format.mime_type).toBe('application/json');
    expect(requestBody.response_format.schema).toBeTruthy();
  });

  it('rejects provider responses that do not satisfy the extraction contract', async () => {
    const adapter = new GeminiDocumentOcrAdapter(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({
        steps: [{ content: [{ type: 'text', text: '{"markdown":"invented"}' }] }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    );

    await expect(adapter.extract({
      content: Buffer.from('%PDF-1.7'),
      mediaType: 'application/pdf',
      filename: 'invoice.pdf',
      provider: geminiProvider(),
      secret: 'test-secret',
    })).rejects.toThrow('OCR_PROVIDER_INVALID_RESPONSE');
  });

  it('persists a real adapter result and keeps extracted customer content out of audit metadata', async () => {
    const auditRepository = new MemoryAuditRepository();
    const adapter: DocumentOcrAdapter = {
      supports: (provider) => provider.providerType === 'gemini' && provider.config.documentOcrEnabled === true,
      extract: async () => ({
        engineVersion: 'test-real-adapter-v1',
        markdown: '# سري للعميل',
        structuredJson: {
          schemaVersion: 'document-extraction-json-v1',
          textDirection: 'rtl',
          entities: [{ label: 'invoice_number', value: 'INV-100', confidence: 1 }],
        },
        language: 'ar',
        pageCount: 1,
      }),
    };
    const app = createApp({
      masterKey: 'ocr-route-master-key',
      allowInsecureTestHeaders: true,
      documentOcrAdapter: adapter,
      auditRepository,
    });
    const provider = await request(app)
      .post('/v1/provider-connections')
      .set(owner)
      .send({
        providerType: 'gemini',
        name: 'Gemini OCR',
        apiKey: 'provider-secret',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
        modelDefault: 'gemini-document-model',
        config: { documentOcrEnabled: true },
      });
    expect(provider.status).toBe(201);

    const pdf = Buffer.from('%PDF-1.7 customer document');
    const document = await request(app)
      .post('/v1/documents')
      .set(owner)
      .send({ filename: 'invoice.pdf', mediaType: 'application/pdf', sizeBytes: pdf.length });
    const documentId = document.body.data.id as string;
    const uploaded = await request(app)
      .put(`/v1/documents/${documentId}/content`)
      .set(owner)
      .set('Content-Type', 'application/pdf')
      .send(pdf);
    expect(uploaded.status).toBe(201);

    const extracted = await request(app)
      .post(`/v1/documents/${documentId}/extractions`)
      .set(owner)
      .send({});

    expect(extracted.status).toBe(200);
    expect(extracted.body.workerState).toBe('configured');
    expect(extracted.body.data.document.status).toBe('ready');
    expect(extracted.body.data.extraction.status).toBe('ready');
    expect(extracted.body.data.extraction.markdown).toBe('# سري للعميل');
    expect(extracted.body.data.extraction.structuredJson.textDirection).toBe('rtl');

    const auditJson = JSON.stringify(await auditRepository.list('workspace-a'));
    expect(auditJson).toContain('document.extraction_completed');
    expect(auditJson).not.toContain('سري للعميل');
    expect(auditJson).not.toContain('INV-100');
    expect(auditJson).not.toContain('provider-secret');
  });
});
