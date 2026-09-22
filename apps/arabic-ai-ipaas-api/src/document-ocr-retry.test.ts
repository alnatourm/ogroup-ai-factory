import { describe, expect, it, vi } from 'vitest';
import { GeminiDocumentOcrAdapter } from './document-ocr-adapter.js';
import type { ProviderConnection } from './types.js';

function provider(): ProviderConnection {
  return {
    id: 'provider-gemini',
    workspaceId: 'workspace-a',
    providerType: 'gemini',
    name: 'Gemini OCR',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    modelDefault: 'gemini-document-model',
    secretCiphertext: 'encrypted',
    config: { documentOcrEnabled: true },
    status: 'active',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function successResponse(): Response {
  return new Response(JSON.stringify({
    output_text: JSON.stringify({
      markdown: '# نتيجة حقيقية',
      language: 'ar',
      pageCount: 1,
      textDirection: 'rtl',
      documentType: 'invoice',
      invoice: {
        supplierName: 'شركة المثال',
        supplierTaxId: '123456789',
        invoiceNumber: 'INV-1001',
        invoiceDate: '2026-09-22',
        dueDate: null,
        currency: 'JOD',
        subtotal: '100.00',
        taxTotal: '16.00',
        grandTotal: '116.00',
        confidence: {
          supplierName: 0.98,
          supplierTaxId: 0.97,
          invoiceNumber: 0.99,
          invoiceDate: 0.95,
          dueDate: null,
          currency: 0.96,
          subtotal: 0.97,
          taxTotal: 0.97,
          grandTotal: 0.99,
        },
        lineItems: [{
          description: 'خدمة',
          quantity: '1',
          unitPrice: '100.00',
          taxAmount: '16.00',
          lineTotal: '116.00',
        }],
      },
      entities: [],
    }),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('Gemini OCR transient retries', () => {
  it('retries a temporary 503 with bounded backoff and returns only the real provider result', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: 503, status: 'UNAVAILABLE', message: 'Temporary high demand' },
      }), { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '0' } }))
      .mockResolvedValueOnce(successResponse());
    const sleep = vi.fn(async () => undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const adapter = new GeminiDocumentOcrAdapter(fetchMock, sleep);

    const result = await adapter.extract({
      content: Buffer.from('%PDF-1.7'),
      mediaType: 'application/pdf',
      filename: 'invoice.pdf',
      provider: provider(),
      secret: 'provider-secret',
    });

    expect(result.markdown).toBe('# نتيجة حقيقية');
    expect(result.structuredJson.schemaVersion).toBe('document-extraction-json-v2');
    expect(result.structuredJson.invoice?.invoiceNumber).toBe('INV-1001');
    expect(result.structuredJson.invoice?.validationWarnings).toEqual([]);
    expect(result.structuredJson.invoice?.reviewRequired).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(String(warning.mock.calls[0]?.[0])).toContain('ocr.provider_retry');
    expect(String(warning.mock.calls[0]?.[0])).not.toContain('provider-secret');
    warning.mockRestore();
  });

  it('honors Gemini retry timing from a 429 response and succeeds without fabricating output', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Rate limit exceeded. Please retry in 34s.',
        },
      }), { status: 429, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(successResponse());
    const sleep = vi.fn(async () => undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const adapter = new GeminiDocumentOcrAdapter(fetchMock, sleep);

    const result = await adapter.extract({
      content: Buffer.from('%PDF-1.7'),
      mediaType: 'application/pdf',
      filename: 'invoice.pdf',
      provider: provider(),
      secret: 'provider-secret',
    });

    expect(result.markdown).toBe('# نتيجة حقيقية');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(34_000);
    expect(String(warning.mock.calls[0]?.[0])).toContain('"delayMs":34000');
    expect(String(warning.mock.calls[0]?.[0])).not.toContain('provider-secret');
    warning.mockRestore();
  });

  it('does not retry non-transient client errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Invalid request' },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    const sleep = vi.fn(async () => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const adapter = new GeminiDocumentOcrAdapter(fetchMock, sleep);

    await expect(adapter.extract({
      content: Buffer.from('%PDF-1.7'),
      mediaType: 'application/pdf',
      filename: 'invoice.pdf',
      provider: provider(),
      secret: 'provider-secret',
    })).rejects.toThrow('OCR_PROVIDER_HTTP_400:INVALID_ARGUMENT');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
