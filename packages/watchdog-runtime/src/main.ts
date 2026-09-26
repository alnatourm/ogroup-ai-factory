import { runWatchdogLoop, type FactorySnapshot, type WatchdogRecoveryPort, type WatchdogStatePort } from '@ogroup/watchdog-runner';

const repository = process.env.FACTORY_REPOSITORY ?? 'alnatourm/ogroup-ai-factory';
const token = process.env.GITHUB_TOKEN?.trim();
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS ?? '60000');
const recoveryCooldownMs = Number(process.env.WATCHDOG_RECOVERY_COOLDOWN_MS ?? '300000');
const lastRecoveryAt = new Map<string, number>();

function canRecover(runId: string): boolean {
  const now = Date.now();
  const previous = lastRecoveryAt.get(runId) ?? 0;
  if (now - previous < recoveryCooldownMs) {
    console.log(JSON.stringify({ type: 'WATCHDOG_RECOVERY_SUPPRESSED', runId, cooldownMs: recoveryCooldownMs, at: new Date().toISOString() }));
    return false;
  }
  lastRecoveryAt.set(runId, now);
  return true;
}

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
interface FactoryIssue { number: number; title: string; body?: string | null; updated_at: string; labels?: Array<{ name?: string }>; pull_request?: unknown; }
interface WorkflowRuns { workflow_runs?: Array<{ status: string; conclusion: string | null; updated_at: string; head_branch: string | null }>; }

const state: WatchdogStatePort = {
  async listRuns(): Promise<FactorySnapshot[]> {
    const [prsResponse, runsResponse, issuesResponse] = await Promise.all([
      github('/pulls?state=open&per_page=100'),
      github('/actions/runs?per_page=50'),
      github('/issues?state=open&labels=factory-work&per_page=100'),
    ]);
    const prs = await prsResponse.json() as PullRequest[];
    const runs = await runsResponse.json() as WorkflowRuns;
    const issues = (await issuesResponse.json() as FactoryIssue[]).filter((issue) => !issue.pull_request);
    const active = (runs.workflow_runs ?? []).some((run) => ['queued', 'in_progress', 'waiting', 'pending'].includes(run.status));
    const latest = (runs.workflow_runs ?? [])[0];
    const humanGate = prs.some((pr) => !pr.draft && (pr.labels ?? []).some((label) => label.name === 'human-gate'));
    if (issues.length > 0) {
      return issues.map((issue) => {
        const labels = new Set((issue.labels ?? []).map((label) => label.name).filter(Boolean));
        const waitingHuman = labels.has('human-gate') || labels.has('factory-status:waiting-human');
        const waitingDependency = labels.has('factory-status:waiting-dependency');
        const completed = labels.has('factory-status:completed');
        const issueActive = labels.has('factory-status:running') || labels.has('factory-status:verifying') || labels.has('factory-status:retrying');
        return {
          runId: `factory-work:${issue.number}`,
          workRemains: !completed,
          activeJob: issueActive,
          lastActivityAt: issue.updated_at,
          waitingHuman,
          waitingDependency,
          fallbackAvailable: labels.has('factory-fallback:approved'),
        };
      });
    }

    // Compatibility fallback until all Factory projects are represented by durable factory-work issues.
    const workRemains = prs.length > 0;
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

function targetRepository(issue: FactoryIssue): string {
  const match = issue.body?.match(/^Target-Repository:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\s*$/mi);
  return match?.[1] ?? repository;
}

async function targetGithub(target: string, path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`https://api.github.com/repos/${target}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`GITHUB_${response.status}_${target}_${path}`);
  return response;
}

async function hasMergedImplementation(target: string, runId: string): Promise<boolean> {
  const response = await targetGithub(target, '/pulls?state=closed&sort=updated&direction=desc&per_page=30');
  const pulls = await response.json() as Array<{ number: number; title?: string; merged_at?: string | null }>;
  const candidates = pulls.filter((pr) => pr.merged_at && pr.title === `Factory execution: ${runId}`);
  for (const pr of candidates) {
    const filesResponse = await targetGithub(target, `/pulls/${pr.number}/files?per_page=100`);
    const files = await filesResponse.json() as Array<{ filename: string }>;
    const implementationFiles = files.filter(({ filename }) =>
      !filename.startsWith('factory-evidence/') &&
      !filename.startsWith('.github/') &&
      !filename.endsWith('.md')
    );
    if (implementationFiles.length > 0) {
      console.log(JSON.stringify({ type: 'WATCHDOG_IMPLEMENTATION_EVIDENCE', runId, target, pr: pr.number, files: implementationFiles.map((file) => file.filename), at: new Date().toISOString() }));
      return true;
    }
    console.log(JSON.stringify({ type: 'WATCHDOG_EVIDENCE_ONLY_PR_REJECTED', runId, target, pr: pr.number, at: new Date().toISOString() }));
  }
  return false;
}

async function completeFactoryIssue(issueNumber: number, runId: string, target: string): Promise<void> {
  await github(`/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  });
  await github(`/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: ['factory-status:completed'] }),
  });
  console.log(JSON.stringify({ type: 'WATCHDOG_COMPLETED_FROM_MERGED_PR', runId, target, issueNumber, at: new Date().toISOString() }));
}

async function dispatchTo(target: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${target}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
  });
  if (!response.ok) throw new Error(`GITHUB_${response.status}_dispatch_${target}`);
}

async function dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
  await github('/dispatches', {
    method: 'POST',
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
    headers: { 'Content-Type': 'application/json' },
  });
}

const recovery: WatchdogRecoveryPort = {
  async startNextRunnable(runId) {
    if (!canRecover(runId)) return;
    if (runId.startsWith('factory-work:')) {
      const issueNumber = Number(runId.split(':')[1]);
      const response = await github(`/issues/${issueNumber}`);
      const issue = await response.json() as FactoryIssue;
      const target = targetRepository(issue);
      if (target !== repository) {
        if (await hasMergedImplementation(target, runId)) {
          await completeFactoryIssue(issueNumber, runId, target);
          return;
        }
        await dispatchTo(target, 'factory-work-execute', { runId, sourceRepository: repository, sourceIssue: issueNumber });
        return;
      }
    }
    await dispatch('factory-watchdog-continue', { runId, reason: 'IDLE_UNEXPECTED' });
  },
  async retryActiveJob(runId) { if (canRecover(runId)) await dispatch('factory-watchdog-retry', { runId, reason: 'STALLED' }); },
  async useApprovedFallback(runId) { if (canRecover(runId)) await dispatch('factory-watchdog-fallback', { runId }); },
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
