import { describe, expect, it } from 'vitest';
import { evaluateFactoryWatchdog, nextRecoveryAction } from '@ogroup/watchdog';

describe('Factory Watchdog', () => {
  it('detects unexpected idle when executable work remains', () => {
    const decision = evaluateFactoryWatchdog({ workRemains: true, activeJob: false });
    expect(decision.state).toBe('IDLE_UNEXPECTED');
    expect(decision.healthy).toBe(false);
    expect(nextRecoveryAction(decision)).toBe('START_NEXT_RUNNABLE');
  });

  it('detects a stalled worker from heartbeat age', () => {
    const decision = evaluateFactoryWatchdog({
      workRemains: true,
      activeJob: true,
      lastActivityAt: '2026-09-26T04:00:00Z',
      now: '2026-09-26T04:20:01Z',
      stallAfterMs: 10 * 60 * 1000,
    });
    expect(decision.state).toBe('STALLED');
    expect(nextRecoveryAction(decision)).toBe('RETRY_ACTIVE_JOB');
  });

  it('does not interrupt a genuine human gate', () => {
    const decision = evaluateFactoryWatchdog({ workRemains: true, activeJob: false, waitingHuman: true });
    expect(decision.state).toBe('WAITING_HUMAN');
    expect(decision.recoveryRequired).toBe(false);
  });

  it('uses an approved fallback after retries are exhausted', () => {
    const decision = evaluateFactoryWatchdog({ workRemains: true, activeJob: true, lastActivityAt: '2026-09-26T04:00:00Z', now: '2026-09-26T05:00:00Z' });
    expect(nextRecoveryAction(decision, 2, 2, true)).toBe('USE_APPROVED_FALLBACK');
  });
});
