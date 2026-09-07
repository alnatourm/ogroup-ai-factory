import { describe, expect, it } from 'vitest';
import { orchestrateProduct } from '../packages/orchestrator/src/index.js';
import { emitGitHubTasks } from '../packages/github-task-emitter/src/index.js';
import { executeTaskBlueprints, type GitHubIssuePort } from '../packages/github-execution-adapter/src/index.js';

const tasks = emitGitHubTasks(orchestrateProduct({
  productName: 'CVideo', market: 'MENA', industry: 'Recruitment', platforms: ['web', 'api'], languages: ['ar', 'en'],
  defaultLanguage: 'ar', description: 'Video-first recruiting SaaS.',
}));

function fakePort(failAt?: number): GitHubIssuePort {
  let count = 0;
  return {
    async createIssue(_input) {
      count += 1;
      if (failAt === count) throw new Error('SIMULATED_GITHUB_FAILURE');
      return { number: 100 + count, url: `https://example.test/issues/${100 + count}` };
    },
  };
}

describe('GitHub execution adapter', () => {
  it('does nothing without explicit approval', async () => {
    const result = await executeTaskBlueprints(fakePort(), { repositoryFullName: 'o/product', tasks, approved: false });
    expect(result).toEqual({ approved: false, completed: [], failedTaskKey: null, error: null });
  });

  it('creates approved issues in emitter order and links dependencies', async () => {
    const captured: string[] = [];
    let count = 0;
    const port: GitHubIssuePort = {
      async createIssue(input) {
        captured.push(input.body);
        count += 1;
        return { number: count, url: `https://example.test/issues/${count}` };
      },
    };
    const result = await executeTaskBlueprints(port, { repositoryFullName: 'o/product', tasks, approved: true });
    expect(result.completed.map((item) => item.key)).toEqual(tasks.map((task) => task.key));
    expect(captured[1]).toContain('Depends on #1 (product)');
  });

  it('stops on failure and reports partial completion', async () => {
    const result = await executeTaskBlueprints(fakePort(3), { repositoryFullName: 'o/product', tasks, approved: true });
    expect(result.completed).toHaveLength(2);
    expect(result.failedTaskKey).toBe(tasks[2]?.key);
    expect(result.error).toBe('SIMULATED_GITHUB_FAILURE');
  });
});
