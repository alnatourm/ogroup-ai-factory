import type { StructuredInvoice } from './structured-invoice.js';
import type { StructuredPurchaseOrder } from './structured-purchase-order.js';

export type MatchSeverity = 'info' | 'warning' | 'critical';
export type MatchFinding = {
  code: string;
  severity: MatchSeverity;
  field?: string;
  poValue?: string | null;
  invoiceValue?: string | null;
};

export type PurchaseOrderInvoiceMatch = {
  schemaVersion: 'po-invoice-match-v1';
  status: 'matched' | 'mismatch' | 'review_required';
  score: number;
  findings: MatchFinding[];
  summary: {
    supplierMatched: boolean | null;
    currencyMatched: boolean | null;
    totalMatched: boolean | null;
    lineItemsCompared: number;
  };
};

function normalized(value: string | null): string | null {
  return value === null ? null : value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
function sameText(a: string | null, b: string | null): boolean | null {
  if (a === null || b === null) return null;
  return normalized(a) === normalized(b);
}
function sameMoney(a: string | null, b: string | null): boolean | null {
  if (a === null || b === null) return null;
  return Math.abs(Number(a) - Number(b)) <= 0.01;
}

export function comparePurchaseOrderToInvoice(
  po: StructuredPurchaseOrder,
  invoice: StructuredInvoice,
): PurchaseOrderInvoiceMatch {
  const findings: MatchFinding[] = [];
  const supplierMatched = sameText(po.supplierName, invoice.supplierName);
  const currencyMatched = sameText(po.currency, invoice.currency);
  const totalMatched = sameMoney(po.grandTotal, invoice.grandTotal);

  if (supplierMatched === false) findings.push({ code: 'SUPPLIER_MISMATCH', severity: 'critical', field: 'supplierName', poValue: po.supplierName, invoiceValue: invoice.supplierName });
  if (currencyMatched === false) findings.push({ code: 'CURRENCY_MISMATCH', severity: 'critical', field: 'currency', poValue: po.currency, invoiceValue: invoice.currency });
  if (totalMatched === false) findings.push({ code: 'TOTAL_MISMATCH', severity: 'critical', field: 'grandTotal', poValue: po.grandTotal, invoiceValue: invoice.grandTotal });
  if (supplierMatched === null) findings.push({ code: 'SUPPLIER_NOT_COMPARABLE', severity: 'warning', field: 'supplierName' });
  if (currencyMatched === null) findings.push({ code: 'CURRENCY_NOT_COMPARABLE', severity: 'warning', field: 'currency' });
  if (totalMatched === null) findings.push({ code: 'TOTAL_NOT_COMPARABLE', severity: 'warning', field: 'grandTotal' });

  const comparable = [supplierMatched, currencyMatched, totalMatched].filter((v) => v !== null);
  const matched = comparable.filter((v) => v === true).length;
  const score = comparable.length === 0 ? 0 : Math.round((matched / comparable.length) * 100);

  const lineItemsCompared = Math.min(po.lineItems.length, invoice.lineItems.length);
  if (po.lineItems.length !== invoice.lineItems.length) {
    findings.push({ code: 'LINE_ITEM_COUNT_MISMATCH', severity: 'warning' });
  }
  for (let i = 0; i < lineItemsCompared; i += 1) {
    const poLine = po.lineItems[i]!;
    const invoiceLine = invoice.lineItems[i]!;
    if (sameText(poLine.description, invoiceLine.description) === false) findings.push({ code: 'LINE_DESCRIPTION_MISMATCH', severity: 'warning', field: `lineItems[${i}].description`, poValue: poLine.description, invoiceValue: invoiceLine.description });
    if (sameMoney(poLine.quantity, invoiceLine.quantity) === false) findings.push({ code: 'LINE_QUANTITY_MISMATCH', severity: 'critical', field: `lineItems[${i}].quantity`, poValue: poLine.quantity, invoiceValue: invoiceLine.quantity });
    if (sameMoney(poLine.unitPrice, invoiceLine.unitPrice) === false) findings.push({ code: 'LINE_UNIT_PRICE_MISMATCH', severity: 'critical', field: `lineItems[${i}].unitPrice`, poValue: poLine.unitPrice, invoiceValue: invoiceLine.unitPrice });
    if (sameMoney(poLine.lineTotal, invoiceLine.lineTotal) === false) findings.push({ code: 'LINE_TOTAL_MISMATCH', severity: 'critical', field: `lineItems[${i}].lineTotal`, poValue: poLine.lineTotal, invoiceValue: invoiceLine.lineTotal });
  }

  const critical = findings.some((f) => f.severity === 'critical');
  const warning = findings.some((f) => f.severity === 'warning');
  return {
    schemaVersion: 'po-invoice-match-v1',
    status: critical ? 'mismatch' : warning ? 'review_required' : 'matched',
    score,
    findings,
    summary: { supplierMatched, currencyMatched, totalMatched, lineItemsCompared },
  };
}
