export interface ApiClientConfig {
  baseUrl: string;
  workspaceId: string;
  apiKey?: string | undefined;
  userId: string;
  role: 'workspace_owner' | 'workspace_admin' | 'developer' | 'automation_builder' | 'viewer';
  useMockFallback: boolean;
}

const envBaseUrl =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
    : undefined;

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: envBaseUrl || '/api',
  workspaceId: 'workspace-a',
  userId: 'user-default',
  role: 'workspace_owner',
  useMockFallback: true,
};

let currentConfig: ApiClientConfig = { ...DEFAULT_CONFIG };

export function getApiConfig(): ApiClientConfig {
  return { ...currentConfig };
}

export function updateApiConfig(updates: Partial<ApiClientConfig>): ApiClientConfig {
  currentConfig = {
    ...currentConfig,
    ...updates,
  };
  return { ...currentConfig };
}

export function resetApiConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}
