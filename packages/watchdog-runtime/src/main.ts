import { runWatchdogLoop, type FactorySnapshot, type WatchdogRecoveryPort, type WatchdogStatePort } from '@ogroup/watchdog-runner';

const repository = process.env.FACTORY_REPOSITORY ?? 'alnatourm/ogroup-ai-factory';
const token = process.env.GITHUB_TOKEN?.trim();
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS ?? '60000');

if (!token) throw new Error('GITHUB_TOKEN_REQUIRED');

async function github(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`GITHUB_${response.status}_${path}`);
  return response;
}

interface PullRequest { number: number; draft: boolean; updated_at: string; labels?: Array<{ name?: string }>; }
interface WorkflowRuns { workflow_runs?: Array<{ status: string; conclusion: string | null; updated_at: string; head_branch: string | null }>; }

const state: WatchdogStatePort = {
  async listRuns(): Promise<FactorySnapshot[]> {
    const [prsResponse, runsResponse] = await Promise.all([
      github('/pulls?state=open&per_page=100'),
      github('/actions/runs?per_page=50'),
    ]);
    const prs = await prsResponse.json() as PullRequest[];
    const runs = await runsResponse.json() as WorkflowRuns;
    const active = (runs.workflow_runs ?? []).some((run) => ['queued', 'in_progress', 'waiting', 'pending'].includes(run.status));
    const latest = (runs.workflow_runs ?? [])[0];
    const humanGate = prs.some((pr) => !pr.draft && (pr.labels ?? []).some((label) => label.name === 'human-gate'));
    const workRemains = prs.length > 0 || active;
    return [{
      runId: `github:${repository}`,
      workRemains,
      activeJob: active,
      lastActivityAt: latest?.updated_at ?? null,
      waitingHuman: humanGate,
      fallbackAvailable: false,
    }];
  },
};

async function dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
  await github('/dispatches', {
    method: 'POST',
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
    headers: { 'Content-Type': 'application/json' },
  });
}

const recovery: WatchdogRecoveryPort = {
  async startNextRunnable(runId) { await dispatch('factory-watchdog-continue', { runId, reason: 'IDLE_UNEXPECTED' }); },
  async retryActiveJob(runId) { await dispatch('factory-watchdog-retry', { runId, reason: 'STALLED' }); },
  async useApprovedFallback(runId) { await dispatch('factory-watchdog-fallback', { runId }); },
  async escalateHuman(runId, reason) {
    console.log(JSON.stringify({ type: 'WAITING_HUMAN', runId, reason, at: new Date().toISOString() }));
  },
};

console.log(JSON.stringify({ type: 'WATCHDOG_STARTED', repository, intervalMs, at: new Date().toISOString() }));
await runWatchdogLoop(state, recovery, {
  intervalMs,
  onTick(results) { console.log(JSON.stringify({ type: 'WATCHDOG_TICK', results, at: new Date().toISOString() })); },
  onError(error) { console.error(JSON.stringify({ type: 'WATCHDOG_ERROR', error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() })); },
});
