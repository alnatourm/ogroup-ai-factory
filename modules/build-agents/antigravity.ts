import { GoogleGenAI } from '@google/genai';
import type { BuildAgent, BuildAgentRequest, BuildAgentRun, BuildAgentStatus } from './types.js';

const DEFAULT_AGENT = 'antigravity-preview-09-2026';

interface AntigravityInteraction {
  id?: string;
  environment_id?: string;
  status?: string;
  output_text?: string;
}

interface AntigravityInteractionsClient {
  create(
    input: Record<string, unknown>,
    options?: { timeout?: number },
  ): Promise<AntigravityInteraction>;
  get(interactionId: string): Promise<AntigravityInteraction>;
}

export interface AntigravityBuildAgentOptions {
  apiKey: string;
  agent?: string;
  client?: AntigravityInteractionsClient;
}

export class AntigravityBuildAgent implements BuildAgent {
  private readonly agent: string;
  private readonly interactions: AntigravityInteractionsClient;

  constructor(options: AntigravityBuildAgentOptions) {
    if (!options.apiKey) {
      throw new Error('ANTIGRAVITY_API_KEY_REQUIRED');
    }

    this.agent = options.agent ?? DEFAULT_AGENT;

    if (options.client) {
      this.interactions = options.client;
    } else {
      const client = new GoogleGenAI({ apiKey: options.apiKey });
      this.interactions = client.interactions as unknown as AntigravityInteractionsClient;
    }
  }

  async start(request: BuildAgentRequest): Promise<BuildAgentRun> {
    if (!request.instructions.trim()) {
      throw new Error('BUILD_INSTRUCTIONS_REQUIRED');
    }

    const interaction = await this.interactions.create(
      {
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
      },
      { timeout: 300_000 },
    );

    return this.normalize(interaction);
  }

  async get(interactionId: string): Promise<BuildAgentRun> {
    if (!interactionId) {
      throw new Error('INTERACTION_ID_REQUIRED');
    }

    return this.normalize(await this.interactions.get(interactionId));
  }

  private normalize(response: AntigravityInteraction): BuildAgentRun {
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
