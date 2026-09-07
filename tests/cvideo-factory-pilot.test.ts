import { describe, expect, it } from 'vitest';
import { orchestrateProduct } from '../packages/orchestrator/src/index.js';
import { emitGitHubTasks } from '../packages/github-task-emitter/src/index.js';

const cvideo = {
  productName: 'CVideo',
  market: 'MENA',
  industry: 'Recruitment / HR Tech',
  platforms: ['web', 'api'] as ('web' | 'api')[],
  languages: ['ar', 'en'] as ('ar' | 'en')[],
  defaultLanguage: 'ar' as const,
  description: 'Video-first candidate discovery where recruiters initiate contact and candidates do not apply to jobs.',
};

describe('CVideo factory pilot', () => {
  it('produces the expected governed factory plan', () => {
    const plan = orchestrateProduct(cvideo);
    expect(plan.product.slug).toBe('cvideo');
    expect(plan.product.config.defaultLanguage).toBe('ar');
    expect(plan.stages.map((stage) => stage.id)).toEqual([
      'product', 'architecture', 'database', 'backend', 'frontend', 'qa', 'security', 'review', 'release',
    ]);
    expect(plan.humanGates).toContain('Authentication, authorization and tenant isolation');
    expect(plan.humanGates).toContain('Production release');
  });

  it('emits agent-ready tasks without granting merge authority', () => {
    const tasks = emitGitHubTasks(orchestrateProduct(cvideo), ['pilot:cvideo']);
    expect(tasks).toHaveLength(9);
    expect(tasks.every((task) => task.labels.includes('pilot:cvideo'))).toBe(true);
    expect(tasks.every((task) => task.body.includes('does not grant merge or production authority'))).toBe(true);
  });
});
