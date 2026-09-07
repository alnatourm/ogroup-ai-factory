export interface TenantContext {
  tenantId: string;
  actorId: string;
}

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

export function requireTenantContext(
  tenantId: string | null | undefined,
  actorId: string | null | undefined,
): TenantContext {
  const normalizedTenantId = tenantId?.trim();
  const normalizedActorId = actorId?.trim();

  if (!normalizedTenantId) {
    throw new TenantContextError('Tenant context is required.');
  }

  if (!normalizedActorId) {
    throw new TenantContextError('Authenticated actor context is required.');
  }

  return {
    tenantId: normalizedTenantId,
    actorId: normalizedActorId,
  };
}

export function assertTenantOwnership(
  context: TenantContext,
  resourceTenantId: string,
): void {
  if (context.tenantId !== resourceTenantId) {
    throw new TenantContextError('Cross-tenant access denied.');
  }
}

export interface TenantOwnedRecord {
  tenantId: string;
}

export function scopeTenantRecord<T extends TenantOwnedRecord>(
  context: TenantContext,
  record: T | null,
): T | null {
  if (!record) {
    return null;
  }

  assertTenantOwnership(context, record.tenantId);
  return record;
}

export function tenantWhere(context: TenantContext): Readonly<{ tenantId: string }> {
  return Object.freeze({ tenantId: context.tenantId });
}
