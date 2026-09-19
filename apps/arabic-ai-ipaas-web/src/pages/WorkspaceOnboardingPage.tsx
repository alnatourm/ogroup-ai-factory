import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { Card, CardHeader, CardBody, CardFooter } from '../components/common/Card.js';
import { Input } from '../components/common/Input.js';
import { Select } from '../components/common/Select.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import { updateApiConfig } from '../api/config.js';
import type { DataPolicyTier, ProviderType } from '../types/api.js';

interface WorkspaceOnboardingPageProps {
  onCompleted?: () => void;
}

export const WorkspaceOnboardingPage: React.FC<WorkspaceOnboardingPageProps> = ({ onCompleted }) => {
  const { language, t } = useI18n();

  // Workspace details state
  const [workspaceName, setWorkspaceName] = useState('مساحة عمل هيئة التحول الرقمي والذكاء الاصطناعي');
  const [slug, setSlug] = useState('gov-digital-ai-ksa');
  const [region, setRegion] = useState('ksa-central-riyadh');

  // Policy tier selection
  const [dataPolicy, setDataPolicy] = useState<DataPolicyTier>('PRIVATE');

  // Provider configuration state
  const [providerType, setProviderType] = useState<ProviderType>('openai-compatible');
  const [providerName, setProviderName] = useState('Azure OpenAI السيادي المعتمد');
  const [baseUrl, setBaseUrl] = useState('https://wasl-sovereign-azure.openai.azure.com/v1');
  const [modelDefault, setModelDefault] = useState('gpt-4o');
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

    if (!workspaceName.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال اسم مساحة العمل.' : 'Please enter workspace name.');
      return;
    }
    if (!apiKey.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال مفتاح API الخاص بمزود الذكاء الاصطناعي.' : 'Please enter provider API key.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update runtime workspace configuration
      updateApiConfig({ workspaceId: slug.trim() || 'workspace-a' });

      // Live-wire: create provider connection through typed API client
      await ArabicAiIpaasClient.createProviderConnection({
        providerType,
        name: providerName,
        baseUrl,
        modelDefault,
        apiKey: apiKey.trim(),
        config: {
          region,
          onboardedPolicy: dataPolicy,
        },
      });

      // Update data policy
      await ArabicAiIpaasClient.updateDataPolicy({
        workspaceId: slug,
        dataZone: dataPolicy,
      });

      setSuccessMessage(
        language === 'ar'
          ? 'تم إنشاء وتهيئة مساحة العمل وربط مزود الذكاء الاصطناعي الأول بنجاح وأمان!'
          : 'Workspace configured and initial AI provider securely connected!'
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
            {language === 'ar' ? 'تهيئة مساحة العمل السيادية v0.1' : 'Sovereign Onboarding v0.1'}
          </Badge>
          <Badge variant="success" size="md">
            {language === 'ar' ? 'معتمد NDMO Level 4' : 'NDMO Level 4 Certified'}
          </Badge>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary font-arabic tracking-tight">
          {language === 'ar' ? 'إعداد مساحة عمل المؤسسة (Workspace Onboarding)' : 'Enterprise Workspace Onboarding'}
        </h1>
        <p className="text-sm text-on-surface-variant font-arabic max-w-3xl leading-relaxed">
          {language === 'ar'
            ? 'قم بتهيئة مساحة العمل المؤسسية، واختيار سياسة الخصوصية وحوكمة البيانات المعتمدة، وربط مفتاح مزود الذكاء الاصطناعي الأول الخاص بمؤسستك (BYOAI) مع التشفير السيادي الكامل.'
            : 'Configure your enterprise sovereign workspace, select data governance tiers, and connect your initial BYOAI provider.'}
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
        {/* Step 1: Workspace Identity */}
        <Card>
          <CardHeader
            title={language === 'ar' ? '1. بيانات وهوية مساحة العمل' : '1. Workspace Identity & Sovereign Region'}
            subtitle={language === 'ar' ? 'تحديد اسم ومعرف وبيئة السحابة السيادية للمنشأة' : 'Name, slug, and sovereign deployment region'}
          />
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label={language === 'ar' ? 'اسم مساحة العمل المؤسسية' : 'Workspace Name'}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <Input
              label={language === 'ar' ? 'المعرّف التقني الفريد (Slug)' : 'Unique Slug'}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              helperText={language === 'ar' ? 'يُستخدم في مسارات واجهة برمجة التطبيقات وعزل البيانات.' : 'Used in API paths and tenant isolation.'}
              dir="ltr"
              required
            />
            <div className="md:col-span-2">
              <Select
                label={language === 'ar' ? 'بيئة النشر والاستضافة السيادية (Sovereign Cloud Region)' : 'Sovereign Cloud Region'}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                options={[
                  { value: 'ksa-central-riyadh', label: 'المملكة العربية السعودية - السحابة السيادية المركزية (الرياض)' },
                  { value: 'ksa-west-jeddah', label: 'المملكة العربية السعودية - المنطقة الغربية (جدة)' },
                  { value: 'uae-central-abudhabi', label: 'دولة الإمارات العربية المتحدة - السحابة السيادية (أبوظبي)' },
                  { value: 'mena-isolated-vault', label: 'خزينة محلية معزولة تماماً (Isolated Sovereign Air-Gapped Vault)' },
                ]}
              />
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
                      ZDR Level 4
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
                      ? 'حظر تخزين البيانات. عدم استخدام المحتوى لأي أغراض تدريبية إطلاقاً (Zero Data Retention).'
                      : 'Zero data retention for training. Complete tenant cryptographic isolation.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-emerald-700 font-semibold flex items-center gap-1 font-arabic">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>{language === 'ar' ? 'الخيار الموصى به للمؤسسات الحكومية' : 'Recommended for Gov / Regulated'}</span>
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
                      ? 'موافقة صريحة وموقعة قانونياً للمساهمة في تحسين الذكاء الاصطناعي باللغة العربية وتصحيح اللهجات.'
                      : 'Explicit legal consent to contribute filtered Arabic dialect & OCR correction signals.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-purple-700 font-semibold font-arabic">
                  {language === 'ar' ? 'يتطلب توقيع CDO & CISO' : 'Requires Dual-Admin Approval'}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Step 3: Initial BYOAI Provider Connection */}
        <Card>
          <CardHeader
            title={language === 'ar' ? '3. ربط مزود الذكاء الاصطناعي الأول (BYOAI)' : '3. Initial BYOAI Provider Connection'}
            subtitle={language === 'ar' ? 'أدخل تفاصيل الاعتماد ومفتاح API مع التشفير السيادي الفوري' : 'Bring Your Own AI with instant HSM encryption'}
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
                        setBaseUrl('https://wasl-sovereign-azure.openai.azure.com/v1');
                        setModelDefault('gpt-4o');
                        setProviderName('Azure OpenAI السيادي');
                      } else if (p.id === 'gemini') {
                        setBaseUrl('https://me-central2-aiplatform.googleapis.com/v1');
                        setModelDefault('gemini-1.5-pro');
                        setProviderName('Vertex AI Gemini Enterprise');
                      } else if (p.id === 'anthropic-compatible') {
                        setBaseUrl('https://api.anthropic-sovereign.local/v1');
                        setModelDefault('claude-3-5-sonnet');
                        setProviderName('Claude 3.5 Sonnet Gateway');
                      } else {
                        setBaseUrl('https://llm.internal.sovereign.local/v1');
                        setModelDefault('falcon-40b-arabic');
                        setProviderName('النموذج السيادي الداخلي');
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
                : 'Tenant isolation and HSM encryption activate upon submission.'}
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
