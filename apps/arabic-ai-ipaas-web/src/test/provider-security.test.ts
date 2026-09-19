import { describe, expect, it } from 'vitest';
import type { SafeProviderConnection } from '../types/api';

describe('provider connection security contract', () => {
  it('represents stored credentials without a plaintext secret field', () => {
    const provider: SafeProviderConnection = {
      id: 'provider-1',
      workspaceId: 'workspace-1',
      providerType: 'openai-compatible',
      name: 'Provider',
      hasSecret: true,
      config: {},
      status: 'active',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };

    expect(provider.hasSecret).toBe(true);
    expect('apiKey' in provider).toBe(false);
    expect('secret' in provider).toBe(false);
  });
});
