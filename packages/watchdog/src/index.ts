export type FactoryWatchdogState =
  | 'QUEUED'
  | 'RUNNING'
  | 'VERIFYING'
  | 'RETRYING'
  | 'WAITING_DEPENDENCY'
  | 'WAITING_HUMAN'
  | 'COMPLETED'
  | 'FAILED'
  | 'STALLED'
  | 'IDLE_UNEXPECTED';

export interface WatchdogInput {
  workRemains: boolean;
  activeJob: boolean;
  lastActivityAt?: string | null;
  now?: string;
  stallAfterMs?: number;
  waitingHuman?: boolean;
  waitingDependency?: boolean;
}

export interface WatchdogDecision {
  state: FactoryWatchdogState;
  healthy: boolean;
  recoveryRequired: boolean;
  reason: string;
}

export function evaluateFactoryWatchdog(input: WatchdogInput): WatchdogDecision {
  if (input.waitingHuman) {
    return { state: 'WAITING_HUMAN', healthy: true, recoveryRequired: false, reason: 'A genuine human gate is active.' };
  }
  if (input.waitingDependency) {
    return { state: 'WAITING_DEPENDENCY', healthy: true, recoveryRequired: false, reason: 'An external dependency is being monitored.' };
  }
  if (!input.workRemains) {
    return { state: 'COMPLETED', healthy: true, recoveryRequired: false, reason: 'No executable work remains.' };
  }
  if (!input.activeJob) {
    return { state: 'IDLE_UNEXPECTED', healthy: false, recoveryRequired: true, reason: 'Executable work remains but no worker is active.' };
  }

  const now = Date.parse(input.now ?? new Date().toISOString());
  const last = input.lastActivityAt ? Date.parse(input.lastActivityAt) : Number.NaN;
  const timeout = input.stallAfterMs ?? 10 * 60 * 1000;
  if (!Number.isNaN(last) && now - last > timeout) {
    return { state: 'STALLED', healthy: false, recoveryRequired: true, reason: 'The active job exceeded the heartbeat timeout.' };
  }
  return { state: 'RUNNING', healthy: true, recoveryRequired: false, reason: 'Work is active and progressing.' };
}

export type RecoveryAction = 'START_NEXT_RUNNABLE' | 'RETRY_ACTIVE_JOB' | 'USE_APPROVED_FALLBACK' | 'ESCALATE_HUMAN' | 'NONE';

export function nextRecoveryAction(decision: WatchdogDecision, retryCount = 0, maxRetries = 2, fallbackAvailable = false): RecoveryAction {
  if (!decision.recoveryRequired) return 'NONE';
  if (decision.state === 'IDLE_UNEXPECTED') return 'START_NEXT_RUNNABLE';
  if (decision.state === 'STALLED' && retryCount < maxRetries) return 'RETRY_ACTIVE_JOB';
  if (fallbackAvailable) return 'USE_APPROVED_FALLBACK';
  return 'ESCALATE_HUMAN';
}
