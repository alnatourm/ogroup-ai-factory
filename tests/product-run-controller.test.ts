import { describe, expect, it } from 'vitest';
import { runProductFactory, type ProductRunInput } from '../packages/product-run-controller/src/index.js';
import type { GitHubIssuePort } from '../packages/github-execution-adapter/src/index.js';

const baseInput: ProductRunInput = {
  productName: 'CVideo', market: 'MENA', industry: 'Recruitment', platforms: ['web', 'api'],
  languages: ['ar', 'en'], defaultLanguage: 'ar', description: 'Video-first recruiting SaaS.',
  repositoryFullName: 'o/cvideo', approved: false,
};

function port(failAt?: number): GitHubIssuePort {
  let count = 0;
  return {
    async createIssue(_input) {
      count += 1;
      if (count === failAt) throw new Error('SIMULATED_FAILURE');
      return { number: count, url: `https://example.test/issues/${count}` };
    },
  };
}

describe('Product Run Controller', () => {
  it('supports deterministic dry-run planning without mutation', async () => {
    const first = await runProductFactory(port(), baseInput);
    const second = await runProductFactory(port(), baseInput);
    expect(first.plan).toEqual(second.plan);
    expect(first.tasks).toEqual(second.tasks);
    expect(first.execution.completed).toHaveLength(0);
    expect(first.summary.status).toBe('planned');
  });

  it('executes approved runs through the execution adapter', async () => {
    const result = await runProductFactory(port(), { ...baseInput, approved: true });
    expect(result.execution.completed).toHaveLength(result.tasks.length);
    expect(result.summary.createdIssueCount).toBe(result.tasks.length);
    expect(result.summary.status).toBe('completed');
  });

  it('surfaces partial execution failure', async () => {
    const result = await runProductFactory(port(3), { ...baseInput, approved: true });
    expect(result.execution.completed).toHaveLength(2);
    expect(result.summary.status).toBe('partial-failure');
    expect(result.summary.failedTaskKey).toBe(result.tasks[2]?.key);
  });
});
