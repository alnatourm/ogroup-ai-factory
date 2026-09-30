import { runWatchdogLoop, type FactorySnapshot, type WatchdogRecoveryPort, type WatchdogStatePort } from '@ogroup/watchdog-runner';

const repository = process.env.FACTORY_REPOSITORY ?? 'alnatourm/ogroup-ai-factory';
const token = process.env.GITHUB_TOKEN?.trim();
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS ?? '60000');
const recoveryCooldownMs = Number(process.env.WATCHDOG_RECOVERY_COOLDOWN_MS ?? '300000');
const rawControlApiUrl = process.env.RAILWAY_SERVICE_FACTORY_CONTROL_API_URL?.trim() ?? '';
const controlApiUrl = rawControlApiUrl && !/^https?:\/\//i.test(rawControlApiUrl) ? `https://${rawControlApiUrl}` : rawControlApiUrl;
const controlApiKey = process.env.FACTORY_CONTROL_API_KEY?.trim() ?? '';
const lastRecoveryAt = new Map<string, number>();

const DASHBOARD_SLICES = [
  'dashboard-shell-home',
  'dashboard-create-product',
  'dashboard-control-room',
  'dashboard-design-review',
  'dashboard-agents-health',
  'dashboard-attention-activity',
] as const;

interface FactoryComment { body?: string | null; }

async function factoryComments(issueNumber: number): Promise<FactoryComment[]> {
  const response = await github(`/issues/${issueNumber}/comments?per_page=100`);
  return await response.json() as FactoryComment[];
}

function completedSlices(comments: FactoryComment[], runId: string): Set<string> {
  const done = new Set<string>();
  for (const comment of comments) {
    const firstLine = (comment.body ?? '').split('\n', 1)[0]?.trim() ?? '';
    const [marker, markerRunId, sliceId] = firstLine.split(/\s+/);
    if (marker === 'FACTORY_SLICE_COMPLETED' && markerRunId === runId && sliceId) done.add(sliceId);
  }
  return done;
}
function nextDashboardSlice(done: Set<string>): string | null {
  return DASHBOARD_SLICES.find((slice) => !done.has(slice)) ?? null;
}

function productIntent(issue: FactoryIssue): string {
  const body=issue.body??'';
  const match=body.match(/(?:^|\n)Product intent:\s*(.+)/i);
  return match?.[1]?.trim()??'';
}

function isDashboardTarget(target: string): boolean {
  return target.toLowerCase()==='alnatourm/ai-factory-dashboard';
}

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

    // No durable factory-work issue means there is no customer run for Watchdog to recover.
    // Open engineering PRs and CI runs are builder activity, not autonomous product work.
    // Treating them as customer work caused false IDLE_UNEXPECTED recovery loops.
    if (active) {
      console.log(JSON.stringify({ type: 'WATCHDOG_ENGINEERING_ACTIVITY_IGNORED', repository, latestActivityAt: latest?.updated_at ?? null, humanGate, at: new Date().toISOString() }));
    }
    return [];
  },
};

function targetRepository(issue: FactoryIssue): string | null {
  const body = issue.body ?? '';
  const canonical = body.match(/^Target-Repository:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\s*$/mi);
  if (canonical?.[1]) return canonical[1];

  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (/^#{1,6}\s*Target repository\s*$/i.test(lines[index]?.trim() ?? '')) {
      for (let valueIndex = index + 1; valueIndex < lines.length; valueIndex += 1) {
        const candidate = (lines[valueIndex] ?? '').trim().replace(/^\x60|\x60$/g, '');
        if (!candidate) continue;
        return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate) ? candidate : null;
      }
    }
  }
  return null;
}
async function hasActiveAntigravityBuild(runId: string): Promise<boolean> {
  const response = await github('/actions/workflows/factory-antigravity-target-build.yml/runs?status=in_progress&per_page=30');
  const runs = await response.json() as { workflow_runs?: Array<{ id: number }> };
  for (const run of runs.workflow_runs ?? []) {
    const jobsResponse = await github(`/actions/runs/${run.id}/jobs?per_page=20`);
    const jobs = await jobsResponse.json() as { jobs?: Array<{ steps?: Array<{ name?: string; status?: string }> }> };
    if ((jobs.jobs ?? []).some((job) => (job.steps ?? []).some((step) => step.name === 'Run governed Antigravity build' && step.status === 'in_progress'))) {
      console.log(JSON.stringify({ type: 'WATCHDOG_ANTIGRAVITY_SINGLE_FLIGHT', runId, activeWorkflowRun: run.id, at: new Date().toISOString() }));
      return true;
    }
  }
  return false;
}

async function hasAntigravityResult(issueNumber: number, runId: string, sliceId: string): Promise<boolean> {
  const comments = await factoryComments(issueNumber);
  if (sliceId === DASHBOARD_SLICES[0]) {
    return comments.some((comment) => (comment.body ?? '').startsWith(`FACTORY_ANTIGRAVITY_RESULT ${runId} `));
  }
  return comments.some((comment) => (comment.body ?? '').startsWith(`FACTORY_ANTIGRAVITY_READY ${runId} ${sliceId} `));
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

async function setFactoryStatus(issueNumber: number, status: 'running'|'verifying'|'waiting-dependency'|'waiting-human'|'completed'): Promise<void> {
  const response = await github(`/issues/${issueNumber}`);
  const issue = await response.json() as FactoryIssue;
  const labels = (issue.labels ?? []).map((label) => label.name).filter((name): name is string => Boolean(name)).filter((name) => !name.startsWith('factory-status:'));
  labels.push('factory-work', `factory-status:${status}`);
  await github(`/issues/${issueNumber}/labels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ labels: [...new Set(labels)] }) });
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
      if (!target) throw new Error(`FACTORY_TARGET_REPOSITORY_REQUIRED_${issueNumber}`);
      if (target === repository) throw new Error(`FACTORY_TARGET_REPOSITORY_MUST_DIFFER_FROM_SUPERVISOR_${issueNumber}`);
      console.log(JSON.stringify({ type: 'WATCHDOG_TARGET_RESOLVED', runId, issueNumber, target, at: new Date().toISOString() }));
      await setFactoryStatus(issueNumber, 'running');
      {
        const comments = await factoryComments(issueNumber);
        const done = completedSlices(comments, runId);
        const sliceId = isDashboardTarget(target) ? nextDashboardSlice(done) : (done.has('customer-product') ? null : 'customer-product');
        console.log(JSON.stringify({ type: 'WATCHDOG_SLICE_SELECTED', runId, issueNumber, target, completedSlices: [...done], sliceId, at: new Date().toISOString() }));
        if (!sliceId) {
          await completeFactoryIssue(issueNumber, runId, target);
          return;
        }
        if (await hasAntigravityResult(issueNumber, runId, sliceId)) {
          await setFactoryStatus(issueNumber, 'verifying');
          await dispatchTo(target, 'factory-work-execute', { runId, sourceRepository: repository, sourceIssue: issueNumber, buildSlice: sliceId });
          console.log(JSON.stringify({ type: 'WATCHDOG_DISPATCH_SENT', destination: target, eventType: 'factory-work-execute', runId, sliceId, at: new Date().toISOString() }));
        } else if (!(await hasActiveAntigravityBuild(runId))) {
          await setFactoryStatus(issueNumber, 'waiting-dependency');
          await dispatch('factory-antigravity-build', { runId, sourceRepository: repository, sourceIssue: issueNumber, targetRepository: target, buildSlice: sliceId, productIntent: productIntent(issue) });
          console.log(JSON.stringify({ type: 'WATCHDOG_DISPATCH_SENT', destination: repository, eventType: 'factory-antigravity-build', runId, sliceId, target, at: new Date().toISOString() }));
        }
        return;
      }
    }
    await dispatch('factory-watchdog-continue', { runId, reason: 'IDLE_UNEXPECTED' });
  },
  async retryActiveJob(runId) { if (canRecover(runId)) await dispatch('factory-watchdog-retry', { runId, reason: 'STALLED' }); },
  async useApprovedFallback(runId) { if (canRecover(runId)) await dispatch('factory-watchdog-fallback', { runId }); },
  async escalateHuman(runId, reason) {
    if (runId.startsWith('factory-work:')) await setFactoryStatus(Number(runId.split(':')[1]), 'waiting-human');
    console.log(JSON.stringify({ type: 'WAITING_HUMAN', runId, reason, at: new Date().toISOString() }));
  },
};

async function reportHeartbeat(results: unknown): Promise<void> {
  if (!controlApiUrl || !controlApiKey) return;
  const response = await fetch(`${controlApiUrl.replace(/\/$/,'')}/internal/v1/watchdog/heartbeat`, { method:'POST', headers:{'content-type':'application/json','x-factory-control-key':controlApiKey}, body:JSON.stringify({results,repository,at:new Date().toISOString()}) });
  if (!response.ok) throw new Error(`WATCHDOG_HEARTBEAT_${response.status}`);
}

console.log(JSON.stringify({ type: 'WATCHDOG_STARTED', repository, intervalMs, at: new Date().toISOString() }));
await runWatchdogLoop(state, recovery, {
  intervalMs,
  onTick(results) { console.log(JSON.stringify({ type: 'WATCHDOG_TICK', results, at: new Date().toISOString() })); void reportHeartbeat(results).catch(error=>console.error(JSON.stringify({type:'WATCHDOG_HEARTBEAT_ERROR',error:error instanceof Error?error.message:String(error),at:new Date().toISOString()}))); },
  onError(error) { console.error(JSON.stringify({ type: 'WATCHDOG_ERROR', error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() })); },
});
