export const FACTORY_ROLES = [
  'product_manager','business_analyst','architect','ui_ux_designer',
  'frontend_developer','backend_developer','database_engineer',
  'qa_engineer','security_engineer','devops_engineer',
] as const;

export type FactoryRole = typeof FACTORY_ROLES[number];
export type FactoryMode = 'managed' | 'custom';
export type AgentKind = 'ogroup' | 'external' | 'custom' | 'webhook' | 'mcp';

export const PROJECT_BRAIN_SECTIONS = [
  'requirements','business_rules','architecture','decisions','approved_designs',
  'tasks','known_issues','testing_evidence','deployment_history',
] as const;

export type ProjectBrainSection = typeof PROJECT_BRAIN_SECTIONS[number];

export interface FactoryProvider {
  id: string;
  tenantId: string;
  name: string;
  kind: string;
  credentialRef?: string;
  baseUrl?: string;
  enabled: boolean;
}

export interface FactoryModel {
  id: string;
  tenantId: string;
  providerId: string;
  modelKey: string;
  displayName: string;
  capabilities: string[];
  enabled: boolean;
}

export interface FactoryAgent {
  id: string;
  tenantId: string;
  name: string;
  kind: AgentKind;
  endpointRef?: string;
  enabled: boolean;
}

export interface FactoryRoleAssignment {
  tenantId: string;
  projectId?: string;
  role: FactoryRole;
  agentId: string;
  modelId?: string;
  fallbackModelId?: string;
  budgetLimitMicros?: number;
}

export interface FactoryProject {
  id: string;
  tenantId: string;
  name: string;
  intent: string;
  mode: FactoryMode;
  status: string;
  targetRepository?: string;
}

export function isFactoryMode(value: unknown): value is FactoryMode {
  return value === 'managed' || value === 'custom';
}

export function isFactoryRole(value: unknown): value is FactoryRole {
  return typeof value === 'string' && (FACTORY_ROLES as readonly string[]).includes(value);
}

export type UsageSource = 'ogroup' | 'customer';

export interface FactoryUsageEvent {
  tenantId: string;
  projectId?: string;
  source: UsageSource;
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
  occurredAt: string;
}

export interface UsageSummary {
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
  events: number;
  bySource: Record<UsageSource,{inputTokens:number;outputTokens:number;costMicros:number;events:number}>;
}

export function summarizeUsage(events: readonly FactoryUsageEvent[]): UsageSummary {
  const blank=()=>({inputTokens:0,outputTokens:0,costMicros:0,events:0});
  const result:UsageSummary={...blank(),bySource:{ogroup:blank(),customer:blank()}};
  for(const event of events){
    if(event.inputTokens<0||event.outputTokens<0||event.costMicros<0) throw new Error('INVALID_USAGE_EVENT');
    result.inputTokens+=event.inputTokens; result.outputTokens+=event.outputTokens; result.costMicros+=event.costMicros; result.events+=1;
    const bucket=result.bySource[event.source]; bucket.inputTokens+=event.inputTokens; bucket.outputTokens+=event.outputTokens; bucket.costMicros+=event.costMicros; bucket.events+=1;
  }
  return result;
}
