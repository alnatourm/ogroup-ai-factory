export type WorkspaceRole =
  | 'workspace_owner'
  | 'workspace_admin'
  | 'developer'
  | 'automation_builder'
  | 'viewer'
  | 'partner_admin';

export type RequestContext = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export type ProviderType = 'openai-compatible' | 'gemini' | 'anthropic-compatible' | 'custom-http';

export type ProviderConnection = {
  id: string;
  workspaceId: string;
  providerType: ProviderType;
  name: string;
  baseUrl?: string;
  modelDefault?: string;
  secretCiphertext: string;
  config: Record<string, unknown>;
  status: 'active' | 'disabled' | 'error';
  createdAt: string;
  updatedAt: string;
};

export type SafeProviderConnection = Omit<ProviderConnection, 'secretCiphertext'> & {
  hasSecret: boolean;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type GatewayRequest = {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  stream?: boolean;
};

export type GatewayResponse = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: 'stop';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
