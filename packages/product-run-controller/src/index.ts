import { orchestrateProduct, type OrchestratorRequest, type OrchestratorPlan } from '@ogroup/orchestrator';
import { emitGitHubTasks, type GitHubTaskDefinition } from '@ogroup/github-task-emitter';
import {
  executeTaskBlueprints,
  type GitHubIssuePort,
  type TaskExecutionResult,
} from '@ogroup/github-execution-adapter';

export interface ProductRunInput extends OrchestratorRequest {
  repositoryFullName: string;
  labels?: string[];
  approved: boolean;
}

export interface ProductRunSummary {
  productSlug: string;
  stageCount: number;
  taskCount: number;
  approved: boolean;
  createdIssueCount: number;
  failedTaskKey: string | null;
  status: 'planned' | 'completed' | 'partial-failure';
}

export interface ProductRunResult {
  plan: OrchestratorPlan;
  tasks: GitHubTaskDefinition[];
  execution: TaskExecutionResult;
  summary: ProductRunSummary;
}

export async function runProductFactory(
  port: GitHubIssuePort,
  input: ProductRunInput,
): Promise<ProductRunResult> {
  const plan = orchestrateProduct(input);
  const tasks = emitGitHubTasks(plan, input.labels ?? []);
  const execution = await executeTaskBlueprints(port, {
    repositoryFullName: input.repositoryFullName,
    tasks,
    approved: input.approved,
  });

  const status: ProductRunSummary['status'] = execution.failedTaskKey
    ? 'partial-failure'
    : execution.approved
      ? 'completed'
      : 'planned';

  return Object.freeze({
    plan,
    tasks,
    execution,
    summary: Object.freeze({
      productSlug: plan.product.slug,
      stageCount: plan.stages.length,
      taskCount: tasks.length,
      approved: execution.approved,
      createdIssueCount: execution.completed.length,
      failedTaskKey: execution.failedTaskKey,
      status,
    }),
  });
}
