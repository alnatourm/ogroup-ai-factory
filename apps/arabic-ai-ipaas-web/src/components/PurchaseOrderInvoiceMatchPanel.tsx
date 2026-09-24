import React, { useEffect, useState } from 'react';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { DocumentRecord, MatchDecisionRecord, PurchaseOrderInvoiceMatch } from '../types/api.js';
import { Card, CardBody, CardHeader } from './common/Card.js';
import { Badge } from './common/Badge.js';

export const PurchaseOrderInvoiceMatchPanel: React.FC<{documents:DocumentRecord[]; language:'ar'|'en'}>=({documents,language})=>{
 const [po,setPo]=useState(''); const [invoice,setInvoice]=useState(''); const [match,setMatch]=useState<PurchaseOrderInvoiceMatch|null>(null);
 const [latest,setLatest]=useState<MatchDecisionRecord|null>(null); const [reason,setReason]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{setMatch(null);setLatest(null);},[po,invoice]);
 const compare=async()=>{if(!po||!invoice)return;setBusy(true);setError(null);try{setMatch(await ArabicAiIpaasClient.comparePurchaseOrderInvoice(po,invoice));setLatest(await ArabicAiIpaasClient.getPurchaseOrderInvoiceDecision(po,invoice));}catch(e){setError(e instanceof Error?e.message:'DOCUMENT_MATCH_FAILED');}finally{setBusy(false);}};
 const decide=async(decision:'accepted'|'rejected'|'escalated')=>{if(reason.trim().length<3)return;setBusy(true);setError(null);try{setLatest(await ArabicAiIpaasClient.decidePurchaseOrderInvoice(po,invoice,decision,reason));setReason('');}catch(e){setError(e instanceof Error?e.message:'MATCH_DECISION_SAVE_FAILED');}finally{setBusy(false);}};
 return <Card><CardHeader title={language==='ar'?'مطابقة أمر الشراء والفاتورة':'PO ↔ Invoice Matching'} subtitle={language==='ar'?'مقارنة حتمية ثم قرار بشري موثق':'Deterministic comparison followed by a governed human decision'}/><CardBody className="space-y-4 font-arabic">
  <div className="grid gap-3 md:grid-cols-2">
   <label className="text-xs">{language==='ar'?'أمر الشراء':'Purchase order'}<select className="mt-1 w-full rounded-lg border p-2" value={po} onChange={e=>setPo(e.target.value)}><option value="">{language==='ar'?'اختر مستنداً':'Select document'}</option>{documents.map(d=><option key={d.id} value={d.id}>{d.filename}</option>)}</select></label>
   <label className="text-xs">{language==='ar'?'الفاتورة':'Invoice'}<select className="mt-1 w-full rounded-lg border p-2" value={invoice} onChange={e=>setInvoice(e.target.value)}><option value="">{language==='ar'?'اختر مستنداً':'Select document'}</option>{documents.map(d=><option key={d.id} value={d.id}>{d.filename}</option>)}</select></label>
  </div>
  <button disabled={!po||!invoice||po===invoice||busy} onClick={compare} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy?(language==='ar'?'جارٍ التنفيذ...':'Working...'):(language==='ar'?'قارن المستندين':'Compare documents')}</button>
  {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
  {match&&<div className="space-y-3 rounded-xl border p-4">
   <div className="flex items-center gap-3"><Badge variant={match.status==='matched'?'success':match.status==='mismatch'?'danger':'warning'} size="sm">{match.status}</Badge><span className="text-sm font-bold">{language==='ar'?'درجة المطابقة الأساسية':'Core match score'}: {match.score}%</span></div>
   <div className="text-[11px] text-slate-500">{language==='ar'?'الدرجة الحالية تقيس المورد والعملة والإجمالي؛ نتائج البنود تظهر منفصلة أدناه.':'The current score covers supplier, currency, and grand total; line findings are shown separately below.'}</div>
   {match.findings.length===0?<div className="text-xs text-emerald-700">{language==='ar'?'لا توجد اختلافات مكتشفة.':'No differences detected.'}</div>:<div className="space-y-2">{match.findings.map((f,i)=><div key={f.code+i} className="rounded-lg border p-2 text-xs"><b>{f.code}</b> · {f.severity}{f.field?` · ${f.field}`:''}{(f.poValue!==undefined||f.invoiceValue!==undefined)&&<div className="mt-1 font-mono text-[11px]">PO: {f.poValue??'—'} | Invoice: {f.invoiceValue??'—'}</div>}</div>)}</div>}
   {latest&&<div className="rounded-lg bg-slate-50 p-3 text-xs"><b>{language==='ar'?'آخر قرار':'Latest decision'}:</b> {latest.decision}<div className="mt-1 text-slate-600">{latest.reason}</div></div>}
   <textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} className="min-h-20 w-full rounded-lg border p-2 text-xs" placeholder={language==='ar'?'سبب القرار، 3 أحرف على الأقل':'Decision reason, minimum 3 characters'}/>
   <div className="flex flex-wrap gap-2"><button disabled={busy||reason.trim().length<3} onClick={()=>decide('accepted')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{language==='ar'?'قبول':'Accept'}</button><button disabled={busy||reason.trim().length<3} onClick={()=>decide('rejected')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{language==='ar'?'رفض':'Reject'}</button><button disabled={busy||reason.trim().length<3} onClick={()=>decide('escalated')} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{language==='ar'?'تصعيد':'Escalate'}</button></div>
  </div>}
 </CardBody></Card>;
};
