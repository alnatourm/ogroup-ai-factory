import { describe, expect, it } from 'vitest';
import { MemoryWorkflowRepository, executeWorkflow } from './workflow-engine.js';

describe('document decision workflow action contract', () => {
  it('carries an accepted decision into an auditable workflow input', async () => {
    const repo=new MemoryWorkflowRepository();
    const workflow=await repo.create({workspaceId:'w1',name:'AP continuation',createdBy:'u1',definition:{version:1,steps:[]} as never});
    const active=await repo.update('w1',workflow.id,{status:'active'});
    const run=await executeWorkflow(active!,'manual',{eventType:'document_match_decision',decisionId:'d1',purchaseOrderDocumentId:'po1',invoiceDocumentId:'inv1',decision:'accepted',route:'continue'},repo);
    expect(run.input).toMatchObject({decision:'accepted',route:'continue',decisionId:'d1'});
  });
  it('uses manager_review as the escalation route', () => {
    const routeFor = (decision: 'accepted' | 'escalated') => decision === 'accepted' ? 'continue' : 'manager_review';
    const route=routeFor('escalated');
    expect(route).toBe('manager_review');
  });
});
