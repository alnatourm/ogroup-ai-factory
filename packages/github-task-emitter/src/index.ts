import type { OrchestratorPlan, OrchestratorStage, OrchestratorStageName } from '@ogroup/orchestrator';

export interface GitHubTaskDefinition {
  key: OrchestratorStageName;
  title: string;
  body: string;
  agentRole: string;
  dependsOn: OrchestratorStageName[];
  humanGate: boolean;
  labels: string[];
}

const agentRoles: Record<OrchestratorStageName, string> = {
  product: 'Product Agent', architecture: 'Architect Agent', database: 'Database Agent', backend: 'Backend Agent',
  frontend: 'Frontend Agent', qa: 'QA Agent', security: 'Security Agent', review: 'Review Agent', release: 'Human Release Owner',
};

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function taskBody(plan: OrchestratorPlan, stage: OrchestratorStage): string {
  const dependencies = stage.dependsOn.length ? bullets(stage.dependsOn.map((id) => `Complete stage: ${id}`)) : '- None';
  const gate = stage.humanGate ? 'REQUIRED before this stage can authorize downstream work.' : 'Not required by default; escalate if sensitive scope is introduced.';
  return `## Objective\nComplete **${stage.title}** for **${plan.product.config.productName}**.\n\n## Product Context\n- Market: ${plan.product.config.market}\n- Industry: ${plan.product.config.industry}\n- Priority: ${plan.priority}\n- Milestone: ${plan.targetMilestone ?? 'Not specified'}\n\n## Agent Role\n${agentRoles[stage.id]}\n\n## Dependencies\n${dependencies}\n\n## Acceptance Criteria\n${bullets(stage.acceptanceCriteria)}\n\n## Required Evidence\n- Link or reference implementation/documentation produced by this stage\n- Relevant automated test or review evidence\n- Engineering Quality Gate result when code is changed\n- Explicitly state **NOT VERIFIED** for anything that could not be verified\n\n## Security & Testing\n- Follow the Engineering Constitution and applicable ADRs\n- Preserve OGroup Core auth, tenancy, RBAC, validation, logging and audit boundaries\n- Add risk-based tests for changed behavior\n- Never place secrets or credentials in issues, code, tests, prompts or logs\n\n## Human Gate\n${gate}\n\n## Authority Boundary\nThis task does not grant merge or production authority. Automation may execute approved work but may not approve itself.\n`;
}

export function emitGitHubTasks(plan: OrchestratorPlan, extraLabels: string[] = []): GitHubTaskDefinition[] {
  const baseLabels = ['factory', `priority:${plan.priority}`];
  return plan.stages.map((stage) => Object.freeze({
    key: stage.id,
    title: `[${plan.product.slug}] ${stage.title}`,
    body: taskBody(plan, stage),
    agentRole: agentRoles[stage.id],
    dependsOn: [...stage.dependsOn],
    humanGate: stage.humanGate,
    labels: [...baseLabels, `stage:${stage.id}`, ...(stage.humanGate ? ['human-gate'] : []), ...extraLabels],
  }));
}
