const MASK = '[REDACTED]';

const patterns: RegExp[] = [
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
  /\b(?:\d[ -]?){13,19}\b/g,
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
  /(?:\+?\d[\d\s().-]{7,}\d)/g,
  /\b\d{8,12}\b/g,
];

const labelledPatterns: RegExp[] = [
  /((?:IBAN|آيبان|رقم\s*الحساب|الحساب|Account\s*(?:No\.?|Number)?|رقم\s*الهوية|الرقم\s*الوطني|National\s*ID)\s*[:：]?\s*)([^\n|]+)/gi,
  /((?:السيد|السيدة|Mr\.?|Mrs\.?|Ms\.?)\s*[:：]?\s*)([^\n|]+)/gi,
];

export function maskSensitiveText(value: string): string {
  let masked = value;
  for (const pattern of labelledPatterns) masked = masked.replace(pattern, (_m, label) => `${label}${MASK}`);
  for (const pattern of patterns) masked = masked.replace(pattern, MASK);
  return masked;
}

export function maskSensitiveValue<T>(value: T): T {
  if (typeof value === 'string') return maskSensitiveText(value) as T;
  if (Array.isArray(value)) return value.map((item) => maskSensitiveValue(item)) as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = maskSensitiveValue(item);
    }
    return output as T;
  }
  return value;
}
