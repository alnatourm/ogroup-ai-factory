import { describe, expect, it } from 'vitest';
import { parseStructuredPurchaseOrder } from './structured-purchase-order.js';

const valid = {
  supplierName: 'OTECH',
  supplierTaxId: 'TAX-1',
  purchaseOrderNumber: 'PO-100',
  orderDate: '2026-09-23',
  expectedDeliveryDate: '2026-09-30',
  currency: 'JOD',
  subtotal: '100.00',
  taxTotal: '16.00',
  grandTotal: '116.00',
  confidence: {
    supplierName: .99, supplierTaxId: .9, purchaseOrderNumber: .99, orderDate: .98,
    expectedDeliveryDate: .9, currency: .99, subtotal: .95, taxTotal: .95, grandTotal: .99,
  },
  lineItems: [{ description: 'Software services', quantity: '1', unitPrice: '100.00', lineTotal: '100.00' }],
};

describe('structured purchase order', () => {
  it('accepts a complete purchase order', () => {
    const po = parseStructuredPurchaseOrder(valid);
    expect(po.purchaseOrderNumber).toBe('PO-100');
    expect(po.validationWarnings).toEqual([]);
    expect(po.reviewRequired).toBe(false);
  });

  it('requires review when a required field is missing', () => {
    const po = parseStructuredPurchaseOrder({ ...valid, purchaseOrderNumber: null, confidence: { ...valid.confidence, purchaseOrderNumber: null } });
    expect(po.validationWarnings).toContain('MISSING_PURCHASE_ORDER_NUMBER');
    expect(po.reviewRequired).toBe(true);
  });

  it('detects total mismatch', () => {
    const po = parseStructuredPurchaseOrder({ ...valid, grandTotal: '120.00' });
    expect(po.validationWarnings).toContain('TOTAL_MISMATCH');
  });

  it('rejects malformed dates rather than guessing', () => {
    expect(() => parseStructuredPurchaseOrder({ ...valid, orderDate: '23/09/2026' })).toThrow('OCR_PROVIDER_INVALID_RESPONSE');
  });
});
