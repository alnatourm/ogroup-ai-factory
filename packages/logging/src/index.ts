export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  log(event: LogEvent): void;
}

export function createConsoleLogger(): Logger {
  return {
    log(event) {
      const payload = JSON.stringify(event);

      if (event.level === 'error') {
        console.error(payload);
        return;
      }

      if (event.level === 'warn') {
        console.warn(payload);
        return;
      }

      console.log(payload);
    },
  };
}

export function createLogEvent(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEvent {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };
}
