import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { Card, CardHeader, CardBody, CardFooter } from '../components/common/Card.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import { getApiConfig } from '../api/config.js';
import type { DataPolicyTier, ProviderType } from '../types/api.js';

interface WorkspaceOnboardingPageProps {
  onCompleted?: () => void;
}

export const WorkspaceOnboardingPage: React.FC<WorkspaceOnboardingPageProps> = ({ onCompleted }) => {
  const { language, t } = useI18n();

  // The authenticated OIDC session is the source of truth for tenant identity.
  const { workspaceId, role } = getApiConfig();
  const workspaceName = language === 'ar' ? 'مساحة عمل Arabic AI iPaaS' : 'Arabic AI iPaaS Workspace';

  // Policy tier selection
  const [dataPolicy, setDataPolicy] = useState<DataPolicyTier>('PRIVATE');

  // Provider configuration state
  const [providerType, setProviderType] = useState<ProviderType>('openai-compatible');
  const [providerName, setProviderName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelDefault, setModelDefault] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Submission & feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!apiKey.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال مفتاح API الخاص بمزود الذكاء الاصطناعي.' : 'Please enter provider API key.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Persist policy first. If provider creation fails, report the partial result explicitly.
      await ArabicAiIpaasClient.updateDataPolicy({
        dataZone: dataPolicy,
        optInConfirmed: dataPolicy === 'IMPROVEMENT_OPT_IN',
        ...(dataPolicy === 'IMPROVEMENT_OPT_IN' ? { rightsBasis: 'workspace_owner_explicit_selection' } : {}),
      });

      await ArabicAiIpaasClient.createProviderConnection({
        providerType,
        name: providerName,
        baseUrl,
        modelDefault,
        apiKey: apiKey.trim(),
        config: {
          onboardedPolicy: dataPolicy,
        },
      });

      setSuccessMessage(
        language === 'ar'
          ? 'تم حفظ سياسة مساحة العمل وربط مزود الذكاء الاصطناعي الأول. لم يتم عرض المفتاح السري أو تخزينه في الواجهة.'
          : 'Workspace policy saved and the initial AI provider was connected. The secret was not echoed or stored in the UI.'
      );

      // Clear the secret key from form state immediately after submission
      setApiKey('');

      if (onCompleted) {
        setTimeout(onCompleted, 1200);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : (language === 'ar' ? 'فشل إكمال التهيئة' : 'Failed to complete setup')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md" icon="verified">
            {language === 'ar' ? 'تهيئة مساحة العمل v0.2' : 'Workspace Setup v0.2'}
          </Badge>
          <Badge variant="success" size="md">
            {language === 'ar' ? 'واجهة API حية' : 'Live API'}
          </Badge>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary font-arabic tracking-tight">
          {language === 'ar' ? 'إعداد مساحة عمل المؤسسة' : 'Enterprise Workspace Setup'}
        </h1>
        <p className="text-sm text-on-surface-variant font-arabic max-w-3xl leading-relaxed">
          {language === 'ar'
            ? 'راجع مساحة العمل المرتبطة بهويتك، واختر سياسة استخدام البيانات، ثم اربط مزود الذكاء الاصطناعي الخاص بمؤسستك (BYOAI).'
            : 'Review the workspace linked to your identity, choose a data-use policy, and connect your organization’s BYOAI provider.'}
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-[24px]">check_circle</span>
          <p className="text-sm font-semibold font-arabic">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-center gap-3">
          <span className="material-symbols-outlined text-rose-600 text-[24px]">error</span>
          <p className="text-sm font-semibold font-arabic">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Verified Workspace Identity */}
        <Card>
          <CardHeader
            title={language === 'ar' ? '1. مساحة العمل المرتبطة بالهوية' : '1. Identity-linked Workspace'}
            subtitle={language === 'ar' ? 'تُحدد العضوية من جلسة OIDC الموثقة ولا يمكن استبدالها من المتصفح.' : 'Membership comes from the verified OIDC session and cannot be replaced in the browser.'}
          />
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label={language === 'ar' ? 'اسم مساحة العمل' : 'Workspace Name'}
              value={workspaceName}
              readOnly
            />
            <Input
              label={language === 'ar' ? 'معرّف مساحة العمل الموثق' : 'Verified Workspace ID'}
              value={workspaceId}
              readOnly
              dir="ltr"
            />
            <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 font-arabic">
              {language === 'ar' ? `الدور الموثق: ${role}` : `Verified role: ${role}`}
            </div>
          </CardBody>
        </Card>

        {/* Step 2: Data Policy Selection */}
        <Card>
          <CardHeader
            title={language === 'ar' ? '2. اختيار سياسة وحوكمة البيانات المعتمدة' : '2. Data Governance & Privacy Tier'}
            subtitle={language === 'ar' ? 'تحديد نطاق خصوصية المحتوى وفق بنود قاعدة البيانات والتصنيف الوطني' : 'Derives from database design tiers: PRIVATE, ANONYMOUS, OPT-IN'}
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TIER 1: PRIVATE */}
              <div
                onClick={() => setDataPolicy('PRIVATE')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  dataPolicy === 'PRIVATE'
                    ? 'border-secondary bg-blue-50/60 shadow-sm'
                    : 'border-outline-variant bg-surface hover:border-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Private by default
                    </span>
                    <input
                      type="radio"
                      name="data_policy"
                      checked={dataPolicy === 'PRIVATE'}
                      onChange={() => setDataPolicy('PRIVATE')}
                      className="text-secondary focus:ring-secondary cursor-pointer"
                    />
                  </div>
                  <h4 className="text-sm font-bold text-primary font-arabic mb-1">
                    {language === 'ar' ? 'خاص ومعزول كلياً (PRIVATE)' : 'Strict Private (PRIVATE)'}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                    {language === 'ar'
                      ? 'اطلب سياسة عدم التدريب وعدم الاحتفاظ بالمحتوى، مع ضرورة التحقق من دعمها فعلياً لدى المزود والبنية الخلفية.'
                      : 'Request no-training and zero-retention behavior. Enforcement must be verified against the configured provider and backend.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-emerald-700 font-semibold flex items-center gap-1 font-arabic">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>{language === 'ar' ? 'الخيار الافتراضي الموصى به' : 'Recommended default'}</span>
                </div>
              </div>

              {/* TIER 2: ANONYMOUS_TELEMETRY */}
              <div
                onClick={() => setDataPolicy('ANONYMOUS_TELEMETRY')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  dataPolicy === 'ANONYMOUS_TELEMETRY'
                    ? 'border-secondary bg-blue-50/60 shadow-sm'
                    : 'border-outline-variant bg-surface hover:border-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Metrics Only
                    </span>
                    <input
                      type="radio"
                      name="data_policy"
                      checked={dataPolicy === 'ANONYMOUS_TELEMETRY'}
                      onChange={() => setDataPolicy('ANONYMOUS_TELEMETRY')}
                      className="text-secondary focus:ring-secondary cursor-pointer"
                    />
                  </div>
                  <h4 className="text-sm font-bold text-primary font-arabic mb-1">
                    {language === 'ar' ? 'قياس تشغيلي مجهول (ANONYMOUS)' : 'Anonymous Telemetry'}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                    {language === 'ar'
                      ? 'مشاركة إحصاءات تشغيلية مجردة (معدلات الاستجابة، عدد الرموز، أخطاء الربط) دون نصوص أو PII.'
                      : 'Aggregated operational metrics without any user prompts or personal identifiers.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-arabic">
                  {language === 'ar' ? 'مراقبة موثوقية الأداء' : 'Operational Monitoring'}
                </div>
              </div>

              {/* TIER 3: IMPROVEMENT_OPT_IN */}
              <div
                onClick={() => setDataPolicy('IMPROVEMENT_OPT_IN')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  dataPolicy === 'IMPROVEMENT_OPT_IN'
                    ? 'border-secondary bg-blue-50/60 shadow-sm'
                    : 'border-outline-variant bg-surface hover:border-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Flywheel Opt-In
                    </span>
                    <input
                      type="radio"
                      name="data_policy"
                      checked={dataPolicy === 'IMPROVEMENT_OPT_IN'}
                      onChange={() => setDataPolicy('IMPROVEMENT_OPT_IN')}
                      className="text-secondary focus:ring-secondary cursor-pointer"
                    />
                  </div>
                  <h4 className="text-sm font-bold text-primary font-arabic mb-1">
                    {language === 'ar' ? 'تحسين النماذج (IMPROVEMENT_OPT_IN)' : 'Arabic Model Opt-In'}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                    {language === 'ar'
                      ? 'اختيار صريح يسمح باستخدام إشارات التحسين المرخّصة فقط، مع تسجيل الموافقة في سجل التدقيق.'
                      : 'Explicit legal consent to contribute filtered Arabic dialect & OCR correction signals.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-purple-700 font-semibold font-arabic">
                  {language === 'ar' ? 'يتطلب تأكيداً صريحاً' : 'Requires explicit confirmation'}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Step 3: Initial BYOAI Provider Connection */}
        <Card>
          <CardHeader
            title={language === 'ar' ? '3. ربط مزود الذكاء الاصطناعي الأول (BYOAI)' : '3. Initial BYOAI Provider Connection'}
            subtitle={language === 'ar' ? 'أدخل تفاصيل الاتصال ومفتاح API؛ سيُرسل السر إلى الخادم ولن تعيده الواجهة.' : 'Enter connection details and an API key; the secret is sent to the server and is never echoed by the UI.'}
          />
          <CardBody className="space-y-5">
            {/* Provider Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-primary font-arabic">
                {language === 'ar' ? 'نوع مزود الذكاء الاصطناعي المعتمد' : 'Provider Protocol'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'openai-compatible' as const, label: 'OpenAI / Azure', icon: 'smart_toy' },
                  { id: 'gemini' as const, label: 'Vertex AI / Gemini', icon: 'psychology' },
                  { id: 'anthropic-compatible' as const, label: 'Claude Enterprise', icon: 'memory' },
                  { id: 'custom-http' as const, label: 'Local Sovereign LLM', icon: 'dns' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProviderType(p.id);
                      if (p.id === 'openai-compatible') {
                        setBaseUrl('');
                        setModelDefault('');
                        setProviderName('');
                      } else if (p.id === 'gemini') {
                        setBaseUrl('');
                        setModelDefault('');
                        setProviderName('');
                      } else if (p.id === 'anthropic-compatible') {
                        setBaseUrl('');
                        setModelDefault('');
                        setProviderName('');
                      } else {
                        setBaseUrl('');
                        setModelDefault('');
                        setProviderName('');
                      }
                    }}
                    className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      providerType === p.id
                        ? 'border-secondary bg-blue-50/70 text-secondary font-bold'
                        : 'border-outline-variant bg-surface text-on-surface-variant hover:border-slate-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                    <span className="text-xs font-arabic">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={language === 'ar' ? 'اسم نقطة الاتصال' : 'Connection Name'}
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                required
              />
              <Input
                label={language === 'ar' ? 'النموذج الافتراضي (Default Model)' : 'Default Model'}
                value={modelDefault}
                onChange={(e) => setModelDefault(e.target.value)}
                dir="ltr"
                required
              />
              <div className="md:col-span-2">
                <Input
                  label={language === 'ar' ? 'عنوان واجهة المزود (Base URL)' : 'Provider Base URL'}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Secret API Key with Strict Masking Notice */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary font-arabic flex items-center justify-between">
                <span>{language === 'ar' ? 'مفتاح الاعتماد السري (Provider API Key)' : 'Provider API Key / Secret'}</span>
                <span className="text-[11px] text-rose-600 font-normal">
                  {language === 'ar' ? 'لن يتم إظهار هذا المفتاح مرة أخرى بعد الحفظ' : 'Write-only: will never be displayed after save'}
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل مفتاح API السري الخاص بالمزود...' : 'Enter provider secret key...'}
                  dir="ltr"
                  autoComplete="off"
                  spellCheck="false"
                  required
                  className="w-full h-10 ps-3.5 pe-10 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:border-secondary focus:ring-secondary/20 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute end-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showKey ? 'إخفاء' : 'إظهار'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Security Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600 font-arabic">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">verified_user</span>
                <p className="leading-relaxed">
                  {t('security.noticeDescription')}
                </p>
              </div>
            </div>
          </CardBody>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-on-surface-variant font-arabic">
              {language === 'ar'
                ? 'سيتم تفعيل عزل المستأجر وتشفير الاعتمادات فور الضغط على الحفظ.'
                : 'The provider secret is submitted to the encrypted backend store and is never returned to the browser.'}
            </span>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              icon="arrow_back"
              className="w-full sm:w-auto"
            >
              {language === 'ar' ? 'حفظ وتفعيل مساحة العمل' : 'Save & Activate Workspace'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
