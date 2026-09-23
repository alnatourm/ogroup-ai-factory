export type PurchaseOrderLineItem = {
  description: string;
  quantity: string | null;
  unitPrice: string | null;
  lineTotal: string | null;
};

export type StructuredPurchaseOrder = {
  supplierName: string | null;
  supplierTaxId: string | null;
  purchaseOrderNumber: string | null;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  currency: string | null;
  subtotal: string | null;
  taxTotal: string | null;
  grandTotal: string | null;
  confidence: Record<
    'supplierName' | 'supplierTaxId' | 'purchaseOrderNumber' | 'orderDate' |
    'expectedDeliveryDate' | 'currency' | 'subtotal' | 'taxTotal' | 'grandTotal',
    number | null
  >;
  lineItems: PurchaseOrderLineItem[];
  validationWarnings: string[];
  reviewRequired: boolean;
};

const FIELD_KEYS = [
  'supplierName','supplierTaxId','purchaseOrderNumber','orderDate','expectedDeliveryDate',
  'currency','subtotal','taxTotal','grandTotal',
] as const;
type FieldKey = typeof FIELD_KEYS[number];

function nullableString(value: unknown, max: number): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  return value;
}
function decimal(value: unknown): string | null {
  const v = nullableString(value, 64);
  if (v === null) return null;
  if (!/^-?\d{1,15}(?:\.\d{1,4})?$/.test(v)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  return v;
}
function date(value: unknown): string | null {
  const v = nullableString(value, 10);
  if (v === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  return v;
}
function currency(value: unknown): string | null {
  const v = nullableString(value, 3);
  if (v !== null && !/^[A-Z]{3}$/.test(v)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  return v;
}
function confidence(value: unknown): StructuredPurchaseOrder['confidence'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  const r = value as Record<string, unknown>;
  const out = {} as StructuredPurchaseOrder['confidence'];
  for (const key of FIELD_KEYS) {
    const v = r[key];
    if (v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    out[key] = v as number | null;
  }
  return out;
}
function lines(value: unknown): PurchaseOrderLineItem[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    const r = item as Record<string, unknown>;
    const description = nullableString(r.description, 2000);
    if (description === null) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
    return { description, quantity: decimal(r.quantity), unitPrice: decimal(r.unitPrice), lineTotal: decimal(r.lineTotal) };
  });
}

export function parseStructuredPurchaseOrder(value: unknown): StructuredPurchaseOrder {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('OCR_PROVIDER_INVALID_RESPONSE');
  const r = value as Record<string, unknown>;
  const po: StructuredPurchaseOrder = {
    supplierName: nullableString(r.supplierName, 500),
    supplierTaxId: nullableString(r.supplierTaxId, 128),
    purchaseOrderNumber: nullableString(r.purchaseOrderNumber, 128),
    orderDate: date(r.orderDate),
    expectedDeliveryDate: date(r.expectedDeliveryDate),
    currency: currency(r.currency),
    subtotal: decimal(r.subtotal),
    taxTotal: decimal(r.taxTotal),
    grandTotal: decimal(r.grandTotal),
    confidence: confidence(r.confidence),
    lineItems: lines(r.lineItems),
    validationWarnings: [],
    reviewRequired: false,
  };
  const required: Array<[FieldKey,string]> = [
    ['supplierName','MISSING_SUPPLIER_NAME'],['purchaseOrderNumber','MISSING_PURCHASE_ORDER_NUMBER'],
    ['orderDate','MISSING_ORDER_DATE'],['currency','MISSING_CURRENCY'],['grandTotal','MISSING_GRAND_TOTAL'],
  ];
  for (const [key, warning] of required) if (po[key] === null) po.validationWarnings.push(warning);
  if (po.subtotal !== null && po.taxTotal !== null && po.grandTotal !== null &&
      Math.abs(Number(po.subtotal) + Number(po.taxTotal) - Number(po.grandTotal)) > 0.01) po.validationWarnings.push('TOTAL_MISMATCH');
  const low = FIELD_KEYS.some((key) => po.confidence[key] !== null && (po.confidence[key] as number) < 0.8);
  po.reviewRequired = po.validationWarnings.length > 0 || low;
  return po;
}
