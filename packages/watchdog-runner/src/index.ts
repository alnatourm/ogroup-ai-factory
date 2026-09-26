import { evaluateFactoryWatchdog, nextRecoveryAction, type WatchdogDecision, type WatchdogInput } from '@ogroup/watchdog';

export interface FactorySnapshot extends WatchdogInput {
  runId: string;
  retryCount?: number;
  maxRetries?: number;
  fallbackAvailable?: boolean;
}

export interface WatchdogStatePort {
  listRuns(): Promise<FactorySnapshot[]>;
}

export interface WatchdogRecoveryPort {
  startNextRunnable(runId: string): Promise<void>;
  retryActiveJob(runId: string): Promise<void>;
  useApprovedFallback(runId: string): Promise<void>;
  escalateHuman(runId: string, reason: string): Promise<void>;
}

export interface WatchdogTickResult {
  runId: string;
  decision: WatchdogDecision;
  action: ReturnType<typeof nextRecoveryAction>;
  acted: boolean;
}

export async function watchdogTick(
  state: WatchdogStatePort,
  recovery: WatchdogRecoveryPort,
): Promise<WatchdogTickResult[]> {
  const runs = await state.listRuns();
  const results: WatchdogTickResult[] = [];

  for (const run of runs) {
    const decision = evaluateFactoryWatchdog(run);
    const action = nextRecoveryAction(decision, run.retryCount ?? 0, run.maxRetries ?? 2, run.fallbackAvailable ?? false);
    let acted = false;

    if (action === 'START_NEXT_RUNNABLE') { await recovery.startNextRunnable(run.runId); acted = true; }
    else if (action === 'RETRY_ACTIVE_JOB') { await recovery.retryActiveJob(run.runId); acted = true; }
    else if (action === 'USE_APPROVED_FALLBACK') { await recovery.useApprovedFallback(run.runId); acted = true; }
    else if (action === 'ESCALATE_HUMAN') { await recovery.escalateHuman(run.runId, decision.reason); acted = true; }

    results.push({ runId: run.runId, decision, action, acted });
  }
  return results;
}

export interface WatchdogLoopOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onTick?: (results: WatchdogTickResult[]) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

export async function runWatchdogLoop(
  state: WatchdogStatePort,
  recovery: WatchdogRecoveryPort,
  options: WatchdogLoopOptions = {},
): Promise<void> {
  const intervalMs = options.intervalMs ?? 60_000;
  while (!options.signal?.aborted) {
    try {
      const results = await watchdogTick(state, recovery);
      await options.onTick?.(results);
    } catch (error) {
      await options.onError?.(error);
    }
    if (options.signal?.aborted) break;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      options.signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }
}
