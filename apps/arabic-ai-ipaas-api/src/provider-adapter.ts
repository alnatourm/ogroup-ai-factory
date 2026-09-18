import type { GatewayRequest } from './types.js';

export type ProviderCompletion = {
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
};

export interface ProviderAdapter {
  complete(input: GatewayRequest, secret: string): Promise<ProviderCompletion>;
}

export class EchoProviderAdapter implements ProviderAdapter {
  async complete(input: GatewayRequest, _secret: string): Promise<ProviderCompletion> {
    const lastUser = [...input.messages].reverse().find((message) => message.role === 'user');
    const content = lastUser?.content ?? '';
    return {
      model: input.model ?? 'factory-echo',
      content: `[gateway-pilot] ${content}`,
      promptTokens: Math.max(1, Math.ceil(content.length / 4)),
      completionTokens: Math.max(1, Math.ceil(content.length / 6)),
    };
  }
}
