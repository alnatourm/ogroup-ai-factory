import { describe, expect, it } from 'vitest';
import { orchestrateProduct } from '../packages/orchestrator/src/index.js';

const request = {
  productName: 'Doors',
  market: 'Jordan',
  industry: 'Marketplace',
  platforms: ['web', 'api'] as const,
  languages: ['ar', 'en'] as const,
  defaultLanguage: 'ar' as const,
  description: 'Reverse marketplace for service and product quotations.',
};

describe('factory orchestrator', () => {
  it('creates a deterministic ordered plan', () => {
    const first = orchestrateProduct({ ...request, platforms: [...request.platforms], languages: [...request.languages] });
    const second = orchestrateProduct({ ...request, platforms: [...request.platforms], languages: [...request.languages] });

    expect(first).toEqual(second);
    expect(first.stages.map((stage) => stage.id)).toEqual([
      'product', 'architecture', 'database', 'backend', 'frontend', 'qa', 'security', 'review', 'release',
    ]);
  });

  it('prevents implementation stages from preceding product and architecture', () => {
    const plan = orchestrateProduct({ ...request, platforms: [...request.platforms], languages: [...request.languages] });
    const stage = Object.fromEntries(plan.stages.map((item) => [item.id, item]));

    expect(stage.architecture?.dependsOn).toEqual(['product']);
    expect(stage.database?.dependsOn).toEqual(['architecture']);
    expect(stage.backend?.dependsOn).toEqual(['architecture', 'database']);
    expect(stage.qa?.dependsOn).toEqual(['backend', 'frontend']);
    expect(stage.security?.dependsOn).toEqual(['backend', 'frontend', 'qa']);
    expect(stage.review?.dependsOn).toEqual(['qa', 'security']);
    expect(stage.release?.dependsOn).toEqual(['review']);
  });

  it('keeps production and shared-core authority behind human gates', () => {
    const plan = orchestrateProduct({ ...request, platforms: [...request.platforms], languages: [...request.languages] });
    expect(plan.humanGates).toContain('Shared OGroup Core changes');
    expect(plan.humanGates).toContain('Production release');
    expect(plan.stages.find((stage) => stage.id === 'release')?.humanGate).toBe(true);
  });
});
