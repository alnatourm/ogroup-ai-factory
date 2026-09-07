import { generateProductBootstrap, type ProductBootstrapInput } from '@ogroup/product-generator';

export type OrchestratorStageName =
  | 'product'
  | 'architecture'
  | 'database'
  | 'backend'
  | 'frontend'
  | 'qa'
  | 'security'
  | 'review'
  | 'release';

export interface OrchestratorRequest extends ProductBootstrapInput {
  priority?: 'low' | 'normal' | 'high';
  targetMilestone?: string;
}

export interface OrchestratorStage {
  id: OrchestratorStageName;
  title: string;
  dependsOn: OrchestratorStageName[];
  acceptanceCriteria: string[];
  humanGate: boolean;
}

export interface OrchestratorPlan {
  product: ReturnType<typeof generateProductBootstrap>;
  priority: 'low' | 'normal' | 'high';
  targetMilestone: string | null;
  stages: OrchestratorStage[];
  humanGates: string[];
  releaseReadiness: string[];
}

export function orchestrateProduct(request: OrchestratorRequest): OrchestratorPlan {
  const product = generateProductBootstrap(request);
  const priority = request.priority ?? 'normal';
  const targetMilestone = request.targetMilestone?.trim() || null;

  const stages: OrchestratorStage[] = [
    {
      id: 'product',
      title: 'Product definition',
      dependsOn: [],
      acceptanceCriteria: ['Requirements and measurable acceptance criteria are defined', 'Assumptions are explicitly labeled'],
      humanGate: false,
    },
    {
      id: 'architecture',
      title: 'Architecture and ADR review',
      dependsOn: ['product'],
      acceptanceCriteria: ['Approved stack preserved', 'Applicable ADRs identified', 'Core reuse boundaries documented'],
      humanGate: true,
    },
    {
      id: 'database',
      title: 'Database design',
      dependsOn: ['architecture'],
      acceptanceCriteria: ['Tenant ownership modeled', 'Constraints and indexes defined', 'Migration strategy documented'],
      humanGate: true,
    },
    {
      id: 'backend',
      title: 'Backend implementation',
      dependsOn: ['architecture', 'database'],
      acceptanceCriteria: ['Server-side authorization enforced', 'Input validated', 'Tenant isolation applied to owned records'],
      humanGate: true,
    },
    {
      id: 'frontend',
      title: 'Frontend implementation',
      dependsOn: ['architecture'],
      acceptanceCriteria: ['Arabic/English conventions preserved', 'RTL/LTR behavior verified', 'Frontend does not replace server authorization'],
      humanGate: false,
    },
    {
      id: 'qa',
      title: 'QA verification',
      dependsOn: ['backend', 'frontend'],
      acceptanceCriteria: ['Acceptance tests pass', 'Tenant isolation tests pass', 'Error paths are covered'],
      humanGate: false,
    },
    {
      id: 'security',
      title: 'Security review',
      dependsOn: ['backend', 'frontend', 'qa'],
      acceptanceCriteria: ['Auth and authorization reviewed', 'Secrets and sensitive logging reviewed', 'No unresolved critical security defects'],
      humanGate: true,
    },
    {
      id: 'review',
      title: 'Engineering review',
      dependsOn: ['qa', 'security'],
      acceptanceCriteria: ['Definition of Done evidence is present', 'CI quality gate is green', 'No fabricated verification evidence'],
      humanGate: true,
    },
    {
      id: 'release',
      title: 'Release readiness',
      dependsOn: ['review'],
      acceptanceCriteria: ['Human approval exists', 'Rollback/recovery plan exists', 'Production authority remains human-controlled'],
      humanGate: true,
    },
  ];

  return Object.freeze({
    product,
    priority,
    targetMilestone,
    stages,
    humanGates: [
      'Architecture changes and ADR exceptions',
      'Authentication, authorization and tenant isolation',
      'Payments and financial calculations',
      'Destructive migrations and irreversible data operations',
      'Shared OGroup Core changes',
      'Production release',
    ],
    releaseReadiness: [
      'Engineering Quality Gate is green',
      'QA and Security stages are complete',
      'Required human gates are approved',
      'Documentation is current',
      'Rollback or recovery plan is documented',
    ],
  });
}
