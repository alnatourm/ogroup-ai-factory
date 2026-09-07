import { describe, expect, it } from 'vitest';
import { hasPermission, requirePermission } from '../../packages/rbac/src/index.js';

describe('rbac primitives', () => {
  const context = {
    roles: [
      {
        name: 'manager',
        permissions: ['customer.read', 'customer.update'],
      },
    ],
  } as const;

  it('recognizes granted permissions', () => {
    expect(hasPermission(context, 'customer.read')).toBe(true);
  });

  it('denies permissions that are not granted', () => {
    expect(hasPermission(context, 'billing.manage')).toBe(false);
    expect(() => requirePermission(context, 'billing.manage')).toThrow(
      'Permission denied: billing.manage',
    );
  });
});
