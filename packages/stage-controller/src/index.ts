export type FactoryWorkStatus =
  | 'queued'
  | 'running'
  | 'verifying'
  | 'retrying'
  | 'waiting-human'
  | 'waiting-dependency'
  | 'completed'
  | 'failed';

export interface FactoryWorkItem {
  id: string;
  stage: string;
  dependsOn: string[];
  humanGate: boolean;
  approved?: boolean;
  status: FactoryWorkStatus;
}

export interface StageSelection {
  next: FactoryWorkItem | null;
  blockedByHuman: FactoryWorkItem[];
  blockedByDependency: FactoryWorkItem[];
  complete: boolean;
}

const active = new Set<FactoryWorkStatus>(['running', 'verifying', 'retrying']);

export function selectNextFactoryStage(items: FactoryWorkItem[]): StageSelection {
  const completed = new Set(items.filter((item) => item.status === 'completed').map((item) => item.stage));
  const blockedByHuman: FactoryWorkItem[] = [];
  const blockedByDependency: FactoryWorkItem[] = [];

  if (items.some((item) => active.has(item.status))) {
    return { next: null, blockedByHuman, blockedByDependency, complete: false };
  }

  for (const item of items) {
    if (item.status === 'completed' || item.status === 'failed') continue;
    if (!item.dependsOn.every((dependency) => completed.has(dependency))) {
      blockedByDependency.push(item);
      continue;
    }
    if (item.humanGate && !item.approved) {
      blockedByHuman.push(item);
      continue;
    }
    if (item.status === 'queued' || item.status === 'waiting-dependency') {
      return { next: item, blockedByHuman, blockedByDependency, complete: false };
    }
  }

  return {
    next: null,
    blockedByHuman,
    blockedByDependency,
    complete: items.length > 0 && items.every((item) => item.status === 'completed'),
  };
}


export const FACTORY_CONSTITUTION_PIPELINE = [
  'idea','requirements','design','design-approval','build','testing','security','review','production-approval','deploy','verify','live',
] as const;
export type ConstitutionStage = typeof FACTORY_CONSTITUTION_PIPELINE[number];

const HUMAN_GATES = new Set<ConstitutionStage>(['design-approval','production-approval']);

export function constitutionWorkItems(): FactoryWorkItem[] {
  return FACTORY_CONSTITUTION_PIPELINE.map((stage,index)=>({
    id:`constitution:${stage}`,stage,
    dependsOn:index===0?[]:[FACTORY_CONSTITUTION_PIPELINE[index-1]],
    humanGate:HUMAN_GATES.has(stage),status:'queued',
  }));
}

export function validateConstitutionTransition(items: FactoryWorkItem[], targetStage: ConstitutionStage): {allowed:boolean;reason?:string} {
  const target=items.find(item=>item.stage===targetStage);
  if(!target)return {allowed:false,reason:'STAGE_NOT_DEFINED'};
  const completed=new Set(items.filter(item=>item.status==='completed').map(item=>item.stage));
  const missing=target.dependsOn.filter(dep=>!completed.has(dep));
  if(missing.length)return {allowed:false,reason:`DEPENDENCY_NOT_VERIFIED:${missing.join(',')}`};
  if(target.humanGate&&!target.approved)return {allowed:false,reason:'HUMAN_APPROVAL_REQUIRED'};
  return {allowed:true};
}
