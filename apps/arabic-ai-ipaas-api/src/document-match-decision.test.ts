import { describe,expect,it } from 'vitest';
import { MemoryMatchDecisionRepository,parseMatchDecision } from './document-match-decision.js';
describe('mismatch review decisions',()=>{
 it('validates governed decisions and reason',()=>{expect(parseMatchDecision({decision:'accepted',reason:'Approved by finance'})).toEqual({decision:'accepted',reason:'Approved by finance'});expect(()=>parseMatchDecision({decision:'accepted',reason:''})).toThrow('INVALID_MATCH_DECISION_REASON');});
 it('keeps tenant decisions isolated',async()=>{const repo=new MemoryMatchDecisionRepository();await repo.create({workspaceId:'w1',purchaseOrderDocumentId:'po',invoiceDocumentId:'inv',decision:'escalated',reason:'Needs manager review',decidedBy:'u1',matchDigest:'a'.repeat(64),purchaseOrderExtractionId:'pe1',invoiceExtractionId:'ie1'});expect((await repo.getLatest('w1','po','inv'))?.decision).toBe('escalated');expect(await repo.getLatest('w2','po','inv')).toBeUndefined();});
});
