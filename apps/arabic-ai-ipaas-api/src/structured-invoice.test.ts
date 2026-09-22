import { describe, expect, it } from 'vitest';
import { parseStructuredInvoice } from './structured-invoice.js';

function completeInvoice() {
  return {
    supplierName: 'شركة المثال',
    supplierTaxId: '123456789',
    invoiceNumber: 'INV-1001',
    invoiceDate: '2026-09-22',
    dueDate: null,
    currency: 'JOD',
    subtotal: '100.00',
    taxTotal: '16.00',
    grandTotal: '116.00',
    confidence: {
      supplierName: 0.98,
      supplierTaxId: 0.97,
      invoiceNumber: 0.99,
      invoiceDate: 0.95,
      dueDate: null,
      currency: 0.96,
      subtotal: 0.97,
      taxTotal: 0.97,
      grandTotal: 0.99,
    },
    lineItems: [{
      description: 'خدمة',
      quantity: '1',
      unitPrice: '100.00',
      taxAmount: '16.00',
      lineTotal: '116.00',
    }],
  };
}

describe('structured invoice validation', () => {
  it('accepts a complete provider result without inventing warnings', () => {
    const result = parseStructuredInvoice(completeInvoice());
    expect(result.invoiceNumber).toBe('INV-1001');
    expect(result.validationWarnings).toEqual([]);
    expect(result.reviewRequired).toBe(false);
  });

  it('marks missing required fields for human review', () => {
    const input = completeInvoice();
    input.supplierName = null as unknown as string;
    const result = parseStructuredInvoice(input);
    expect(result.validationWarnings).toContain('MISSING_SUPPLIER_NAME');
    expect(result.reviewRequired).toBe(true);
  });

  it('marks inconsistent totals for human review', () => {
    const input = completeInvoice();
    input.grandTotal = '120.00';
    const result = parseStructuredInvoice(input);
    expect(result.validationWarnings).toContain('TOTAL_MISMATCH');
    expect(result.reviewRequired).toBe(true);
  });

  it('requires human review for low-confidence fields', () => {
    const input = completeInvoice();
    input.confidence.invoiceNumber = 0.79;
    expect(parseStructuredInvoice(input).reviewRequired).toBe(true);
  });

  it.each([
    ['calendar date', { invoiceDate: '2026-02-30' }],
    ['currency', { currency: 'jod' }],
    ['decimal', { grandTotal: 'JOD 116.00' }],
    ['confidence', { confidence: { ...completeInvoice().confidence, invoiceNumber: 1.1 } }],
  ])('rejects invalid %s output from the provider', (_label, change) => {
    expect(() => parseStructuredInvoice({ ...completeInvoice(), ...change }))
      .toThrow('OCR_PROVIDER_INVALID_RESPONSE');
  });
});
