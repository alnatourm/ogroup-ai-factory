export interface ApiClientConfig {
  baseUrl: string;
  workspaceId: string;
  apiKey?: string | undefined;
  userId: string;
  role: 'workspace_owner' | 'workspace_admin' | 'developer' | 'automation_builder' | 'viewer';
  useMockFallback: boolean;
  allowDevIdentityHeaders: boolean;
}

const envBaseUrl =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
    : undefined;

const env = typeof import.meta !== 'undefined'
  ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  : undefined;

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: envBaseUrl || '',
  workspaceId: env?.VITE_WORKSPACE_ID || '',
  userId: env?.VITE_USER_ID || '',
  role: 'viewer',
  useMockFallback: env?.VITE_USE_MOCK_FALLBACK === 'true',
  allowDevIdentityHeaders: env?.VITE_ALLOW_DEV_IDENTITY_HEADERS === 'true',
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
