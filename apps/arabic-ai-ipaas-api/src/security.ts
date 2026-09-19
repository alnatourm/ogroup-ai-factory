import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function deriveKey(masterKey: string): Buffer {
  return crypto.createHash('sha256').update(masterKey).digest();
}

export function encryptSecret(secret: string, masterKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(masterKey), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload: string, masterKey: string): string {
  const [ivPart, tagPart, ciphertextPart] = payload.split('.');
  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error('INVALID_SECRET_CIPHERTEXT');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(masterKey),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function redactProvider<T extends { secretCiphertext: string }>(
  provider: T,
): Omit<T, 'secretCiphertext'> & { hasSecret: boolean } {
  const safe = Object.fromEntries(
    Object.entries(provider).filter(([key]) => key !== 'secretCiphertext'),
  ) as Omit<T, 'secretCiphertext'>;
  return { ...safe, hasSecret: true };
}

const BLOCKED_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/**
 * Validates outbound provider connection base URLs against SSRF and protocol misuse.
 */
export function validateProviderBaseUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('INVALID_PROVIDER_BASE_URL: URL must be well-formed');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('PROVIDER_BASE_URL_MUST_USE_HTTPS: Only HTTPS endpoints are permitted');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith('.internal') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  ) {
    throw new Error('PROVIDER_BASE_URL_NOT_ALLOWED: Target host is blocked by sovereign SSRF policy');
  }
}
