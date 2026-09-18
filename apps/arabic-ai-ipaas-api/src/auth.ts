import crypto from 'node:crypto';
import type { RequestContext } from './types.js';

export type VerifiedApiKey = RequestContext & {
  apiKeyId: string;
  scopes: string[];
};

export interface ApiKeyVerifier {
  verify(rawKey: string): Promise<VerifiedApiKey | null>;
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export class InMemoryApiKeyVerifier implements ApiKeyVerifier {
  constructor(private readonly records: Map<string, VerifiedApiKey>) {}

  async verify(rawKey: string): Promise<VerifiedApiKey | null> {
    return this.records.get(hashApiKey(rawKey)) ?? null;
  }
}
