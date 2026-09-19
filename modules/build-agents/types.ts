export type BuildAgentStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'incomplete';

export interface BuildSource {
  target: string;
  content: string;
}

export interface BuildAgentRequest {
  taskId: string;
  productId: string;
  instructions: string;
  maxTotalTokens?: number;
  executionMode?: 'foreground' | 'background';
  sources?: BuildSource[];
}

export interface BuildAgentRun {
  provider: string;
  interactionId: string;
  environmentId?: string;
  status: BuildAgentStatus;
  outputText?: string;
}

export interface BuildAgent {
  start(request: BuildAgentRequest): Promise<BuildAgentRun>;
  get(interactionId: string): Promise<BuildAgentRun>;
}
