import { describe, expect, it } from 'vitest';
import { defineProduct, textDirection } from '@ogroup/product-template';
import { InMemoryTenantResourceStore } from '@ogroup/example-resource';
import { localeDirection, translate } from '../../apps/web/src/i18n.js';

describe('product template', () => {
  it('defines an Arabic-first MENA SaaS product contract', () => {
    const product = defineProduct({
      productName: 'Factory Demo',
      market: 'Jordan',
      industry: 'B2B SaaS',
      platforms: ['web', 'api'],
      languages: ['ar', 'en'],
      defaultLanguage: 'ar',
    });

    expect(product.defaultLanguage).toBe('ar');
    expect(product.languages).toEqual(['ar', 'en']);
    expect(textDirection('ar')).toBe('rtl');
    expect(localeDirection('en')).toBe('ltr');
    expect(translate('ar', 'welcome')).toBe('مرحباً');
  });

  it('never returns a tenant-owned record to another tenant', async () => {
    const store = new InMemoryTenantResourceStore([
      { id: 'resource-1', tenantId: 'tenant-a', name: 'A only' },
      { id: 'resource-2', tenantId: 'tenant-b', name: 'B only' },
    ]);

    expect(await store.findById('resource-1', 'tenant-a')).toMatchObject({ name: 'A only' });
    expect(await store.findById('resource-1', 'tenant-b')).toBeNull();
    expect((await store.list('tenant-a')).map((record) => record.id)).toEqual(['resource-1']);
  });

  it('rejects a default language that is not enabled', () => {
    expect(() => defineProduct({
      productName: 'Bad Config',
      market: 'Jordan',
      industry: 'SaaS',
      platforms: ['web'],
      languages: ['en'],
      defaultLanguage: 'ar',
    })).toThrow('DEFAULT_LANGUAGE_NOT_ENABLED');
  });
});
