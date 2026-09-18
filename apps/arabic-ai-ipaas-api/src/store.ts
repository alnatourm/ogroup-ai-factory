import crypto from 'node:crypto';
import type { ProviderConnection, ProviderType } from './types.js';

export class ProviderStore {
  private readonly providers = new Map<string, ProviderConnection>();

  create(input: {
    workspaceId: string;
    providerType: ProviderType;
    name: string;
    baseUrl?: string;
    modelDefault?: string;
    secretCiphertext: string;
    config?: Record<string, unknown>;
  }): ProviderConnection {
    const now = new Date().toISOString();
    const provider: ProviderConnection = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      providerType: input.providerType,
      name: input.name,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      ...(input.modelDefault ? { modelDefault: input.modelDefault } : {}),
      secretCiphertext: input.secretCiphertext,
      config: input.config ?? {},
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.providers.set(provider.id, provider);
    return provider;
  }

  list(workspaceId: string): ProviderConnection[] {
    return [...this.providers.values()].filter((item) => item.workspaceId === workspaceId);
  }

  get(workspaceId: string, id: string): ProviderConnection | undefined {
    const provider = this.providers.get(id);
    return provider?.workspaceId === workspaceId ? provider : undefined;
  }

  remove(workspaceId: string, id: string): boolean {
    const provider = this.get(workspaceId, id);
    if (!provider) return false;
    return this.providers.delete(id);
  }
}
