import { describe, expect, it } from 'vitest';
import { orchestrateProduct } from '../packages/orchestrator/src/index.js';
import { emitGitHubTasks } from '../packages/github-task-emitter/src/index.js';

const plan = orchestrateProduct({
  productName: 'Doors', market: 'Jordan', industry: 'Commerce', platforms: ['web', 'api'], languages: ['ar', 'en'],
  defaultLanguage: 'ar', description: 'MENA commerce platform.', priority: 'high', targetMilestone: 'MVP',
});

describe('GitHub task emitter', () => {
  it('emits deterministic tasks in orchestrator order', () => {
    const first = emitGitHubTasks(plan);
    const second = emitGitHubTasks(plan);
    expect(first).toEqual(second);
    expect(first.map((task) => task.key)).toEqual(plan.stages.map((stage) => stage.id));
    expect(first[0]?.title).toBe('[doors] Product definition');
  });

  it('preserves dependency relationships and gates', () => {
    const tasks = emitGitHubTasks(plan);
    expect(tasks.find((task) => task.key === 'backend')?.dependsOn).toEqual(['architecture', 'database']);
    expect(tasks.find((task) => task.key === 'security')?.dependsOn).toEqual(['backend', 'frontend', 'qa']);
    expect(tasks.find((task) => task.key === 'release')?.humanGate).toBe(true);
    expect(tasks.find((task) => task.key === 'release')?.labels).toContain('human-gate');
  });

  it('puts evidence, security and authority boundaries into every task', () => {
    for (const task of emitGitHubTasks(plan, ['product:doors'])) {
      expect(task.body).toContain('## Required Evidence');
      expect(task.body).toContain('## Security & Testing');
      expect(task.body).toContain('does not grant merge or production authority');
      expect(task.labels).toContain('product:doors');
    }
  });
});
