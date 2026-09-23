import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { DocumentProcessingJob, DocumentRecord, DocumentReviewRecord, DocumentStructuredJsonV2, StructuredInvoice } from '../types/api.js';
import { Card, CardBody, CardHeader } from '../components/common/Card.js';
import { Badge } from '../components/common/Badge.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { InvoiceReviewPanel } from '../components/InvoiceReviewPanel.js';

function getStructuredInvoice(job: DocumentProcessingJob | null): StructuredInvoice | null {
  const structured = job?.extraction.structuredJson;
  if (
    !structured ||
    structured.schemaVersion !== 'document-extraction-json-v2' ||
    structured.documentType !== 'invoice'
  ) {
    return null;
  }
  return (structured as DocumentStructuredJsonV2).invoice;
}

const invoiceWarningLabels: Record<string, { ar: string; en: string }> = {
  MISSING_SUPPLIER_NAME: { ar: 'اسم المورد غير موجود', en: 'Supplier name is missing' },
  MISSING_INVOICE_NUMBER: { ar: 'رقم الفاتورة غير موجود', en: 'Invoice number is missing' },
  MISSING_INVOICE_DATE: { ar: 'تاريخ الفاتورة غير موجود', en: 'Invoice date is missing' },
  MISSING_CURRENCY: { ar: 'العملة غير موجودة', en: 'Currency is missing' },
  MISSING_GRAND_TOTAL: { ar: 'الإجمالي النهائي غير موجود', en: 'Grand total is missing' },
  TOTAL_MISMATCH: { ar: 'الإجماليات المستخرجة غير متطابقة', en: 'Extracted totals do not match' },
};

export const DocumentIntelligencePage: React.FC = () => {
  const { language, t } = useI18n();
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [job, setJob] = useState<DocumentProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DocumentRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [reviewInvoice, setReviewInvoice] = useState<StructuredInvoice | null>(null);
  const [reviewRecord, setReviewRecord] = useState<DocumentReviewRecord | null>(null);
  const [reviewBusy, setReviewBusy] = useState<'save' | 'approve' | 'export' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const describeDocumentError = (code: string) => {
    if (code === 'OCR_PROVIDER_DAILY_QUOTA_EXHAUSTED') {
      return language === 'ar'
        ? 'وصل اتصال Gemini إلى الحد اليومي للخطة المجانية. لن تنجح إعادة المحاولة اليوم بهذا النموذج؛ انتظر تجدد الحصة أو استخدم اتصالاً بحصة متاحة.'
        : 'The Gemini connection reached its Free Tier daily quota. Retrying this model today will not succeed; wait for quota renewal or use a connection with available quota.';
    }
    if (code === 'OCR_PROVIDER_HTTP_429') {
      return language === 'ar'
        ? 'وصل اتصال Gemini إلى حد الطلبات المؤقت. انتظر قليلاً ثم استخدم إعادة الاستخراج؛ لا تحتاج إلى رفع الملف مرة أخرى.'
        : 'The Gemini connection reached a temporary request limit. Wait briefly, then retry extraction; the file does not need to be uploaded again.';
    }
    return code;
  };

  const refreshHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await ArabicAiIpaasClient.listDocuments());
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : 'DOCUMENT_HISTORY_LOAD_FAILED');
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const metadata = { name: file.name, size: file.size, type: file.type || 'application/pdf' };
    setSelectedFile(metadata);
    setJob(null);
    setError(null);
    setIsProcessing(true);
    try {
      const processed = await ArabicAiIpaasClient.processDocument(file);
      setJob(processed);
      setReviewInvoice(getStructuredInvoice(processed));
      setReviewRecord(null);
      setReviewError(null);
      await refreshHistory();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'DOCUMENT_REQUEST_FAILED';
      setError(describeDocumentError(code));
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (document: DocumentRecord) => {
    setDownloadingId(document.id);
    setHistoryError(null);
    try {
      await ArabicAiIpaasClient.downloadDocument(document);
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : 'DOCUMENT_DOWNLOAD_FAILED');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRetryExtraction = async (document: DocumentRecord) => {
    setRetryingId(document.id);
    setHistoryError(null);
    setError(null);
    try {
      await ArabicAiIpaasClient.retryDocumentExtraction(document.id);
      await refreshHistory();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'DOCUMENT_EXTRACTION_RETRY_FAILED';
      setHistoryError(describeDocumentError(code));
    } finally {
      setRetryingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const invoice = getStructuredInvoice(job);

  useEffect(() => {
    if (invoice && !reviewInvoice) setReviewInvoice(invoice);
  }, [invoice, reviewInvoice]);

  const updateReviewField = (field: keyof Pick<StructuredInvoice, 'supplierName' | 'supplierTaxId' | 'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'currency' | 'subtotal' | 'taxTotal' | 'grandTotal'>, value: string) => {
    setReviewInvoice((current) => current ? { ...current, [field]: value.trim() === '' ? null : value } : current);
    setReviewRecord(null);
  };

  const updateLineItem = (index: number, field: 'description' | 'quantity' | 'unitPrice' | 'taxAmount' | 'lineTotal', value: string) => {
    setReviewInvoice((current) => current ? {
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => itemIndex === index
        ? { ...item, [field]: field === 'description' ? value : (value.trim() === '' ? null : value) }
        : item),
    } : current);
    setReviewRecord(null);
  };

  const handleSaveReview = async () => {
    if (!job || !reviewInvoice) return;
    setReviewBusy('save'); setReviewError(null);
    try { setReviewRecord(await ArabicAiIpaasClient.saveDocumentReview(job.document.id, reviewInvoice)); }
    catch (caught) { setReviewError(caught instanceof Error ? caught.message : 'DOCUMENT_REVIEW_SAVE_FAILED'); }
    finally { setReviewBusy(null); }
  };

  const handleApproveReview = async () => {
    if (!job || !reviewInvoice) return;
    setReviewBusy('approve'); setReviewError(null);
    try {
      const approved = await ArabicAiIpaasClient.approveDocumentReview(job.document.id, reviewInvoice);
      setReviewRecord(approved);
      setReviewInvoice(approved.reviewedJson);
    } catch (caught) { setReviewError(caught instanceof Error ? caught.message : 'DOCUMENT_REVIEW_APPROVAL_FAILED'); }
    finally { setReviewBusy(null); }
  };

  const handleExportVerified = async () => {
    if (!job || reviewRecord?.status !== 'approved') return;
    setReviewBusy('export'); setReviewError(null);
    try { await ArabicAiIpaasClient.downloadVerifiedInvoice(job.document.id, job.document.filename); }
    catch (caught) { setReviewError(caught instanceof Error ? caught.message : 'VERIFIED_JSON_EXPORT_FAILED'); }
    finally { setReviewBusy(null); }
  };
  const displayValue = (value: string | null | undefined) => value ?? (language === 'ar' ? 'غير موجود' : 'Not found');
  const warningLabel = (warning: string) => invoiceWarningLabels[warning]?.[language] ?? warning;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" size="md">
            {language === 'ar' ? 'رفع المستند متصل بالواجهة البرمجية' : 'Live document upload'}
          </Badge>
          <Badge variant="info" size="md">
            {language === 'ar' ? 'OCR عبر اتصال BYOAI صريح' : 'OCR through explicit BYOAI connection'}
          </Badge>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
          {language === 'ar' ? 'ذكاء المستندات العربية' : 'Arabic Document Intelligence'}
        </h1>
        <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
          {language === 'ar'
            ? 'يرفع المحتوى بعد التحقق الأمني، ثم يستخدم اتصال Gemini المفعّل صراحةً لاستخراج النص العربي والبنية. إذا لم يوجد اتصال مؤهل، يعرض النظام حالة غير مهيأة دون نجاح وهمي.'
            : 'Content is uploaded after security validation, then an explicitly enabled Gemini connection extracts Arabic text and structure. Without an eligible connection, the system reports not configured without fake success.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader
            title={language === 'ar' ? 'رفع مستند' : 'Upload document'}
            subtitle={language === 'ar' ? 'PDF أو PNG أو JPEG أو TIFF — حتى 25 ميجابايت' : 'PDF, PNG, JPEG, or TIFF — up to 25 MB'}
          />
          <CardBody className="space-y-4">
            <label className="border-2 border-dashed border-slate-300 hover:border-secondary bg-slate-50/60 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff" onChange={handleFileChange} disabled={isProcessing} className="sr-only" />
              <div className="w-12 h-12 rounded-full bg-blue-50 text-secondary flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[26px]">description</span>
              </div>
              <span className="text-xs font-bold text-primary font-arabic">
                {language === 'ar' ? 'اختر ملفاً لرفعه وتسجيل المهمة' : 'Choose a file to upload and register'}
              </span>
              <span className="text-[11px] text-slate-500 font-arabic mt-2">
                {language === 'ar' ? 'تُرفع وحدات الملف بعد التحقق الأمني؛ لا يتم عرض المحتوى أو تسجيله في السجلات.' : 'File bytes are uploaded after security validation; content is never returned or written to audit logs.'}
              </span>
            </label>

            {selectedFile && (
              <div className="p-3.5 border border-outline-variant rounded-xl text-xs space-y-2">
                <div className="font-bold text-primary break-all">{selectedFile.name}</div>
                <div className="font-mono text-slate-500">{formatFileSize(selectedFile.size)} · {selectedFile.type}</div>
                {isProcessing && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <LoadingSpinner size="sm" label="" />
                    <span>{language === 'ar' ? 'جارٍ التحقق والرفع والاستخراج...' : 'Validating, uploading, and extracting...'}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-arabic">
                {language === 'ar' ? 'تعذرت معالجة المستند: ' : 'Document processing failed: '}{error}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <Card className="min-h-[320px]">
            <CardHeader
              title={language === 'ar' ? 'حالة المهمة الحقيقية' : 'Verified job status'}
              subtitle={language === 'ar' ? 'الحالة الواردة مباشرة من Control API' : 'State returned directly by the Control API'}
            />
            <CardBody>
              {!job ? (
                <div className="p-10 text-center text-sm text-slate-500 font-arabic">
                  {isProcessing ? t('state.loading') : (language === 'ar' ? 'لم يتم تسجيل مستند بعد.' : 'No document has been registered yet.')}
                </div>
              ) : (
                <div className="space-y-4 font-arabic">
                  <div className={`p-4 rounded-xl border ${
                    job.extraction.status === 'ready'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : job.workerState === 'not_configured'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : job.extraction.status === 'failed'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <div className="font-bold text-sm">
                      {job.extraction.status === 'ready'
                        ? (language === 'ar' ? 'اكتمل استخراج المستند عبر اتصال BYOAI المفعّل.' : 'Document extraction completed through the enabled BYOAI connection.')
                        : job.workerState === 'not_configured'
                          ? (language === 'ar' ? 'تم رفع محتوى المستند والتحقق منه، لكن لا يوجد اتصال OCR مفعّل.' : 'Document content uploaded and verified; no OCR connection is enabled.')
                          : job.extraction.status === 'failed'
                            ? (language === 'ar' ? 'فشل عامل الاستخراج دون إنشاء نتيجة وهمية.' : 'The extraction worker failed without fabricating a result.')
                            : (language === 'ar' ? 'المستند قيد المعالجة.' : 'The document is processing.')}
                    </div>
                    <div className="text-xs mt-2">
                      {job.uploadConfigured
                        ? (language === 'ar' ? 'تم رفع المحتوى والتحقق من بصمته الرقمية.' : 'Content was uploaded and its digest verified.')
                        : (language === 'ar' ? 'لم يتم رفع محتوى الملف؛ تم تسجيل البيانات الوصفية فقط.' : 'File content was not uploaded; metadata only was registered.')}
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 border border-outline-variant rounded-lg">
                      <dt className="text-slate-500">{language === 'ar' ? 'اسم الملف' : 'Filename'}</dt>
                      <dd className="font-semibold text-primary break-all mt-1">{job.document.filename}</dd>
                    </div>
                    <div className="p-3 border border-outline-variant rounded-lg">
                      <dt className="text-slate-500">{language === 'ar' ? 'حالة المستند' : 'Document status'}</dt>
                      <dd className="font-mono font-semibold text-primary mt-1">{job.document.status}</dd>
                    </div>
                    <div className="p-3 border border-outline-variant rounded-lg">
                      <dt className="text-slate-500">{language === 'ar' ? 'حالة الاستخراج' : 'Extraction status'}</dt>
                      <dd className="font-mono font-semibold text-primary mt-1">{job.extraction.status}</dd>
                    </div>
                    <div className="p-3 border border-outline-variant rounded-lg">
                      <dt className="text-slate-500">{language === 'ar' ? 'معرف المستند' : 'Document ID'}</dt>
                      <dd className="font-mono text-primary break-all mt-1">{job.document.id}</dd>
                    </div>
                    <div className="p-3 border border-outline-variant rounded-lg sm:col-span-2">
                      <dt className="text-slate-500">{language === 'ar' ? 'بصمة المحتوى SHA-256' : 'Content SHA-256'}</dt>
                      <dd className="font-mono text-primary break-all mt-1">{job.upload.sha256}</dd>
                    </div>
                  </dl>

                  {job.extraction.status === 'ready' && invoice && (
                    <section className="space-y-4 rounded-xl border border-outline-variant bg-slate-50/60 p-4" aria-labelledby="structured-invoice-title">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 id="structured-invoice-title" className="font-bold text-primary">
                            {language === 'ar' ? 'بيانات الفاتورة المنظمة' : 'Structured invoice data'}
                          </h2>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {language === 'ar'
                              ? 'حقول مستخرجة بالذكاء الاصطناعي وليست اعتماداً محاسبياً؛ راجعها قبل الاستخدام.'
                              : 'AI-extracted fields, not accounting approval. Review them before use.'}
                          </p>
                        </div>
                        <Badge variant={invoice.reviewRequired ? 'warning' : 'success'} size="sm">
                          {invoice.reviewRequired
                            ? (language === 'ar' ? 'تحتاج مراجعة بشرية' : 'Human review required')
                            : (language === 'ar' ? 'جاهزة للمراجعة' : 'Ready for review')}
                        </Badge>
                      </div>

                      {invoice.validationWarnings.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                          <div className="font-bold">{language === 'ar' ? 'تنبيهات التحقق' : 'Validation warnings'}</div>
                          <ul className="mt-2 list-disc space-y-1 ps-5">
                            {invoice.validationWarnings.map((warning) => (
                              <li key={warning}>{warningLabel(warning)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {reviewInvoice && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                            {([
                              ['supplierName', language === 'ar' ? 'المورد' : 'Supplier'],
                              ['supplierTaxId', language === 'ar' ? 'الرقم الضريبي' : 'Tax ID'],
                              ['invoiceNumber', language === 'ar' ? 'رقم الفاتورة' : 'Invoice number'],
                              ['invoiceDate', language === 'ar' ? 'تاريخ الفاتورة YYYY-MM-DD' : 'Invoice date YYYY-MM-DD'],
                              ['dueDate', language === 'ar' ? 'تاريخ الاستحقاق YYYY-MM-DD' : 'Due date YYYY-MM-DD'],
                              ['currency', language === 'ar' ? 'العملة ISO' : 'Currency ISO'],
                              ['subtotal', language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'],
                              ['taxTotal', language === 'ar' ? 'الضريبة' : 'Tax total'],
                              ['grandTotal', language === 'ar' ? 'الإجمالي النهائي' : 'Grand total'],
                            ] as const).map(([field, label]) => (
                              <label key={field} className="rounded-lg border border-outline-variant bg-white p-3">
                                <span className="block text-slate-500 mb-1">{label}</span>
                                <input
                                  value={reviewInvoice[field] ?? ''}
                                  onChange={(event) => updateReviewField(field, event.target.value)}
                                  disabled={reviewRecord?.status === 'approved'}
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 font-semibold text-primary disabled:bg-slate-100"
                                />
                              </label>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void handleSaveReview()} disabled={!!reviewBusy || reviewRecord?.status === 'approved'} className="px-4 py-2 rounded-lg border border-secondary text-secondary text-xs font-bold disabled:opacity-50">
                              {reviewBusy === 'save' ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ المراجعة' : 'Save review')}
                            </button>
                            <button type="button" onClick={() => void handleApproveReview()} disabled={!!reviewBusy || reviewRecord?.status === 'approved'} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-50">
                              {reviewBusy === 'approve' ? (language === 'ar' ? 'جارٍ الاعتماد...' : 'Approving...') : (language === 'ar' ? 'اعتماد الفاتورة' : 'Approve invoice')}
                            </button>
                            {reviewRecord?.status === 'approved' && (
                              <button type="button" onClick={() => void handleExportVerified()} disabled={!!reviewBusy} className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-xs font-bold disabled:opacity-50">
                                {reviewBusy === 'export' ? (language === 'ar' ? 'جارٍ التصدير...' : 'Exporting...') : (language === 'ar' ? 'تصدير JSON الموثق' : 'Export verified JSON')}
                              </button>
                            )}
                          </div>
                          {reviewRecord && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                              {reviewRecord.status === 'approved'
                                ? (language === 'ar' ? 'تم الاعتماد البشري وحفظ بصمة SHA-256 دون تعديل نتيجة الذكاء الاصطناعي الأصلية.' : 'Human approval recorded with a SHA-256 digest; the original AI extraction remains unchanged.')
                                : (language === 'ar' ? 'تم حفظ المراجعة كمسودة جديدة.' : 'Review saved as a new draft record.')}
                              {reviewRecord.approvalDigest && <div className="mt-1 break-all font-mono">{reviewRecord.approvalDigest}</div>}
                            </div>
                          )}
                          {reviewError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{reviewError}</div>}
                        </div>
                      )}

                      <div className="overflow-x-auto rounded-lg border border-outline-variant bg-white">
                        <table className="w-full min-w-[680px] text-xs">
                          <caption className="p-3 text-start font-bold text-primary">
                            {language === 'ar' ? 'بنود الفاتورة المستخرجة' : 'Extracted line items'}
                          </caption>
                          <thead className="border-y border-slate-200 bg-slate-50 text-slate-600">
                            <tr>
                              <th className="p-3 text-start">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                              <th className="p-3 text-start">{language === 'ar' ? 'الكمية' : 'Quantity'}</th>
                              <th className="p-3 text-start">{language === 'ar' ? 'سعر الوحدة' : 'Unit price'}</th>
                              <th className="p-3 text-start">{language === 'ar' ? 'الضريبة' : 'Tax'}</th>
                              <th className="p-3 text-start">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {invoice.lineItems.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-4 text-center text-slate-500">
                                  {language === 'ar' ? 'لم تُستخرج بنود مفصلة.' : 'No detailed line items were extracted.'}
                                </td>
                              </tr>
                            ) : invoice.lineItems.map((item, index) => (
                              <tr key={index}>
                                <td className="p-2"><input aria-label="description" value={reviewInvoice?.lineItems[index]?.description ?? item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} disabled={reviewRecord?.status === 'approved'} className="w-full rounded border border-slate-200 p-2 disabled:bg-slate-100" /></td>
                                {(['quantity', 'unitPrice', 'taxAmount', 'lineTotal'] as const).map((field) => (
                                  <td key={field} className="p-2"><input aria-label={field} value={reviewInvoice?.lineItems[index]?.[field] ?? ''} onChange={(e) => updateLineItem(index, field, e.target.value)} disabled={reviewRecord?.status === 'approved'} className="w-full rounded border border-slate-200 p-2 disabled:bg-slate-100" /></td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {job.extraction.status === 'ready' && invoice && (
                    <InvoiceReviewPanel document={job.document} invoice={invoice} />
                  )}

                  {job.extraction.status === 'ready' && job.extraction.markdown && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="success" size="sm">
                          {language === 'ar' ? 'نتيجة استخراج حقيقية' : 'Real extraction result'}
                        </Badge>
                        {job.extraction.language && (
                          <Badge variant="neutral" size="sm">{job.extraction.language}</Badge>
                        )}
                        {job.extraction.pageCount && (
                          <Badge variant="neutral" size="sm">
                            {job.extraction.pageCount} {language === 'ar' ? 'صفحة' : 'page(s)'}
                          </Badge>
                        )}
                      </div>
                      <pre
                        dir={job.extraction.structuredJson?.textDirection === 'rtl' ? 'rtl' : 'auto'}
                        className="p-4 rounded-xl border border-outline-variant bg-white text-sm leading-7 whitespace-pre-wrap break-words font-arabic max-h-[420px] overflow-auto"
                      >
                        {job.extraction.markdown}
                      </pre>
                    </div>
                  )}

                  {job.extraction.errorMessage && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono break-words">
                      {job.extraction.errorMessage}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title={language === 'ar' ? 'سجل المستندات المحفوظ' : 'Persisted document history'}
          subtitle={language === 'ar'
            ? 'مستندات مساحة العمل الحالية فقط؛ التنزيل يتطلب جلسة مصادقاً عليها.'
            : 'Only documents from the current workspace; downloads require an authenticated session.'}
        />
        <CardBody className="space-y-3">
          {isHistoryLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <LoadingSpinner size="sm" label="" />
              <span>{language === 'ar' ? 'جارٍ تحميل السجل...' : 'Loading history...'}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-xs text-slate-500 font-arabic">
              {language === 'ar' ? 'لا توجد مستندات محفوظة في مساحة العمل.' : 'No persisted documents in this workspace.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-outline-variant rounded-xl">
              {history.map((document) => (
                <div key={document.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="font-semibold text-sm text-primary break-all">{document.filename}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {formatFileSize(document.sizeBytes)} · {document.mediaType} · {new Date(document.createdAt).toLocaleString(language === 'ar' ? 'ar-JO' : 'en')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={document.status === 'ready' ? 'success' : document.status === 'failed' ? 'error' : 'neutral'}
                        size="sm"
                      >
                        {document.status}
                      </Badge>
                      {document.sha256 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          SHA-256 {document.sha256.slice(0, 12)}…
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {document.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => void handleRetryExtraction(document)}
                        disabled={retryingId === document.id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-amber-500 text-amber-700 text-xs font-bold hover:bg-amber-50 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                        {retryingId === document.id
                          ? (language === 'ar' ? 'جارٍ إعادة الاستخراج...' : 'Retrying extraction...')
                          : (language === 'ar' ? 'إعادة الاستخراج' : 'Retry extraction')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDownload(document)}
                      disabled={downloadingId === document.id}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-secondary text-secondary text-xs font-bold hover:bg-blue-50 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      {downloadingId === document.id
                        ? (language === 'ar' ? 'جارٍ التنزيل...' : 'Downloading...')
                        : (language === 'ar' ? 'تنزيل الأصل' : 'Download original')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {historyError && (
            <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-arabic">
              {language === 'ar' ? 'تعذر تحميل سجل المستندات: ' : 'Document history error: '}{historyError}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
