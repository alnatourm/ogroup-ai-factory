import React, { useEffect, useMemo, useState } from 'react';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { DocumentRecord, DocumentReviewRecord, StructuredInvoice } from '../types/api.js';
import { useI18n } from '../i18n/I18nContext.js';
import { Badge } from './common/Badge.js';

type Props = {
  document: DocumentRecord;
  invoice: StructuredInvoice;
  initialReview?: DocumentReviewRecord | null;
};

const scalarFields = [
  ['supplierName', 'المورد', 'Supplier'],
  ['supplierTaxId', 'الرقم الضريبي', 'Tax ID'],
  ['invoiceNumber', 'رقم الفاتورة', 'Invoice number'],
  ['invoiceDate', 'تاريخ الفاتورة', 'Invoice date'],
  ['dueDate', 'تاريخ الاستحقاق', 'Due date'],
  ['currency', 'العملة', 'Currency'],
  ['subtotal', 'المجموع الفرعي', 'Subtotal'],
  ['taxTotal', 'الضريبة', 'Tax total'],
  ['grandTotal', 'الإجمالي النهائي', 'Grand total'],
] as const;

export const InvoiceReviewPanel: React.FC<Props> = ({ document, invoice, initialReview = null }) => {
  const { language } = useI18n();
  const [draft, setDraft] = useState<StructuredInvoice>(() => structuredClone(initialReview?.reviewedJson ?? invoice));
  const [review, setReview] = useState<DocumentReviewRecord | null>(initialReview);
  const [busy, setBusy] = useState<'save' | 'approve' | 'export' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(structuredClone(initialReview?.reviewedJson ?? invoice));
    setReview(initialReview);
    setError(null);
  }, [document.id, initialReview, invoice]);

    const approved = review?.status === 'approved';
  const hasWarnings = draft.validationWarnings.length > 0;
  const canApprove = !hasWarnings && !busy;

  const message = useMemo(() => {
    if (approved) return language === 'ar' ? 'تم اعتماد النسخة البشرية. بيانات AI الأصلية بقيت دون تعديل.' : 'Human-reviewed version approved. Original AI output remains unchanged.';
    if (hasWarnings) return language === 'ar' ? 'صحح الحقول المطلوبة حتى تختفي تنبيهات التحقق قبل الاعتماد.' : 'Correct required fields until validation warnings are cleared before approval.';
    return language === 'ar' ? 'راجع الحقول ثم احفظ أو اعتمد النسخة.' : 'Review the fields, then save or approve the reviewed version.';
  }, [approved, hasWarnings, language]);

  const updateField = (field: keyof StructuredInvoice, value: string) => {
    setDraft((current) => ({ ...current, [field]: value.trim() === '' ? null : value }));
    setReview(null);
  };

  const updateLine = (index: number, field: 'description' | 'quantity' | 'unitPrice' | 'taxAmount' | 'lineTotal', value: string) => {
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: field === 'description' ? value : (value.trim() === '' ? null : value) } : line,
      ),
    }));
    setReview(null);
  };

  const run = async (action: 'save' | 'approve' | 'export') => {
    setBusy(action);
    setError(null);
    try {
      if (action === 'save') { const saved = await ArabicAiIpaasClient.saveDocumentReview(document.id, draft); setReview(saved); setDraft(saved.reviewedJson); }
      if (action === 'approve') setReview(await ArabicAiIpaasClient.approveDocumentReview(document.id, draft));
      if (action === 'export') await ArabicAiIpaasClient.downloadVerifiedInvoiceJson(document);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'INVOICE_REVIEW_FAILED';
      setError(code === 'INVOICE_REVIEW_VALIDATION_REQUIRED'
        ? (language === 'ar' ? 'لا يمكن الاعتماد قبل معالجة تنبيهات التحقق.' : 'Approval is blocked until validation warnings are resolved.')
        : code);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-4 space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 font-arabic" aria-labelledby="invoice-human-review-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="invoice-human-review-title" className="font-bold text-primary">
            {language === 'ar' ? 'المراجعة البشرية والاعتماد' : 'Human review & approval'}
          </h2>
          <p className="mt-1 text-[11px] text-slate-600">{message}</p>
        </div>
        <Badge variant={approved ? 'success' : 'warning'} size="sm">
          {approved ? (language === 'ar' ? 'معتمد' : 'Approved') : (language === 'ar' ? 'قيد المراجعة' : 'In review')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scalarFields.map(([field, ar, en]) => (
          <label key={field} className="text-xs text-slate-600">
            <span>{language === 'ar' ? ar : en}</span>
            <input
              value={(draft[field] as string | null) ?? ''}
              onChange={(event) => updateField(field, event.target.value)}
              disabled={approved}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-primary disabled:bg-slate-100"
            />
          </label>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {['الوصف|Description','الكمية|Quantity','سعر الوحدة|Unit price','الضريبة|Tax','الإجمالي|Total'].map((label) => {
                const [ar, en] = label.split('|');
                return <th key={label} className="p-2 text-start">{language === 'ar' ? ar : en}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {draft.lineItems.map((line, index) => (
              <tr key={index} className="border-t border-slate-100">
                {(['description','quantity','unitPrice','taxAmount','lineTotal'] as const).map((field) => (
                  <td key={field} className="p-2">
                    <input
                      value={line[field] ?? ''}
                      onChange={(event) => updateLine(index, field, event.target.value)}
                      disabled={approved}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 disabled:bg-slate-100"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
      {review?.approvalDigest && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
          <div className="font-bold">{language === 'ar' ? 'بصمة الاعتماد SHA-256' : 'Approval SHA-256 digest'}</div>
          <div className="mt-1 break-all font-mono">{review.approvalDigest}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy || approved} onClick={() => void run('save')} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-primary disabled:opacity-50">
          {busy === 'save' ? '…' : (language === 'ar' ? 'حفظ المراجعة' : 'Save review')}
        </button>
        <button type="button" disabled={!canApprove || approved} onClick={() => void run('approve')} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy === 'approve' ? '…' : (language === 'ar' ? 'اعتماد الفاتورة' : 'Approve invoice')}
        </button>
        <button type="button" disabled={!approved || !!busy} onClick={() => void run('export')} className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900 disabled:opacity-50">
          {busy === 'export' ? '…' : (language === 'ar' ? 'تنزيل JSON الموثق' : 'Download verified JSON')}
        </button>
      </div>
    </section>
  );
};
