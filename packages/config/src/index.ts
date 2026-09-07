export type AppEnvironment = 'development' | 'test' | 'production';

export interface CoreConfig {
  environment: AppEnvironment;
  serviceName: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const allowedEnvironments = new Set<AppEnvironment>([
  'development',
  'test',
  'production',
]);

const allowedLogLevels = new Set<CoreConfig['logLevel']>([
  'debug',
  'info',
  'warn',
  'error',
]);

export function loadCoreConfig(
  env: NodeJS.ProcessEnv = process.env,
): CoreConfig {
  const rawEnvironment = env.NODE_ENV ?? 'development';
  const rawLogLevel = env.LOG_LEVEL ?? 'info';
  const serviceName = env.SERVICE_NAME?.trim() || 'ogroup-service';

  if (!allowedEnvironments.has(rawEnvironment as AppEnvironment)) {
    throw new Error(`Invalid NODE_ENV: ${rawEnvironment}`);
  }

  if (!allowedLogLevels.has(rawLogLevel as CoreConfig['logLevel'])) {
    throw new Error(`Invalid LOG_LEVEL: ${rawLogLevel}`);
  }

  return {
    environment: rawEnvironment as AppEnvironment,
    serviceName,
    logLevel: rawLogLevel as CoreConfig['logLevel'],
  };
}
