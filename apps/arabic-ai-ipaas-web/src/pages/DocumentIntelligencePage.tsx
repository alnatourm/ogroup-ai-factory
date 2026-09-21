import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { DocumentProcessingJob } from '../types/api.js';
import { Card, CardBody, CardHeader } from '../components/common/Card.js';
import { Badge } from '../components/common/Badge.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

export const DocumentIntelligencePage: React.FC = () => {
  const { language, t } = useI18n();
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [job, setJob] = useState<DocumentProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const metadata = { name: file.name, size: file.size, type: file.type || 'application/pdf' };
    setSelectedFile(metadata);
    setJob(null);
    setError(null);
    setIsProcessing(true);
    try {
      setJob(await ArabicAiIpaasClient.processDocument(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'DOCUMENT_REQUEST_FAILED');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
    </div>
  );
};
