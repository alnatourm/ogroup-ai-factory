import type { DataPolicyConfig, DataPolicyTier } from './types.js';
import type { AuditRepository } from './audit-service.js';

export const VALID_DATA_ZONES = new Set<DataPolicyTier>([
  'PRIVATE',
  'ANONYMOUS_TELEMETRY',
  'IMPROVEMENT_OPT_IN',
]);

export function getDefaultDataPolicy(workspaceId: string): DataPolicyConfig {
  return {
    workspaceId,
    dataZone: 'PRIVATE',
    piiMaskingEnabled: true,
    retentionDays: 90,
    auditLoggingEnabled: true,
    strictZdrLevel: 4,
    dualAdminApprovalRequired: true,
    optInConfirmed: false,
    updatedAt: new Date().toISOString(),
  };
}

export interface DataPolicyRepository {
  get(workspaceId: string): Promise<DataPolicyConfig>;
  update(workspaceId: string, updates: Partial<DataPolicyConfig>): Promise<DataPolicyConfig>;
}

export class MemoryDataPolicyRepository implements DataPolicyRepository {
  private readonly policies = new Map<string, DataPolicyConfig>();

  async get(workspaceId: string): Promise<DataPolicyConfig> {
    let policy = this.policies.get(workspaceId);
    if (!policy) {
      policy = getDefaultDataPolicy(workspaceId);
      this.policies.set(workspaceId, policy);
    }
    return { ...policy };
  }

  async update(workspaceId: string, updates: Partial<DataPolicyConfig>): Promise<DataPolicyConfig> {
    const current = await this.get(workspaceId);
    const updated: DataPolicyConfig = {
      ...current,
      ...updates,
      workspaceId, // prevent changing workspaceId
      updatedAt: new Date().toISOString(),
    };
    this.policies.set(workspaceId, updated);
    return { ...updated };
  }
}

export async function handleDataPolicyUpdate(
  workspaceId: string,
  updates: Partial<DataPolicyConfig>,
  actorUserId: string,
  repository: DataPolicyRepository,
  auditRepository?: AuditRepository,
): Promise<DataPolicyConfig> {
  const current = await repository.get(workspaceId);

  // Validate dataZone if provided
  if (updates.dataZone) {
    if (!VALID_DATA_ZONES.has(updates.dataZone)) {
      throw new Error(`INVALID_DATA_ZONE: Must be one of ${[...VALID_DATA_ZONES].join(', ')}`);
    }

    // Explicit opt-in semantics:
    // Moving to IMPROVEMENT_OPT_IN requires explicit opt-in confirmation
    if (updates.dataZone === 'IMPROVEMENT_OPT_IN') {
      const isConfirmed = updates.optInConfirmed === true || current.optInConfirmed === true;
      if (!isConfirmed) {
        throw new Error('EXPLICIT_OPT_IN_REQUIRED: Upgrading to IMPROVEMENT_OPT_IN requires explicit opt-in confirmation.');
      }
    }
  }

  const updated = await repository.update(workspaceId, updates);

  // Append-only audit log on policy change
  if (auditRepository) {
    await auditRepository.record({
      workspaceId,
      actorUserId,
      actorType: 'user',
      action: 'data_policy.updated',
      entityType: 'workspace_data_policy',
      entityId: workspaceId,
      metadata: {
        previousDataZone: current.dataZone,
        newDataZone: updated.dataZone,
        changes: updates,
      },
    });
  }

  return updated;
}
