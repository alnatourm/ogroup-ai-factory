import crypto from 'node:crypto';
import type { ProviderRepository } from './postgres.js';
import type { ProviderConnection, ProviderType } from './types.js';

export class MemoryProviderRepository implements ProviderRepository {
  private readonly providers = new Map<string, ProviderConnection>();

  async create(input: {
    workspaceId: string;
    providerType: ProviderType;
    name: string;
    baseUrl?: string;
    modelDefault?: string;
    secretCiphertext: string;
    config?: Record<string, unknown>;
  }): Promise<ProviderConnection> {
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

  async list(workspaceId: string): Promise<ProviderConnection[]> {
    return [...this.providers.values()].filter((item) => item.workspaceId === workspaceId);
  }

  async get(workspaceId: string, id: string): Promise<ProviderConnection | undefined> {
    const provider = this.providers.get(id);
    return provider?.workspaceId === workspaceId ? provider : undefined;
  }

  async remove(workspaceId: string, id: string): Promise<boolean> {
    const provider = await this.get(workspaceId, id);
    if (!provider) return false;
    return this.providers.delete(id);
  }
}
