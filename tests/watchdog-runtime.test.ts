import { describe, expect, it } from 'vitest';

describe('Watchdog runtime contract', () => {
  it('keeps runtime credentials outside source code', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('packages/watchdog-runtime/src/main.ts', 'utf8'));
    expect(source).toContain('process.env.GITHUB_TOKEN');
    expect(source).not.toMatch(/github_pat_|ghp_/);
  });
});
