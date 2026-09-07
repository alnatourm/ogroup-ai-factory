import { describe, expect, it } from 'vitest';
import {
  assertTenantOwnership,
  requireTenantContext,
  TenantContextError,
} from '../../packages/tenancy/src/index.js';

describe('tenant enforcement', () => {
  it('requires both tenant and actor context', () => {
    expect(() => requireTenantContext('', 'actor-1')).toThrow(TenantContextError);
    expect(() => requireTenantContext('tenant-1', '')).toThrow(TenantContextError);
  });

  it('allows access to resources owned by the active tenant', () => {
    const context = requireTenantContext('tenant-a', 'actor-1');
    expect(() => assertTenantOwnership(context, 'tenant-a')).not.toThrow();
  });

  it('blocks cross-tenant access', () => {
    const context = requireTenantContext('tenant-a', 'actor-1');
    expect(() => assertTenantOwnership(context, 'tenant-b')).toThrow(
      'Cross-tenant access denied.',
    );
  });
});
