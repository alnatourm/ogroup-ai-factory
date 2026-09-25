import type { ProviderConnection } from './types.js';

export type ProviderCapability = 'chat' | 'document-extraction';

export function providerSupportsCapability(
  provider: ProviderConnection,
  capability: ProviderCapability,
): boolean {
  if (provider.status !== 'active') return false;
  if (capability === 'chat') {
    return provider.providerType === 'openai-compatible' || provider.providerType === 'gemini';
  }
  // Document Intelligence is intentionally Gemini-only for now.
  // OpenAI-compatible providers remain available for chat/gateway workloads,
  // but are not eligible for governed document extraction.
  return provider.providerType === 'gemini' && provider.config.documentOcrEnabled === true;
}

export function providersForCapability(
  providers: ProviderConnection[],
  capability: ProviderCapability,
  preferredProviderId?: string,
): ProviderConnection[] {
  const eligible = providers.filter((provider) => providerSupportsCapability(provider, capability));
  if (!preferredProviderId) return eligible;
  return [...eligible].sort((a, b) => {
    if (a.id === preferredProviderId) return -1;
    if (b.id === preferredProviderId) return 1;
    return 0;
  });
}

export function stableProviderErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : 'PROVIDER_REQUEST_FAILED';
  const code = message.split(':')[0] ?? 'PROVIDER_REQUEST_FAILED';
  return /^[A-Z0-9_]+$/.test(code) ? code : 'PROVIDER_REQUEST_FAILED';
}

export function isRetryableProviderError(error: unknown): boolean {
  const code = stableProviderErrorCode(error);
  if (code === 'OCR_PROVIDER_DAILY_QUOTA_EXHAUSTED') return true;
  const match = /^(?:OCR_)?PROVIDER_HTTP_(\d{3})$/.exec(code);
  if (!match) return false;
  const status = Number(match[1]);
  return status === 408 || status === 429 || status >= 500;
}
