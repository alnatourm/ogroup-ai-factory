export type InvoiceLineItem = {
  description: string;
  quantity: string | null;
  unitPrice: string | null;
  taxAmount: string | null;
  lineTotal: string | null;
};

export type StructuredInvoice = {
  supplierName: string | null;
  supplierTaxId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string | null;
  subtotal: string | null;
  taxTotal: string | null;
  grandTotal: string | null;
  confidence: {
    supplierName: number | null;
    supplierTaxId: number | null;
    invoiceNumber: number | null;
    invoiceDate: number | null;
    dueDate: number | null;
    currency: number | null;
    subtotal: number | null;
    taxTotal: number | null;
    grandTotal: number | null;
  };
  lineItems: InvoiceLineItem[];
  validationWarnings: string[];
  reviewRequired: boolean;
};

const INVOICE_FIELD_KEYS = [
  'supplierName',
  'supplierTaxId',
  'invoiceNumber',
  'invoiceDate',
  'dueDate',
  'currency',
  'subtotal',
  'taxTotal',
  'grandTotal',
] as const;

type InvoiceFieldKey = typeof INVOICE_FIELD_KEYS[number];

function nullableString(value: unknown, maxLength: number): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  return value;
}

function nullableDecimal(value: unknown): string | null {
  const parsed = nullableString(value, 64);
  if (parsed === null) return null;
  if (!/^-?\d{1,15}(?:\.\d{1,4})?$/.test(parsed)) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  return parsed;
}

function nullableDate(value: unknown): string | null {
  const parsed = nullableString(value, 10);
  if (parsed === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(Date.parse(`${parsed}T00:00:00Z`))) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  return parsed;
}

function nullableCurrency(value: unknown): string | null {
  const parsed = nullableString(value, 3);
  if (parsed === null) return null;
  if (!/^[A-Z]{3}$/.test(parsed)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  return parsed;
}

function parseConfidence(value: unknown): StructuredInvoice['confidence'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  const record = value as Record<string, unknown>;
  const confidence = {} as StructuredInvoice['confidence'];
  for (const key of INVOICE_FIELD_KEYS) {
    const item = record[key];
    if (item !== null && (
      typeof item !== 'number' ||
      !Number.isFinite(item) ||
      item < 0 ||
      item > 1
    )) {
      throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    }
    confidence[key] = item as number | null;
  }
  return confidence;
}

function parseLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value) || value.length > 200) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    }
    const record = item as Record<string, unknown>;
    return {
      description: nullableString(record.description, 2_000) ?? (() => { throw new Error('OCR_PROVIDER_INVALID_RESPONSE'); })(),
      quantity: nullableDecimal(record.quantity),
      unitPrice: nullableDecimal(record.unitPrice),
      taxAmount: nullableDecimal(record.taxAmount),
      lineTotal: nullableDecimal(record.lineTotal),
    };
  });
}

function addArithmeticWarning(
  warnings: string[],
  subtotal: string | null,
  taxTotal: string | null,
  grandTotal: string | null,
): void {
  if (subtotal === null || taxTotal === null || grandTotal === null) return;
  const expected = Number(subtotal) + Number(taxTotal);
  if (Math.abs(expected - Number(grandTotal)) > 0.01) {
    warnings.push('TOTAL_MISMATCH');
  }
}

export function parseStructuredInvoice(value: unknown): StructuredInvoice {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  }
  const record = value as Record<string, unknown>;
  const invoice: StructuredInvoice = {
    supplierName: nullableString(record.supplierName, 500),
    supplierTaxId: nullableString(record.supplierTaxId, 128),
    invoiceNumber: nullableString(record.invoiceNumber, 128),
    invoiceDate: nullableDate(record.invoiceDate),
    dueDate: nullableDate(record.dueDate),
    currency: nullableCurrency(record.currency),
    subtotal: nullableDecimal(record.subtotal),
    taxTotal: nullableDecimal(record.taxTotal),
    grandTotal: nullableDecimal(record.grandTotal),
    confidence: parseConfidence(record.confidence),
    lineItems: parseLineItems(record.lineItems),
    validationWarnings: [],
    reviewRequired: false,
  };

  const required: Array<[InvoiceFieldKey, string]> = [
    ['supplierName', 'MISSING_SUPPLIER_NAME'],
    ['invoiceNumber', 'MISSING_INVOICE_NUMBER'],
    ['invoiceDate', 'MISSING_INVOICE_DATE'],
    ['currency', 'MISSING_CURRENCY'],
    ['grandTotal', 'MISSING_GRAND_TOTAL'],
  ];
  for (const [key, warning] of required) {
    if (invoice[key] === null) invoice.validationWarnings.push(warning);
  }
  addArithmeticWarning(
    invoice.validationWarnings,
    invoice.subtotal,
    invoice.taxTotal,
    invoice.grandTotal,
  );

  const hasLowConfidence = INVOICE_FIELD_KEYS.some((key) => {
    const confidence = invoice.confidence[key];
    return confidence !== null && confidence < 0.8;
  });
  invoice.reviewRequired = invoice.validationWarnings.length > 0 || hasLowConfidence;
  return invoice;
}
