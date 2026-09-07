import { describe, expect, it } from 'vitest';
import { generateProductBootstrap } from '../packages/product-generator/src/index.js';

const input = {
  productName: 'O Clinic',
  market: 'Jordan',
  industry: 'Healthcare',
  platforms: ['web', 'api'] as const,
  languages: ['ar', 'en'] as const,
  defaultLanguage: 'ar' as const,
  description: 'Clinic operations SaaS for the Jordan market.',
};

describe('product bootstrap generator', () => {
  it('generates deterministic governed starter files', () => {
    const first = generateProductBootstrap({ ...input, platforms: [...input.platforms], languages: [...input.languages] });
    const second = generateProductBootstrap({ ...input, platforms: [...input.platforms], languages: [...input.languages] });

    expect(first).toEqual(second);
    expect(first.slug).toBe('o-clinic');
    expect(first.workspaces).toContain('apps/web');
    expect(first.coreIntegrations).toEqual(expect.arrayContaining(['auth', 'tenancy', 'rbac']));
    expect(first.files.map((file) => file.path)).toEqual([
      'product.json',
      'README.md',
      'docs/product/PRODUCT.md',
      'docs/product/REQUIREMENTS.md',
    ]);
    expect(first.files[3]?.content).toContain('Reuse OGroup Core tenancy');
  });

  it('rejects missing descriptions', () => {
    expect(() => generateProductBootstrap({ ...input, platforms: [...input.platforms], languages: [...input.languages], description: '  ' })).toThrow('PRODUCT_DESCRIPTION_REQUIRED');
  });

  it('rejects product names that cannot produce a safe slug', () => {
    expect(() => generateProductBootstrap({ ...input, platforms: [...input.platforms], languages: [...input.languages], productName: 'عيادة' })).toThrow('PRODUCT_SLUG_INVALID');
  });
});
