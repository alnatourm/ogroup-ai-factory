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
