import crypto from 'node:crypto';

export type MatchDecision = 'accepted' | 'rejected' | 'escalated';
export type MatchDecisionRecord = {
  id: string; workspaceId: string; purchaseOrderDocumentId: string; invoiceDocumentId: string;
  decision: MatchDecision; reason: string; decidedBy: string; matchDigest: string; purchaseOrderExtractionId: string; invoiceExtractionId: string; createdAt: string;
};
export interface MatchDecisionRepository {
  create(input: Omit<MatchDecisionRecord, 'id' | 'createdAt'>): Promise<MatchDecisionRecord>;
  getLatest(workspaceId: string, purchaseOrderDocumentId: string, invoiceDocumentId: string): Promise<MatchDecisionRecord | undefined>;
}
export class MemoryMatchDecisionRepository implements MatchDecisionRepository {
  private readonly records: MatchDecisionRecord[] = [];
  async create(input: Omit<MatchDecisionRecord, 'id' | 'createdAt'>): Promise<MatchDecisionRecord> {
    const record={id:crypto.randomUUID(),...input,createdAt:new Date().toISOString()}; this.records.push(record); return record;
  }
  async getLatest(workspaceId:string,purchaseOrderDocumentId:string,invoiceDocumentId:string){
    return [...this.records].reverse().find(r=>r.workspaceId===workspaceId&&r.purchaseOrderDocumentId===purchaseOrderDocumentId&&r.invoiceDocumentId===invoiceDocumentId);
  }
}
export function parseMatchDecision(body: unknown): {decision: MatchDecision; reason: string} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_MATCH_DECISION');
  const {decision,reason}=body as Record<string,unknown>;
  if (decision!=='accepted'&&decision!=='rejected'&&decision!=='escalated') throw new Error('INVALID_MATCH_DECISION');
  if (typeof reason!=='string'||reason.trim().length<3||reason.trim().length>1000) throw new Error('INVALID_MATCH_DECISION_REASON');
  return {decision,reason:reason.trim()};
}

export function createMatchDigest(input: unknown): string { return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'); }
