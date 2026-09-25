import { describe, expect, it } from 'vitest';
import { maskSensitiveText, maskSensitiveValue } from './pii-masking.js';

describe('PII masking', () => {
  it('redacts Arabic-labelled bank data and common identifiers', () => {
    const input = [
      'السيد: محمد أحمد',
      'رقم الحساب: 600-158810-0132',
      'IBAN: JO12ARAB1320000000132158810600',
      'email test@example.com',
      'phone +962 79 123 4567',
    ].join('\n');
    const output = maskSensitiveText(input);
    expect(output).not.toContain('محمد أحمد');
    expect(output).not.toContain('158810');
    expect(output).not.toContain('JO12ARAB');
    expect(output).not.toContain('test@example.com');
    expect(output).not.toContain('79 123 4567');
    expect(output).toContain('[REDACTED]');
  });

  it('redacts sensitive strings recursively in structured extraction JSON', () => {
    const output = maskSensitiveValue({
      customer: { account: 'IBAN: JO12ARAB1320000000132158810600' },
      lines: [{ note: 'email test@example.com' }],
    });
    expect(JSON.stringify(output)).not.toContain('JO12ARAB');
    expect(JSON.stringify(output)).not.toContain('test@example.com');
  });
});
