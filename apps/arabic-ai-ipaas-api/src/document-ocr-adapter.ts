import type { AcceptedMediaType, ProviderConnection } from './types.js';

export const MAX_INLINE_OCR_BYTES = 10 * 1024 * 1024;

export type DocumentOcrEntity = {
  label: string;
  value: string;
  confidence: number;
};

export type DocumentOcrResult = {
  engineVersion: string;
  markdown: string;
  structuredJson: {
    schemaVersion: 'document-extraction-json-v1';
    textDirection: 'rtl' | 'ltr' | 'mixed';
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

async function throwProviderHttpError(response: Response, model: string): Promise<never> {
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
  throw new Error(`OCR_PROVIDER_HTTP_${response.status}:${providerStatus ?? 'UNKNOWN'}`);
}

function requireModel(provider: ProviderConnection): string {
  const configured = provider.config.ocrModel;
  const model = typeof configured === 'string' && configured.trim()
    ? configured.trim()
    : provider.modelDefault?.trim();
  if (!model) throw new Error('OCR_MODEL_NOT_CONFIGURED');
  if (!/^[A-Za-z0-9._-]+$/.test(model)) throw new Error('INVALID_OCR_MODEL');
  return model;
}

function parseResult(value: unknown, model: string): DocumentOcrResult {
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

  return {
    engineVersion: `gemini-interactions-prompt-json-v1:${model}`,
    markdown: record.markdown,
    structuredJson: {
      schemaVersion: 'document-extraction-json-v1',
      textDirection: record.textDirection as 'rtl' | 'ltr' | 'mixed',
      entities,
    },
    language: record.language,
    pageCount: record.pageCount as number,
  };
}

export class GeminiDocumentOcrAdapter implements DocumentOcrAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

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

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': input.secret,
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
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
              'Return only one valid JSON object with no markdown fence and exactly these fields:',
              'markdown (non-empty string), language (short language code), pageCount (integer 1-1000),',
              'textDirection (rtl, ltr, or mixed), and entities (array of objects with label, value, confidence from 0 to 1).',
            ].join(' '),
          },
        ],
      }),
    });

    if (!response.ok) await throwProviderHttpError(response, model);
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
    return parseResult(parsed, model);
  }
}
