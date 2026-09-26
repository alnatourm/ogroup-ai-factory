import { describe, expect, it, vi } from 'vitest';
import { watchdogTick } from '@ogroup/watchdog-runner';

describe('Watchdog runner', () => {
  it('starts the next runnable job when a run is unexpectedly idle', async () => {
    const startNextRunnable = vi.fn(async () => undefined);
    const recovery = { startNextRunnable, retryActiveJob: vi.fn(), useApprovedFallback: vi.fn(), escalateHuman: vi.fn() };
    const state = { listRuns: async () => [{ runId: 'run-1', workRemains: true, activeJob: false }] };
    const [result] = await watchdogTick(state, recovery);
    expect(result?.action).toBe('START_NEXT_RUNNABLE');
    expect(startNextRunnable).toHaveBeenCalledWith('run-1');
  });

  it('retries a stalled job without human interruption', async () => {
    const retryActiveJob = vi.fn(async () => undefined);
    const recovery = { startNextRunnable: vi.fn(), retryActiveJob, useApprovedFallback: vi.fn(), escalateHuman: vi.fn() };
    const state = { listRuns: async () => [{ runId: 'run-2', workRemains: true, activeJob: true, lastActivityAt: '2026-09-26T04:00:00Z', now: '2026-09-26T05:00:00Z' }] };
    const [result] = await watchdogTick(state, recovery);
    expect(result?.action).toBe('RETRY_ACTIVE_JOB');
    expect(retryActiveJob).toHaveBeenCalledWith('run-2');
  });

  it('does nothing during a genuine human gate', async () => {
    const recovery = { startNextRunnable: vi.fn(), retryActiveJob: vi.fn(), useApprovedFallback: vi.fn(), escalateHuman: vi.fn() };
    const state = { listRuns: async () => [{ runId: 'run-3', workRemains: true, activeJob: false, waitingHuman: true }] };
    const [result] = await watchdogTick(state, recovery);
    expect(result?.action).toBe('NONE');
    expect(Object.values(recovery).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });
});
