import { describe, expect, it } from 'vitest';
import { APPROVED_ROUTES } from '../types/routes';

describe('approved frontend routes', () => {
  it('contains exactly the eight approved product routes', () => {
    expect(APPROVED_ROUTES.map((route) => route.id)).toEqual([
      'workspace-onboarding',
      'provider-connections',
      'gateway-playground',
      'workflow-builder',
      'workflow-runs',
      'document-intelligence',
      'usage-dashboard',
      'data-policy',
    ]);
  });

  it('provides Arabic and English labels for every route', () => {
    for (const route of APPROVED_ROUTES) {
      expect(route.titleAr.trim()).not.toBe('');
      expect(route.titleEn.trim()).not.toBe('');
      expect(route.path.startsWith('/')).toBe(true);
    }
  });
});
