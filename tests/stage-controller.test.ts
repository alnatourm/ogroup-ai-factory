import { describe, expect, it } from 'vitest';
import { constitutionWorkItems, selectNextFactoryStage, validateConstitutionTransition, type FactoryWorkItem } from '@ogroup/stage-controller';

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


describe('Factory constitution pipeline',()=>{
  it('locks the canonical lifecycle order',()=>{
    expect(constitutionWorkItems().map(x=>x.stage)).toEqual(['idea','requirements','design','design-approval','build','testing','security','review','production-approval','deploy','verify','live']);
  });
  it('refuses to skip unverified stages',()=>{
    const items=constitutionWorkItems();
    items.find(x=>x.stage==='idea')!.status='completed';
    expect(validateConstitutionTransition(items,'build')).toEqual({allowed:false,reason:'DEPENDENCY_NOT_VERIFIED:design-approval'});
  });
  it('requires human authority at both approval gates',()=>{
    const items=constitutionWorkItems();
    for(const stage of ['idea','requirements','design']) items.find(x=>x.stage===stage)!.status='completed';
    expect(validateConstitutionTransition(items,'design-approval')).toEqual({allowed:false,reason:'HUMAN_APPROVAL_REQUIRED'});
    items.find(x=>x.stage==='design-approval')!.approved=true;
    expect(validateConstitutionTransition(items,'design-approval')).toEqual({allowed:true});
  });
});
