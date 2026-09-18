import { describe, expect, it } from 'vitest';
import { reviewGeneratedDesign } from '../packages/design-review-agent/src/index.js';

const request = {
  productId: 'arabic-ai-ipaas',
  projectTitle: 'Arabic AI iPaaS',
  screens: [
    { key: 'one', title: 'One', prompt: 'Arabic first', deviceType: 'DESKTOP' },
    { key: 'two', title: 'Two', prompt: 'Arabic first', deviceType: 'DESKTOP' },
  ],
};

const generated = {
  provider: 'stitch',
  productId: 'arabic-ai-ipaas',
  projectId: 'project-1',
  status: 'DESIGN_GENERATED',
  screens: [
    { key: 'one', title: 'One', projectId: 'project-1', screenId: 's1', htmlUrl: 'https://x/1', imageUrl: null },
    { key: 'two', title: 'Two', projectId: 'project-1', screenId: 's2', htmlUrl: 'https://x/2', imageUrl: null },
  ],
};

const goodHtml = `<!doctype html><html lang="ar" dir="rtl"><head><meta name="viewport" content="width=device-width"></head><body><h1>منصة الذكاء الاصطناعي العربية</h1><p>إدارة مساحة العمل ومزود الذكاء الاصطناعي والخصوصية والتشغيل.</p><button>متابعة</button></body></html>`;

describe('Design Review Agent', () => {
  it('passes complete Arabic RTL generated screens', async () => {
    const result = await reviewGeneratedDesign(request, generated, async () => goodHtml);
    expect(result.status).toBe('DESIGN_PASS');
    expect(result.summary.passedScreens).toBe(2);
    expect(result.summary.rtlScreens).toBe(2);
  });

  it('requires revision when a screen is missing', async () => {
    const result = await reviewGeneratedDesign(
      request,
      { ...generated, screens: [generated.screens[0]!] },
      async () => goodHtml,
    );
    expect(result.status).toBe('DESIGN_REVISION_REQUIRED');
    expect(result.blockingIssues.some((issue) => issue.includes('Missing generated screen'))).toBe(true);
  });

  it('blocks credential-like values in generated HTML', async () => {
    const risky = goodHtml.replace('</body>', '<code>api_key="sk-12345678901234567890"</code></body>');
    const result = await reviewGeneratedDesign(request, generated, async () => risky);
    expect(result.status).toBe('DESIGN_REVISION_REQUIRED');
    expect(result.blockingIssues.some((issue) => issue.includes('credential-like'))).toBe(true);
    const evidence = result.screens[0]?.secretEvidence[0];
    expect(evidence?.kind).toBe('openai-like-key');
    expect(evidence?.context).toContain('[REDACTED openai-like-key]');
    expect(evidence?.context).not.toContain('sk-12345678901234567890');
  });
});
