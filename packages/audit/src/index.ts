export interface AuditEvent {
  action: string;
  actorId?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuditSink {
  write(event: AuditEvent): Promise<void> | void;
}

export function createAuditEvent(input: {
  action: string;
  actorId?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}): AuditEvent {
  const { occurredAt, ...rest } = input;
  return {
    ...rest,
    occurredAt: occurredAt ?? new Date().toISOString(),
  };
}
