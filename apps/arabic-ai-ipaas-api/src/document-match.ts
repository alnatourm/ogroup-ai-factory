import type { StructuredInvoice } from './structured-invoice.js';
import type { StructuredPurchaseOrder } from './structured-purchase-order.js';

export type MatchSeverity = 'info' | 'warning' | 'critical';
export type MatchFinding = { code:string; severity:MatchSeverity; field?:string; poValue?:string|null; invoiceValue?:string|null };
export type PurchaseOrderInvoiceMatch = {
  schemaVersion:'po-invoice-match-v1'; status:'matched'|'mismatch'|'review_required'; score:number; findings:MatchFinding[];
  summary:{ supplierMatched:boolean|null; currencyMatched:boolean|null; totalMatched:boolean|null; lineItemsCompared:number };
};

function normalized(value:string|null):string|null { return value===null?null:value.trim().toLowerCase().replace(/\s+/g,' '); }
function sameText(a:string|null,b:string|null):boolean|null { if(a===null||b===null)return null; return normalized(a)===normalized(b); }
function sameMoney(a:string|null,b:string|null):boolean|null { if(a===null||b===null)return null; return Math.abs(Number(a)-Number(b))<=0.01; }
function lineKey(value:string):string { return normalized(value) ?? ''; }

export function comparePurchaseOrderToInvoice(po:StructuredPurchaseOrder,invoice:StructuredInvoice):PurchaseOrderInvoiceMatch {
 const findings:MatchFinding[]=[]; const comparable:boolean[]=[];
 const compare=(field:string,code:string,a:string|null,b:string|null,fn:(a:string|null,b:string|null)=>boolean|null)=>{
  const result=fn(a,b); if(result!==null) comparable.push(result);
  if(result===false)findings.push({code,severity:'critical',field,poValue:a,invoiceValue:b});
  if(result===null)findings.push({code:code.replace('_MISMATCH','_NOT_COMPARABLE'),severity:'warning',field});
  return result;
 };
 const supplierMatched=compare('supplierName','SUPPLIER_MISMATCH',po.supplierName,invoice.supplierName,sameText);
 const currencyMatched=compare('currency','CURRENCY_MISMATCH',po.currency,invoice.currency,sameText);
 const totalMatched=compare('grandTotal','TOTAL_MISMATCH',po.grandTotal,invoice.grandTotal,sameMoney);

 const invoiceByDescription=new Map<string,number[]>();
 invoice.lineItems.forEach((line,i)=>{const key=lineKey(line.description); const indexes=invoiceByDescription.get(key)??[]; indexes.push(i); invoiceByDescription.set(key,indexes);});
 const used=new Set<number>(); let lineItemsCompared=0;
 po.lineItems.forEach((poLine,poIndex)=>{
  const candidates=invoiceByDescription.get(lineKey(poLine.description))??[];
  const invoiceIndex=candidates.find(i=>!used.has(i));
  if(invoiceIndex===undefined){findings.push({code:'LINE_ITEM_NOT_FOUND',severity:'critical',field:`lineItems[${poIndex}].description`,poValue:poLine.description}); comparable.push(false); return;}
  used.add(invoiceIndex); lineItemsCompared+=1; comparable.push(true);
  const invoiceLine=invoice.lineItems[invoiceIndex]!;
  for(const [name,a,b,code] of [
   ['quantity',poLine.quantity,invoiceLine.quantity,'LINE_QUANTITY_MISMATCH'],
   ['unitPrice',poLine.unitPrice,invoiceLine.unitPrice,'LINE_UNIT_PRICE_MISMATCH'],
   ['lineTotal',poLine.lineTotal,invoiceLine.lineTotal,'LINE_TOTAL_MISMATCH'],
  ] as const){const r=sameMoney(a,b); if(r!==null) comparable.push(r); if(r===false)findings.push({code,severity:'critical',field:`lineItems[${poIndex}].${name}`,poValue:a,invoiceValue:b});}
 });
 invoice.lineItems.forEach((line,i)=>{if(!used.has(i)){findings.push({code:'UNEXPECTED_INVOICE_LINE_ITEM',severity:'warning',field:`invoice.lineItems[${i}].description`,invoiceValue:line.description}); comparable.push(false);}});
 if(po.lineItems.length!==invoice.lineItems.length)findings.push({code:'LINE_ITEM_COUNT_MISMATCH',severity:'warning'});
 const matched=comparable.filter(Boolean).length; const score=comparable.length===0?0:Math.round(matched/comparable.length*100);
 const critical=findings.some(f=>f.severity==='critical'), warning=findings.some(f=>f.severity==='warning');
 return {schemaVersion:'po-invoice-match-v1',status:critical?'mismatch':warning?'review_required':'matched',score,findings,summary:{supplierMatched,currencyMatched,totalMatched,lineItemsCompared}};
}
