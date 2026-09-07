import type { GitHubTaskDefinition } from '@ogroup/github-task-emitter';

export interface GitHubIssueCreateInput {
  repositoryFullName: string;
  title: string;
  body: string;
  labels: string[];
}

export interface GitHubIssueCreateResult {
  number: number;
  url: string;
}

export interface GitHubIssuePort {
  createIssue(input: GitHubIssueCreateInput): Promise<GitHubIssueCreateResult>;
}

export interface ExecuteTaskBlueprintsInput {
  repositoryFullName: string;
  tasks: GitHubTaskDefinition[];
  approved: boolean;
}

export interface ExecutedTask {
  key: GitHubTaskDefinition['key'];
  number: number;
  url: string;
}

export interface TaskExecutionResult {
  approved: boolean;
  completed: ExecutedTask[];
  failedTaskKey: GitHubTaskDefinition['key'] | null;
  error: string | null;
}

function dependencyBlock(task: GitHubTaskDefinition, created: Map<string, ExecutedTask>): string {
  if (task.dependsOn.length === 0) return '';
  const refs = task.dependsOn.map((key) => {
    const dependency = created.get(key);
    return dependency ? `- Depends on #${dependency.number} (${key})` : `- Depends on stage: ${key}`;
  });
  return `\n\n## Created Issue Dependencies\n${refs.join('\n')}`;
}

export async function executeTaskBlueprints(
  port: GitHubIssuePort,
  input: ExecuteTaskBlueprintsInput,
): Promise<TaskExecutionResult> {
  if (!input.approved) {
    return { approved: false, completed: [], failedTaskKey: null, error: null };
  }
  if (!input.repositoryFullName.trim()) {
    throw new Error('TARGET_REPOSITORY_REQUIRED');
  }

  const completed: ExecutedTask[] = [];
  const created = new Map<string, ExecutedTask>();

  for (const task of input.tasks) {
    try {
      const result = await port.createIssue({
        repositoryFullName: input.repositoryFullName.trim(),
        title: task.title,
        body: task.body + dependencyBlock(task, created),
        labels: [...task.labels],
      });
      const executed = { key: task.key, number: result.number, url: result.url };
      completed.push(executed);
      created.set(task.key, executed);
    } catch (error) {
      return {
        approved: true,
        completed,
        failedTaskKey: task.key,
        error: error instanceof Error ? error.message : 'UNKNOWN_GITHUB_ISSUE_CREATION_ERROR',
      };
    }
  }

  return { approved: true, completed, failedTaskKey: null, error: null };
}
