import type { BuildAgent, BuildAgentRequest, BuildAgentRun, BuildAgentStatus } from './types.js';

const DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_AGENT = 'antigravity-preview-09-2026';

interface AntigravityResponse {
  id?: string;
  environment_id?: string;
  status?: string;
  output_text?: string;
}

export interface AntigravityBuildAgentOptions {
  apiKey: string;
  endpoint?: string;
  agent?: string;
  fetchImpl?: typeof fetch;
}

export class AntigravityBuildAgent implements BuildAgent {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly agent: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AntigravityBuildAgentOptions) {
    if (!options.apiKey) {
      throw new Error('ANTIGRAVITY_API_KEY_REQUIRED');
    }
    this.apiKey = options.apiKey;
    this.endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/$/, '');
    this.agent = options.agent ?? DEFAULT_AGENT;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async start(request: BuildAgentRequest): Promise<BuildAgentRun> {
    if (!request.instructions.trim()) {
      throw new Error('BUILD_INSTRUCTIONS_REQUIRED');
    }

    const body: Record<string, unknown> = {
      agent: this.agent,
      input: request.instructions,
      environment: request.sources?.length
        ? {
            type: 'remote',
            sources: request.sources.map((source) => ({
              type: 'inline',
              target: source.target,
              content: source.content,
            })),
          }
        : 'remote',
      background: true,
      store: true,
      agent_config: {
        type: 'antigravity',
        max_total_tokens: request.maxTotalTokens ?? 50_000,
      },
    };

    const response = await this.fetchImpl(`${this.endpoint}/interactions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`ANTIGRAVITY_HTTP_${response.status}`);
    }

    return this.normalize(await response.json() as AntigravityResponse);
  }

  async get(interactionId: string): Promise<BuildAgentRun> {
    if (!interactionId) {
      throw new Error('INTERACTION_ID_REQUIRED');
    }

    const response = await this.fetchImpl(
      `${this.endpoint}/interactions/${encodeURIComponent(interactionId)}`,
      {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`ANTIGRAVITY_HTTP_${response.status}`);
    }

    return this.normalize(await response.json() as AntigravityResponse);
  }

  private normalize(response: AntigravityResponse): BuildAgentRun {
    if (!response.id) {
      throw new Error('ANTIGRAVITY_RESPONSE_MISSING_ID');
    }

    const status = this.toStatus(response.status);

    return {
      provider: 'google-antigravity',
      interactionId: response.id,
      ...(response.environment_id ? { environmentId: response.environment_id } : {}),
      status,
      ...(response.output_text ? { outputText: response.output_text } : {}),
    };
  }

  private toStatus(status?: string): BuildAgentStatus {
    switch (status) {
      case 'queued':
      case 'in_progress':
      case 'completed':
      case 'failed':
      case 'incomplete':
        return status;
      default:
        return 'in_progress';
    }
  }
}
