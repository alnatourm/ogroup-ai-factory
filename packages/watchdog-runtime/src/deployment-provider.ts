export interface DeploymentRequest {
  runId: string;
  repository: string;
  commit: string;
}

export interface VerifiedDeployment {
  provider: string;
  url: string;
  commit: string;
}

export interface DeploymentProvider {
  readonly name: string;
  deploy(request: DeploymentRequest): Promise<VerifiedDeployment>;
}

export function assertVerifiedDeployment(request: DeploymentRequest, result: VerifiedDeployment): VerifiedDeployment {
  if (!result.provider.trim()) throw new Error('DEPLOYMENT_PROVIDER_REQUIRED');
  if (result.commit !== request.commit) throw new Error('DEPLOYMENT_COMMIT_MISMATCH');
  let url: URL;
  try { url = new URL(result.url); } catch { throw new Error('DEPLOYMENT_URL_INVALID'); }
  if (url.protocol !== 'https:') throw new Error('DEPLOYMENT_URL_MUST_BE_HTTPS');
  return result;
}
