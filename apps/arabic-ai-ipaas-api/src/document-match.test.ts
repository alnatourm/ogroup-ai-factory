import { describe, expect, it } from 'vitest';
import { comparePurchaseOrderToInvoice } from './document-match.js';
import type { StructuredInvoice } from './structured-invoice.js';
import type { StructuredPurchaseOrder } from './structured-purchase-order.js';

const po: StructuredPurchaseOrder = {
  supplierName: 'OTECH', supplierTaxId: null, purchaseOrderNumber: 'PO-1', orderDate: '2026-09-23',
  expectedDeliveryDate: null, currency: 'JOD', subtotal: '100.00', taxTotal: '16.00', grandTotal: '116.00',
  confidence: { supplierName: 1, supplierTaxId: null, purchaseOrderNumber: 1, orderDate: 1, expectedDeliveryDate: null, currency: 1, subtotal: 1, taxTotal: 1, grandTotal: 1 },
  lineItems: [{ description: 'Software services', quantity: '1', unitPrice: '100.00', lineTotal: '100.00' }],
  validationWarnings: [], reviewRequired: false,
};
const invoice: StructuredInvoice = {
  supplierName: 'otech', supplierTaxId: null, invoiceNumber: 'INV-1', invoiceDate: '2026-09-23', dueDate: null,
  currency: 'JOD', subtotal: '100.00', taxTotal: '16.00', grandTotal: '116.00',
  confidence: { supplierName: 1, supplierTaxId: null, invoiceNumber: 1, invoiceDate: 1, dueDate: null, currency: 1, subtotal: 1, taxTotal: 1, grandTotal: 1 },
  lineItems: [{ description: 'Software services', quantity: '1', unitPrice: '100.00', taxAmount: null, lineTotal: '100.00' }],
  validationWarnings: [], reviewRequired: false,
};

describe('PO invoice matching', () => {
  it('matches aligned documents deterministically', () => {
    const result = comparePurchaseOrderToInvoice(po, invoice);
    expect(result.status).toBe('matched');
    expect(result.score).toBe(100);
    expect(result.findings).toEqual([]);
  });
  it('flags supplier, currency and total mismatches', () => {
    const result = comparePurchaseOrderToInvoice(po, { ...invoice, supplierName: 'Other', currency: 'USD', grandTotal: '200.00' });
    expect(result.status).toBe('mismatch');
    expect(result.findings.map((f) => f.code)).toEqual(expect.arrayContaining(['SUPPLIER_MISMATCH','CURRENCY_MISMATCH','TOTAL_MISMATCH']));
  });
  it('flags line quantity and price changes', () => {
    const result = comparePurchaseOrderToInvoice(po, { ...invoice, lineItems: [{ ...invoice.lineItems[0]!, quantity: '2', unitPrice: '90.00' }] });
    expect(result.status).toBe('mismatch');
    expect(result.findings.map((f) => f.code)).toEqual(expect.arrayContaining(['LINE_QUANTITY_MISMATCH','LINE_UNIT_PRICE_MISMATCH']));
  });
});
