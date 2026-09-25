import type { GatewayRequest, ProviderConnection } from './types.js';

export type ProviderCompletion = {
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
};

export interface ProviderAdapter {
  complete(
    input: GatewayRequest,
    provider: ProviderConnection,
    secret: string,
  ): Promise<ProviderCompletion>;
}

type FetchLike = typeof fetch;

export class OpenAICompatibleProviderAdapter implements ProviderAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async complete(
    input: GatewayRequest,
    provider: ProviderConnection,
    secret: string,
  ): Promise<ProviderCompletion> {
    const baseUrl = provider.baseUrl ?? 'https://api.openai.com/v1';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = new URL('chat/completions', normalizedBase);
    if (url.protocol !== 'https:') {
      throw new Error('PROVIDER_BASE_URL_MUST_USE_HTTPS');
    }

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model ?? provider.modelDefault,
        messages: input.messages,
        ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`PROVIDER_HTTP_${response.status}`);
    }

    const payload = await response.json() as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('PROVIDER_INVALID_RESPONSE');
    }

    return {
      model: payload.model ?? input.model ?? provider.modelDefault ?? 'unknown',
      content,
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
    };
  }
}

export class GeminiProviderAdapter implements ProviderAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async complete(
    input: GatewayRequest,
    provider: ProviderConnection,
    secret: string,
  ): Promise<ProviderCompletion> {
    const model = input.model ?? provider.modelDefault;
    if (!model) throw new Error('PROVIDER_MODEL_REQUIRED');

    const baseUrl = provider.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = new URL(`models/${encodeURIComponent(model)}:generateContent`, normalizedBase);
    if (url.protocol !== 'https:') throw new Error('PROVIDER_BASE_URL_MUST_USE_HTTPS');

    const systemText = input.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const contents = input.messages
      .filter((message) => message.role !== 'system' && message.role !== 'tool')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': secret,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        contents,
        generationConfig: {
          ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
        },
      }),
    });

    if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);

    const payload = await response.json() as {
      modelVersion?: string;
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const content = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!content) throw new Error('PROVIDER_INVALID_RESPONSE');

    return {
      model: payload.modelVersion ?? model,
      content,
      promptTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}

export class EchoProviderAdapter implements ProviderAdapter {
  async complete(
    input: GatewayRequest,
    _provider: ProviderConnection,
    _secret: string,
  ): Promise<ProviderCompletion> {
    const lastUser = [...input.messages].reverse().find((message) => message.role === 'user');
    const content = lastUser?.content ?? '';
    return {
      model: input.model ?? 'factory-echo',
      content: `[gateway-pilot] ${content}`,
      promptTokens: Math.max(1, Math.ceil(content.length / 4)),
      completionTokens: Math.max(1, Math.ceil(content.length / 6)),
    };
  }
}
