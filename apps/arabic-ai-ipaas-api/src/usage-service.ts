import crypto from 'node:crypto';
import type {
  GatewayTraceRecord,
  ProviderMetric,
  UsageSummaryResponse,
} from './types.js';
import type { DocumentRepository } from './document-service.js';
import type { WorkflowRepository } from './workflow-engine.js';
import type { ProviderRepository } from './postgres.js';

export interface TraceRepository {
  record(trace: Omit<GatewayTraceRecord, 'id' | 'createdAt'>): Promise<GatewayTraceRecord>;
  list(workspaceId: string): Promise<GatewayTraceRecord[]>;
}

export class MemoryTraceRepository implements TraceRepository {
  private readonly traces: GatewayTraceRecord[] = [];

  async record(trace: Omit<GatewayTraceRecord, 'id' | 'createdAt'>): Promise<GatewayTraceRecord> {
    const record: GatewayTraceRecord = {
      id: crypto.randomUUID(),
      ...trace,
      createdAt: new Date().toISOString(),
    };
    this.traces.push(record);
    return record;
  }

  async list(workspaceId: string): Promise<GatewayTraceRecord[]> {
    return this.traces
      .filter((t) => t.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function getUsageSummaryForWorkspace(
  workspaceId: string,
  traceRepository: TraceRepository,
  workflowRepository?: WorkflowRepository,
  documentRepository?: DocumentRepository,
  providerRepository?: ProviderRepository,
): Promise<UsageSummaryResponse> {
  const traces = await traceRepository.list(workspaceId);
  const totalRequests = traces.length;

  let activeWorkflows = 0;
  if (workflowRepository) {
    const workflows = await workflowRepository.list(workspaceId);
    activeWorkflows = workflows.filter((w) => w.status === 'active').length;
  }

  let processedDocuments = 0;
  if (documentRepository) {
    const documents = await documentRepository.list(workspaceId);
    processedDocuments = documents.filter((d) => d.status === 'ready').length;
  }

  if (totalRequests === 0) {
    // Truthful empty zero state - do not fabricate metrics
    return {
      summary: {
        totalRequests: 0,
        totalTokens: 0,
        activeWorkflows,
        processedDocuments,
        successRate: 0,
        avgLatencyMs: 0,
        errorRate: 0,
      },
      providers: [],
    };
  }

  let totalTokens = 0;
  let totalLatency = 0;
  let successCount = 0;
  let errorCount = 0;

  // Group by provider for metrics
  type ProviderAcc = {
    providerId: string;
    model: string;
    requestCount: number;
    successCount: number;
    totalTokens: number;
    latencies: number[];
  };
  const providerMap = new Map<string, ProviderAcc>();

  for (const trace of traces) {
    const tokens = (trace.inputTokens || 0) + (trace.outputTokens || 0);
    totalTokens += tokens;
    totalLatency += trace.latencyMs || 0;

    if (trace.status === 'succeeded') {
      successCount++;
    } else {
      errorCount++;
    }

    const providerKey = trace.providerConnectionId || trace.model || 'unknown';
    let pAcc = providerMap.get(providerKey);
    if (!pAcc) {
      pAcc = {
        providerId: trace.providerConnectionId || 'unknown',
        model: trace.model,
        requestCount: 0,
        successCount: 0,
        totalTokens: 0,
        latencies: [],
      };
      providerMap.set(providerKey, pAcc);
    }

    pAcc.requestCount++;
    if (trace.status === 'succeeded') pAcc.successCount++;
    pAcc.totalTokens += tokens;
    pAcc.latencies.push(trace.latencyMs || 0);
  }

  const successRate = Number(((successCount / totalRequests) * 100).toFixed(2));
  const errorRate = Number(((errorCount / totalRequests) * 100).toFixed(2));
  const avgLatencyMs = Math.round(totalLatency / totalRequests);

  // Lookup provider names if repository is available
  const providersList = providerRepository ? await providerRepository.list(workspaceId) : [];
  const providerNameMap = new Map(providersList.map((p) => [p.id, p.name]));

  const providers: ProviderMetric[] = [];
  for (const acc of providerMap.values()) {
    const sortedLatencies = [...acc.latencies].sort((a, b) => a - b);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    const p99LatencyMs = sortedLatencies[Math.min(p99Index, sortedLatencies.length - 1)] ?? 0;
    const pAvgLatency = Math.round(acc.latencies.reduce((a, b) => a + b, 0) / acc.requestCount);
    const pSuccessRate = Number(((acc.successCount / acc.requestCount) * 100).toFixed(2));

    providers.push({
      providerId: acc.providerId,
      providerName: providerNameMap.get(acc.providerId) || acc.model,
      model: acc.model,
      status: pSuccessRate >= 99 ? 'active' : pSuccessRate >= 95 ? 'degraded' : 'maintenance',
      requestCount: acc.requestCount,
      successRate: pSuccessRate,
      avgLatencyMs: pAvgLatency,
      p99LatencyMs,
      tokenCount: acc.totalTokens,
    });
  }

  return {
    summary: {
      totalRequests,
      totalTokens,
      activeWorkflows,
      processedDocuments,
      successRate,
      avgLatencyMs,
      errorRate,
    },
    providers,
  };
}
