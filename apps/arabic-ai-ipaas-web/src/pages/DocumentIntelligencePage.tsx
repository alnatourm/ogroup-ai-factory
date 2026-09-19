import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { DocumentExtractionResult } from '../types/api.js';
import { Card, CardHeader, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

interface DocumentIntelligencePageProps {
  onSendToWorkflow?: () => void;
  onSendToGateway?: () => void;
}

export const DocumentIntelligencePage: React.FC<DocumentIntelligencePageProps> = ({
  onSendToWorkflow,
  onSendToGateway,
}) => {
  const { language, t } = useI18n();

  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'entities' | 'text' | 'json'>('entities');
  const [copied, setCopied] = useState(false);

  const [result, setResult] = useState<DocumentExtractionResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileMeta = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
    };
    setSelectedFile(fileMeta);
    setIsProcessing(true);

    try {
      const extracted = await ArabicAiIpaasClient.processDocument(fileMeta);
      setResult(extracted);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشلت معالجة المستند');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              OCR adapter not configured
            </Badge>
            <Badge variant="success" size="md">
              {language === 'ar' ? 'حفظ ترتيب القراءة RTL' : 'RTL Order Preserved'}
            </Badge>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'استوديو معالجة المستندات العربية والذكاء الاصطناعي (Document Intelligence)'
              : 'Arabic Document Intelligence'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'رفع واستخراج الوثائق الرسمية والعقود باللغة العربية مع حفظ ترتيب القراءة من اليمين إلى اليسار واستخراج الكيانات المالية والتنظيمية بدقة.'
              : 'Upload and parse Arabic documents, preserve RTL reading flow, and extract validated entities.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSendToWorkflow && (
            <Button
              variant="outline"
              size="sm"
              icon="account_tree"
              onClick={onSendToWorkflow}
            >
              {language === 'ar' ? 'إرسال إلى مسار العمل' : 'Send to Workflow'}
            </Button>
          )}
          {onSendToGateway && (
            <Button
              variant="primary"
              size="sm"
              icon="smart_toy"
              onClick={onSendToGateway}
            >
              {language === 'ar' ? 'إرسال إلى البوابة' : 'Send to Gateway'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Upload Dropzone & Extracted Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Upload & Metadata */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={language === 'ar' ? 'رفع المستندات والوثائق' : 'Document Ingestion'}
              subtitle={language === 'ar' ? 'يدعم مستندات PDF والصور الممسوحة ضوئياً' : 'PDF, scanned images, DOCX'}
            />
            <CardBody className="space-y-4">
              {/* Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-secondary bg-slate-50/60 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">upload_file</span>
                </div>
                <span className="text-xs font-bold text-primary font-arabic block mb-1">
                  {language === 'ar' ? 'اضغط لاختيار ملف أو اسحبه هنا' : 'Click to select or drag file here'}
                </span>
                <span className="text-[11px] text-slate-400 font-arabic block">
                  PDF, PNG, JPG (الحد الأقصى: 25 ميجابايت)
                </span>
              </label>

              {/* Selected File Metadata Card */}
              {selectedFile && (
                <div className="p-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-600 text-[22px]">
                      picture_as_pdf
                    </span>
                    <div className="overflow-hidden flex-1">
                      <span className="text-xs font-bold text-primary block truncate font-arabic">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </span>
                    </div>
                  </div>

                  {isProcessing ? (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <LoadingSpinner size="sm" label="" />
                      <span className="text-xs text-secondary font-semibold font-arabic">
                        {language === 'ar' ? 'جارٍ المعالجة واستخراج الكيانات...' : 'Extracting entities...'}
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-arabic">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>{language === 'ar' ? 'تمت المعالجة بنجاح' : 'Processed'}</span>
                      </span>
                      <span className="text-slate-400">3 صفحات</span>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Extracted Entities, RTL Text, and JSON (Span 2) */}
        <div className="lg:col-span-2 space-y-5">
          {result && (
            <Card className="min-h-[450px] flex flex-col">
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      description
                    </span>
                    <span className="text-sm font-bold font-arabic">{result.metadata.documentType}</span>
                  </div>
                }
                subtitle={`محرك الاستخراج: ${result.ocrEngine} • الدقة: ${(result.metadata.classificationConfidence * 100).toFixed(1)}%`}
                action={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('entities')}
                      className={`px-2.5 py-1 rounded text-xs font-arabic cursor-pointer ${
                        activeTab === 'entities'
                          ? 'bg-primary text-white font-bold'
                          : 'text-on-surface-variant hover:bg-slate-100'
                      }`}
                    >
                      {language === 'ar' ? 'الكيانات المستخرجة' : 'Entities'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('text')}
                      className={`px-2.5 py-1 rounded text-xs font-arabic cursor-pointer ${
                        activeTab === 'text'
                          ? 'bg-primary text-white font-bold'
                          : 'text-on-surface-variant hover:bg-slate-100'
                      }`}
                    >
                      {language === 'ar' ? 'النص الكامل (RTL)' : 'Full Text'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('json')}
                      className={`px-2.5 py-1 rounded text-xs font-arabic cursor-pointer ${
                        activeTab === 'json'
                          ? 'bg-primary text-white font-bold'
                          : 'text-on-surface-variant hover:bg-slate-100'
                      }`}
                    >
                      {language === 'ar' ? 'رمز JSON' : 'JSON Schema'}
                    </button>
                  </div>
                }
              />

              <CardBody className="flex-1 overflow-y-auto max-h-[450px]">
                {activeTab === 'entities' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.extractedEntities.map((entity, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-surface border border-outline-variant rounded-xl space-y-1 font-arabic"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{language === 'ar' ? entity.labelAr : entity.labelEn}</span>
                          <span className="font-mono text-[11px] text-emerald-600 font-semibold">
                            {(entity.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs font-bold text-primary font-mono select-all">
                          {entity.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeTab === 'text' ? (
                  <div className="p-4 bg-surface border border-outline-variant rounded-xl font-arabic text-xs leading-loose whitespace-pre-line text-slate-800" dir="rtl">
                    {result.fullTextAr}
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="absolute top-2 end-2 px-2 py-1 text-xs bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copied ? 'check' : 'content_copy'}
                      </span>
                      <span>{copied ? t('action.copied') : t('action.copy')}</span>
                    </button>
                    <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed" dir="ltr">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
