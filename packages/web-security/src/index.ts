export const SESSION_COOKIE_NAME = 'ogroup_session';

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: '/';
  maxAge: number;
}

export function sessionCookieOptions(input: {
  secure: boolean;
  maxAgeMs: number;
}): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: input.secure,
    sameSite: 'strict',
    path: '/',
    maxAge: input.maxAgeMs,
  };
}

export function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) {
      const value = rest.join('=');
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}

export function isMutationMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isSameOriginMutation(input: {
  method: string;
  host: string | undefined;
  origin: string | undefined;
  referer: string | undefined;
  protocol?: 'http' | 'https';
}): boolean {
  if (!isMutationMethod(input.method)) {
    return true;
  }

  if (!input.host) {
    return false;
  }

  const expected = `${input.protocol ?? 'https'}://${input.host}`;
  const source = input.origin ?? input.referer;
  if (!source) {
    return false;
  }

  return normalizedOrigin(source) === expected;
}
