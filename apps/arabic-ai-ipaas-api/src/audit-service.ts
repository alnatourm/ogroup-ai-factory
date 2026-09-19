import crypto from 'node:crypto';
import type { AuditEventRecord } from './types.js';

export interface AuditRepository {
  record(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<AuditEventRecord>;
  list(workspaceId: string): Promise<AuditEventRecord[]>;
}

export class MemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEventRecord[] = [];

  async record(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<AuditEventRecord> {
    const record: AuditEventRecord = {
      id: crypto.randomUUID(),
      ...event,
      createdAt: new Date().toISOString(),
    };
    this.events.push(record);
    return record;
  }

  async list(workspaceId: string): Promise<AuditEventRecord[]> {
    return this.events
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
