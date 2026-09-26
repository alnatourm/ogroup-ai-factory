import { describe, expect, it } from 'vitest';

describe('Watchdog runtime contract', () => {
  it('keeps runtime credentials outside source code', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('packages/watchdog-runtime/src/main.ts', 'utf8'));
    expect(source).toContain('process.env.GITHUB_TOKEN');
    expect(source).not.toMatch(/github_pat_|ghp_/);
  });

  it('uses durable Factory work items before repository activity fallback', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('packages/watchdog-runtime/src/main.ts', 'utf8'));
    expect(source).toContain('labels=factory-work');
    expect(source).toContain('factory-status:waiting-human');
    expect(source).toContain('factory-status:waiting-dependency');
    expect(source).toContain('factory-status:running');
    expect(source).toContain('factory-status:completed');
    expect(source).toContain('factory-fallback:approved');
    expect(source).toContain('Compatibility fallback');
  });
});
