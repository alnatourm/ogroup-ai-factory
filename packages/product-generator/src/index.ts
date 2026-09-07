import { defineProduct, type ProductLanguage, type ProductPlatform } from '@ogroup/product-template';

export interface ProductBootstrapInput {
  productName: string;
  market: string;
  industry: string;
  platforms: ProductPlatform[];
  languages: ProductLanguage[];
  defaultLanguage: ProductLanguage;
  description: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ProductBootstrapPlan {
  slug: string;
  config: ReturnType<typeof defineProduct> & { description: string };
  workspaces: string[];
  coreIntegrations: string[];
  securityChecklist: string[];
  testChecklist: string[];
  files: GeneratedFile[];
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new Error('PRODUCT_SLUG_INVALID');
  return slug;
}

export function generateProductBootstrap(input: ProductBootstrapInput): ProductBootstrapPlan {
  const description = input.description.trim();
  if (!description) throw new Error('PRODUCT_DESCRIPTION_REQUIRED');

  const base = defineProduct(input);
  const slug = slugify(base.productName);
  const config = Object.freeze({ ...base, description });
  const workspaces = ['apps/api', ...(base.platforms.includes('web') ? ['apps/web'] : []), ...(base.platforms.includes('mobile') ? ['apps/mobile'] : []), 'modules', 'packages'];
  const coreIntegrations = ['auth', 'tenancy', 'rbac', 'validation', 'logging', 'audit', 'database', 'repositories'];
  const securityChecklist = [
    'Enforce tenant context on every tenant-owned query',
    'Enforce authorization on the server',
    'Validate all external input',
    'Keep secrets outside source control',
    'Audit sensitive actions',
  ];
  const testChecklist = [
    'Acceptance criteria tests',
    'Tenant isolation tests',
    'RBAC authorization tests',
    'Validation and error-path tests',
    'Arabic RTL and English LTR checks where UI exists',
  ];

  const metadata = JSON.stringify({ ...config, slug }, null, 2) + '\n';
  const readme = `# ${base.productName}\n\n${description}\n\nMarket: ${base.market}\nIndustry: ${base.industry}\n\nGenerated from the OGroup AI Product Factory.\n`;
  const product = `# Product\n\n## Name\n${base.productName}\n\n## Market\n${base.market}\n\n## Industry\n${base.industry}\n\n## Description\n${description}\n`;
  const requirements = `# Requirements\n\n## Product Goal\n${description}\n\n## Platforms\n${base.platforms.join(', ')}\n\n## Languages\n${base.languages.join(', ')}\n\n## Core Requirements\n${coreIntegrations.map((item) => `- Reuse OGroup Core ${item}`).join('\n')}\n`;

  return Object.freeze({
    slug,
    config,
    workspaces: Object.freeze([...workspaces]) as unknown as string[],
    coreIntegrations: Object.freeze([...coreIntegrations]) as unknown as string[],
    securityChecklist: Object.freeze([...securityChecklist]) as unknown as string[],
    testChecklist: Object.freeze([...testChecklist]) as unknown as string[],
    files: Object.freeze([
      { path: 'product.json', content: metadata },
      { path: 'README.md', content: readme },
      { path: 'docs/product/PRODUCT.md', content: product },
      { path: 'docs/product/REQUIREMENTS.md', content: requirements },
    ]) as unknown as GeneratedFile[],
  });
}
