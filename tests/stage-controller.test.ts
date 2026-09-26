import { describe, expect, it } from 'vitest';
import { selectNextFactoryStage, type FactoryWorkItem } from '@ogroup/stage-controller';

const work = (overrides: Partial<FactoryWorkItem> & Pick<FactoryWorkItem, 'id' | 'stage'>): FactoryWorkItem => ({
  dependsOn: [],
  humanGate: false,
  status: 'queued',
  ...overrides,
});

describe('Factory stage controller', () => {
  it('selects the next dependency-ready stage', () => {
    const result = selectNextFactoryStage([
      work({ id: '1', stage: 'product', status: 'completed' }),
      work({ id: '2', stage: 'design', dependsOn: ['product'] }),
      work({ id: '3', stage: 'frontend', dependsOn: ['design'] }),
    ]);
    expect(result.next?.stage).toBe('design');
  });

  it('does not launch a second stage while work is active', () => {
    const result = selectNextFactoryStage([
      work({ id: '1', stage: 'design', status: 'running' }),
      work({ id: '2', stage: 'frontend' }),
    ]);
    expect(result.next).toBeNull();
  });

  it('stops at an unapproved human gate', () => {
    const result = selectNextFactoryStage([
      work({ id: '1', stage: 'product', status: 'completed' }),
      work({ id: '2', stage: 'release', dependsOn: ['product'], humanGate: true }),
    ]);
    expect(result.next).toBeNull();
    expect(result.blockedByHuman.map((item) => item.stage)).toEqual(['release']);
  });

  it('continues through an approved human gate', () => {
    const result = selectNextFactoryStage([
      work({ id: '1', stage: 'product', status: 'completed' }),
      work({ id: '2', stage: 'release', dependsOn: ['product'], humanGate: true, approved: true }),
    ]);
    expect(result.next?.stage).toBe('release');
  });
});
