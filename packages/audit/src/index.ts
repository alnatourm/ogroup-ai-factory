export interface AuditEvent {
  action: string;
  actorId: string;
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
  actorId: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): AuditEvent {
  return {
    ...input,
    occurredAt: new Date().toISOString(),
  };
}
