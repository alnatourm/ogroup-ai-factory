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
  const { secretCiphertext: _secretCiphertext, ...safe } = provider;
  return { ...safe, hasSecret: true };
}
