import type { AcceptedMediaType, ProviderConnection } from './types.js';
import { parseStructuredInvoice, type StructuredInvoice } from './structured-invoice.js';
import { parseStructuredPurchaseOrder, type StructuredPurchaseOrder } from './structured-purchase-order.js';

export const MAX_INLINE_OCR_BYTES = 10 * 1024 * 1024;
const MAX_OCR_ATTEMPTS = 4;
const MAX_PROVIDER_RETRY_DELAY_MS = 60_000;

type Sleep = (delayMs: number) => Promise<void>;

function isRetryableProviderStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function getRetryDelayMs(response: Response, attempt: number): Promise<number> {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const retryAfterSeconds = Number(retryAfter);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      return Math.min(retryAfterSeconds * 1000, MAX_PROVIDER_RETRY_DELAY_MS);
    }
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 0), MAX_PROVIDER_RETRY_DELAY_MS);
    }
  }

  if (response.status === 429) {
    try {
      const body = JSON.parse(await response.clone().text()) as {
        error?: { message?: unknown };
      };
      const message = typeof body.error?.message === 'string' ? body.error.message : '';
      const retryMatch = message.match(/retry\s+in\s+(\d+(?:\.\d+)?)s/i);
      const retrySeconds = retryMatch?.[1] ? Number(retryMatch[1]) : Number.NaN;
      if (Number.isFinite(retrySeconds) && retrySeconds >= 0) {
        return Math.min(Math.ceil(retrySeconds * 1000), MAX_PROVIDER_RETRY_DELAY_MS);
      }
    } catch {
      // Fall through to bounded exponential backoff.
    }
  }

  const exponentialDelay = 1_000 * (2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(exponentialDelay + jitter, 5_000);
}

export type DocumentOcrEntity = {
  label: string;
  value: string;
  confidence: number;
};

export type DocumentOcrResult = {
  engineVersion: string;
  markdown: string;
  structuredJson: {
    schemaVersion: 'document-extraction-json-v2';
    textDirection: 'rtl' | 'ltr' | 'mixed';
    documentType: 'invoice' | 'purchase_order' | 'other';
    invoice: StructuredInvoice | null;
    purchaseOrder?: StructuredPurchaseOrder | null;
    entities: DocumentOcrEntity[];
  };
  language: string;
  pageCount: number;
};

export interface DocumentOcrAdapter {
  supports(provider: ProviderConnection): boolean;
  extract(input: {
    content: Buffer;
    mediaType: AcceptedMediaType;
    filename: string;
    provider: ProviderConnection;
    secret: string;
  }): Promise<DocumentOcrResult>;
}

type FetchLike = typeof fetch;

function sanitizeProviderDiagnostic(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value)
    .replace(/AIza[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(new RegExp('[A-Za-z0-9+/_=-]{64,}', 'g'), '[redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 300);
}

async function isDailyQuotaExhausted(response: Response): Promise<boolean> {
  if (response.status !== 429) return false;
  try {
    const body = JSON.parse(await response.clone().text()) as {
      error?: { message?: unknown };
    };
    const message = typeof body.error?.message === 'string' ? body.error.message : '';
    return /requests?\s+per\s+day|daily\s+(?:request\s+)?limit/i.test(message);
  } catch {
    return false;
  }
}

async function throwProviderHttpError(
  response: Response,
  model: string,
  stableCode?: string,
): Promise<never> {
  let providerCode: string | undefined;
  let providerStatus: string | undefined;
  let providerMessage: string | undefined;
  try {
    const body = JSON.parse(await response.text()) as {
      error?: { code?: unknown; status?: unknown; message?: unknown };
    };
    providerCode = sanitizeProviderDiagnostic(body.error?.code);
    providerStatus = sanitizeProviderDiagnostic(body.error?.status);
    providerMessage = sanitizeProviderDiagnostic(body.error?.message);
  } catch {
    // Provider returned a non-JSON error. Keep diagnostics metadata-only.
  }
  console.error(JSON.stringify({
    event: 'ocr.provider_http_error',
    httpStatus: response.status,
    model,
    providerCode,
    providerStatus,
    providerMessage,
  }));
  throw new Error(stableCode ?? `OCR_PROVIDER_HTTP_${response.status}:${providerStatus ?? 'UNKNOWN'}`);
}

function requireModel(provider: ProviderConnection): string {
  const configured = provider.config.ocrModel;
  const model = typeof configured === 'string' && configured.trim()
    ? configured.trim()
    : provider.modelDefault?.trim();
  if (!model) throw new Error('OCR_MODEL_NOT_CONFIGURED');
  if (!/^[A-Za-z0-9._/-]+$/.test(model)) throw new Error('INVALID_OCR_MODEL');
  return model;
}

function parseProviderJsonText(text: string): unknown {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try next safe candidate */ }
  }
  throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
}

function normalizeOpenAiDocumentResult(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const r = { ...(value as Record<string, unknown>) };
  const documentTypeAliases: Record<string, 'invoice' | 'purchase_order' | 'other'> = {
    invoice: 'invoice',
    purchase_order: 'purchase_order',
    'purchase order': 'purchase_order',
    purchaseorder: 'purchase_order',
    po: 'purchase_order',
    other: 'other',
  };
  if (typeof r.documentType === 'string') {
    r.documentType = documentTypeAliases[r.documentType.trim().toLowerCase()] ?? r.documentType;
  }
  if (typeof r.markdown !== 'string' || !r.markdown.trim()) {
    const fallback = typeof r.text === 'string' ? r.text : typeof r.rawText === 'string' ? r.rawText : undefined;
    if (fallback?.trim()) r.markdown = fallback.trim();
  }
  if (typeof r.language !== 'string' || !r.language.trim()) r.language = 'und';
  if (!Number.isInteger(r.pageCount)) r.pageCount = 1;
  if (!['rtl', 'ltr', 'mixed'].includes(r.textDirection as string)) r.textDirection = 'mixed';
  if (!Array.isArray(r.entities)) r.entities = [];
  if (r.documentType === 'invoice') {
    r.purchaseOrder = null;
  } else if (r.documentType === 'purchase_order') {
    r.invoice = null;
  } else if (r.documentType === 'other') {
    r.invoice = null;
    r.purchaseOrder = null;
  }
  return r;
}

export function parseDocumentOcrResult(value: unknown, engineVersion: string): DocumentOcrResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  const record = value as Record<string, unknown>;
  if (typeof record.markdown !== 'string' || record.markdown.length === 0 || record.markdown.length > 2_000_000) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  if (typeof record.language !== 'string' || record.language.length === 0 || record.language.length > 32) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  if (!Number.isInteger(record.pageCount) || (record.pageCount as number) < 1 || (record.pageCount as number) > 1000) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  if (!['rtl', 'ltr', 'mixed'].includes(record.textDirection as string)) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  if (!Array.isArray(record.entities) || record.entities.length > 500) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }

  const entities = record.entities.map((entity) => {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
      throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    }
    const item = entity as Record<string, unknown>;
    if (
      typeof item.label !== 'string' ||
      item.label.length === 0 ||
      item.label.length > 128 ||
      typeof item.value !== 'string' ||
      item.value.length > 10_000 ||
      typeof item.confidence !== 'number' ||
      !Number.isFinite(item.confidence) ||
      item.confidence < 0 ||
      item.confidence > 1
    ) {
      throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    }
    return { label: item.label, value: item.value, confidence: item.confidence };
  });

  if (!['invoice', 'purchase_order', 'other'].includes(record.documentType as string)) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  const documentType = record.documentType as 'invoice' | 'purchase_order' | 'other';
  if (documentType !== 'invoice' && record.invoice !== null) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  const invoice = documentType === 'invoice' ? parseStructuredInvoice(record.invoice) : null;
  if (documentType !== 'purchase_order' && record.purchaseOrder !== null && record.purchaseOrder !== undefined) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  const purchaseOrder = documentType === 'purchase_order'
    ? parseStructuredPurchaseOrder(record.purchaseOrder)
    : null;

  return {
    engineVersion,
    markdown: record.markdown,
    structuredJson: {
      schemaVersion: 'document-extraction-json-v2',
      textDirection: record.textDirection as 'rtl' | 'ltr' | 'mixed',
      documentType,
      invoice,
      purchaseOrder,
      entities,
    },
    language: record.language,
    pageCount: record.pageCount as number,
  };
}

export class OpenAICompatibleDocumentOcrAdapter implements DocumentOcrAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  supports(provider: ProviderConnection): boolean {
    return provider.providerType === 'openai-compatible' && provider.config.documentOcrEnabled === true;
  }

  async extract(input: {
    content: Buffer;
    mediaType: AcceptedMediaType;
    filename: string;
    provider: ProviderConnection;
    secret: string;
  }): Promise<DocumentOcrResult> {
    if (!this.supports(input.provider)) throw new Error('OCR_PROVIDER_NOT_ENABLED');
    if (input.content.length > MAX_INLINE_OCR_BYTES) throw new Error('OCR_DOCUMENT_TOO_LARGE_FOR_INLINE');
    const model = requireModel(input.provider);
    const baseUrl = input.provider.baseUrl ?? 'https://api.openai.com/v1';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = new URL('chat/completions', normalizedBase);
    if (url.protocol !== 'https:') throw new Error('PROVIDER_BASE_URL_MUST_USE_HTTPS');

    const schemaPrompt = [
      'Extract the attached document faithfully and return ONLY one JSON object with no markdown fence or commentary.',
      'Preserve Arabic reading order. Never guess missing values.',
      'Top-level fields exactly: markdown, language, pageCount, textDirection, documentType, invoice, purchaseOrder, entities.',
      'documentType must be invoice, purchase_order, or other.',
      'markdown must be non-empty. language must be a short language code. pageCount must be an integer. textDirection must be rtl, ltr, or mixed.',
      'For an invoice, purchaseOrder must be null. For a purchase order, invoice must be null. For other, both must be null.',
      'Invoice fields exactly: supplierName, supplierTaxId, invoiceNumber, invoiceDate, dueDate, currency, subtotal, taxTotal, grandTotal, confidence, lineItems.',
      'Purchase order fields exactly: supplierName, supplierTaxId, purchaseOrderNumber, orderDate, expectedDeliveryDate, currency, subtotal, taxTotal, grandTotal, confidence, lineItems.',
      'Every confidence object must contain all corresponding scalar field names, each number 0 to 1 or null.',
      'Invoice lineItems: description, quantity, unitPrice, taxAmount, lineTotal. Purchase-order lineItems: description, quantity, unitPrice, lineTotal.',
      'All numeric amounts and quantities must be JSON strings such as "12.50", never JSON numbers. Missing values must be null.',
      'Dates must be YYYY-MM-DD strings or null. Currency must be a three-letter uppercase code or null.',
      'entities must be an array of objects with label, value, confidence.',
    ].join(' ');

    if (input.mediaType !== 'image/png' && input.mediaType !== 'image/jpeg') {
      throw new Error('OCR_PROVIDER_MEDIA_TYPE_UNSUPPORTED');
    }
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${input.secret}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: schemaPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.mediaType};base64,${input.content.toString('base64')}`,
              },
            },
          ],
        }],
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });
    if (!response.ok) throw new Error(`OCR_PROVIDER_HTTP_${response.status}`);
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    const parsed = normalizeOpenAiDocumentResult(parseProviderJsonText(text));
    return parseDocumentOcrResult(parsed, `openai-compatible-document-json-v2:${model}`);
  }
}

export class GeminiDocumentOcrAdapter implements DocumentOcrAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly sleep: Sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
  ) {}

  supports(provider: ProviderConnection): boolean {
    if (provider.providerType !== 'gemini' || provider.config.documentOcrEnabled !== true) return false;
    if (!provider.baseUrl) return true;
    try {
      return new URL(provider.baseUrl).hostname.toLowerCase() === 'generativelanguage.googleapis.com';
    } catch {
      return false;
    }
  }

  async extract(input: {
    content: Buffer;
    mediaType: AcceptedMediaType;
    filename: string;
    provider: ProviderConnection;
    secret: string;
  }): Promise<DocumentOcrResult> {
    if (!this.supports(input.provider)) throw new Error('OCR_PROVIDER_NOT_ENABLED');
    if (input.content.length > MAX_INLINE_OCR_BYTES) throw new Error('OCR_DOCUMENT_TOO_LARGE_FOR_INLINE');
    const model = requireModel(input.provider);
    const baseUrl = input.provider.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta/';
    const url = new URL('/v1beta/interactions', baseUrl);
    if (url.protocol !== 'https:') throw new Error('PROVIDER_BASE_URL_MUST_USE_HTTPS');

    const requestBody = JSON.stringify({
      model,
      input: [
        {
          type: 'document',
          data: input.content.toString('base64'),
          mime_type: input.mediaType,
        },
        {
          type: 'text',
          text: [
            'Extract this document faithfully.',
            'Preserve Arabic right-to-left reading order and document structure in markdown.',
            'Do not infer missing values. Return only values visibly supported by the document.',
            'Return only one valid JSON object with no markdown fence.',
            'Top-level fields: markdown, language, pageCount, textDirection, documentType, invoice, purchaseOrder, entities.',
            'documentType must be invoice, purchase_order, or other. invoice must be non-null only for invoices; purchaseOrder must be non-null only for purchase orders.',
            'For invoices, invoice must contain exactly: supplierName, supplierTaxId, invoiceNumber, invoiceDate, dueDate, currency, subtotal, taxTotal, grandTotal, confidence, lineItems.',
            'For purchase orders, purchaseOrder must contain exactly: supplierName, supplierTaxId, purchaseOrderNumber, orderDate, expectedDeliveryDate, currency, subtotal, taxTotal, grandTotal, confidence, lineItems.',
            'Purchase order confidence must contain those same nine scalar field names. Each purchase order line item must contain description, quantity, unitPrice, lineTotal.',
            'Use null for missing invoice values; never guess. Normalize dates to YYYY-MM-DD only when visibly supported.',
            'Normalize currency to a three-letter uppercase code only when supported. Normalize amounts and quantities to decimal strings with no currency symbols or grouping separators.',
            'confidence must contain the same nine scalar field names with a number from 0 to 1, or null when the value is null.',
            'Each lineItems entry must contain description, quantity, unitPrice, taxAmount, lineTotal; use null for missing numeric values.',
            'entities must remain an array of objects with label, value, confidence from 0 to 1.',
            'markdown must be non-empty; language is a short code; pageCount is integer 1-1000; textDirection is rtl, ltr, or mixed.',
          ].join(' '),
        },
      ],
    });

    let response: Response | undefined;
    for (let attempt = 1; attempt <= MAX_OCR_ATTEMPTS; attempt += 1) {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': input.secret,
        },
        signal: AbortSignal.timeout(60_000),
        body: requestBody,
      });

      if (response.ok) break;
      if (await isDailyQuotaExhausted(response)) {
        await throwProviderHttpError(response, model, 'OCR_PROVIDER_DAILY_QUOTA_EXHAUSTED');
      }
      if (!isRetryableProviderStatus(response.status) || attempt === MAX_OCR_ATTEMPTS) {
        await throwProviderHttpError(response, model);
      }

      const delayMs = await getRetryDelayMs(response, attempt);
      console.warn(JSON.stringify({
        event: 'ocr.provider_retry',
        httpStatus: response.status,
        model,
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
      }));
      await response.body?.cancel().catch(() => undefined);
      await this.sleep(delayMs);
    }

    if (!response?.ok) throw new Error('OCR_PROVIDER_RETRY_EXHAUSTED');
    const payload = await response.json() as {
      output_text?: string;
      steps?: Array<{ content?: Array<{ text?: string }> }>;
    };
    let text = typeof payload.output_text === 'string' ? payload.output_text : undefined;
    if (!text) {
      for (let index = (payload.steps?.length ?? 0) - 1; index >= 0 && !text; index -= 1) {
        text = payload.steps?.[index]?.content?.find((part) => typeof part.text === 'string')?.text;
      }
    }
    if (!text) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    }
    return parseDocumentOcrResult(parsed, `gemini-interactions-prompt-json-v2:${model}`);
  }
}
