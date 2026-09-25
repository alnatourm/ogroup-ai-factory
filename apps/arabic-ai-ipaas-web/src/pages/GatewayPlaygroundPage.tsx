import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { ChatMessage, GatewayResponse, SafeProviderConnection } from '../types/api.js';
import { Card, CardHeader, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

export const GatewayPlaygroundPage: React.FC = () => {
  const { language, t } = useI18n();

  // Provider & inference parameters are loaded from the workspace BYOAI registry.
  const [providers, setProviders] = useState<SafeProviderConnection[]>([]);
  const [providerConnectionId, setProviderConnectionId] = useState('');
  const [model, setModel] = useState('');
  const [providerLoadError, setProviderLoadError] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [normalizeDialect, setNormalizeDialect] = useState(true);
  const [maskPii, setMaskPii] = useState(true);
  const [enforceGlossary, setEnforceGlossary] = useState(true);

  // Chat History
  const [systemPrompt, setSystemPrompt] = useState(
    'أنت مساعد أعمال عربي. أجب بدقة ولا تدّع تنفيذ أي إجراء أو ضمان غير موصول فعلياً.'
  );

  const [promptInput, setPromptInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [latestResponse, setLatestResponse] = useState<GatewayResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'formatted' | 'json'>('formatted');
  const [latencyMs, setLatencyMs] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ArabicAiIpaasClient.listProviderConnections()
      .then((connections) => {
        if (cancelled) return;
        const compatible = connections.filter(
          (provider) =>
            provider.status === 'active' &&
            (provider.providerType === 'openai-compatible' || provider.providerType === 'gemini'),
        );
        setProviders(compatible);
        const first = compatible[0];
        if (first) {
          setProviderConnectionId(first.id);
          setModel(first.modelDefault ?? '');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProviderLoadError(error instanceof Error ? error.message : 'PROVIDER_CONNECTIONS_LOAD_FAILED');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProviderChange = (id: string) => {
    setProviderConnectionId(id);
    const selected = providers.find((provider) => provider.id === id);
    setModel(selected?.modelDefault ?? '');
    setMessages([]);
    setLatestResponse(null);
  };

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: promptInput.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setPromptInput('');
    setIsLoading(true);

    const startTime = Date.now();
    try {
      const payloadMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...newHistory,
      ];

      const response = await ArabicAiIpaasClient.createChatCompletion({
        providerConnectionId,
        model: model || undefined,
        messages: payloadMessages,
        temperature,
      });

      setLatencyMs(Date.now() - startTime);
      setLatestResponse(response);

      const assistantMsg = response.choices[0]?.message;
      if (assistantMsg) {
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تنفيذ الاستدعاء');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!latestResponse) return;
    navigator.clipboard.writeText(JSON.stringify(latestResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {language === 'ar' ? 'بوابة الذكاء الاصطناعي العربية' : 'Arabic AI Gateway'}
            </Badge>
            <Badge variant="success" size="md">
              BYOAI Multi-Provider
            </Badge>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'مختبر البوابة الذكية ومعاينة الاستدعاء (Gateway Playground)'
              : 'Arabic AI Gateway Playground'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'اختبار استدعاءات النماذج باللغة العربية، والتحقق من تحويل اللهجات وحجب الكيانات الحساسة ومعاينة الرد المتوافق مع نسق OpenAI.'
              : 'Test Arabic model prompts, dialect normalization, entity masking, and OpenAI-compatible output inspection.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon="delete_sweep"
            onClick={() => setMessages([])}
          >
            {language === 'ar' ? 'مسح المحادثة' : 'Clear Chat'}
          </Button>
        </div>
      </div>

      {/* Control Grid: Playground Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Model Parameters & Arabic Flags */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={language === 'ar' ? 'إعدادات النموذج والمعالجة' : 'Model & Arabic Features'}
            />
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary font-arabic mb-1">
                  {language === 'ar' ? 'النموذج النشط (Active Model)' : 'Model'}
                </label>
                <select
                  value={providerConnectionId}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  disabled={providers.length === 0}
                  className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-xs font-mono text-on-surface focus:outline-none disabled:opacity-60"
                >
                  {providers.length === 0 ? (
                    <option value="">
                      {language === 'ar' ? 'لا يوجد موفر بوابة مدعوم ونشط' : 'No active supported Gateway provider'}
                    </option>
                  ) : (
                    providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} — {provider.modelDefault ?? 'default model'}
                      </option>
                    ))
                  )}
                </select>
                {providerLoadError && (
                  <p className="mt-1 text-[11px] text-red-600 font-mono">{providerLoadError}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-primary mb-1">
                  <span className="font-arabic">{language === 'ar' ? 'درجة الحرارة (Temperature)' : 'Temperature'}</span>
                  <span className="font-mono text-secondary">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-secondary cursor-pointer"
                />
              </div>

              {/* Arabic-Specific Processing Flags */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="block text-xs font-bold text-primary font-arabic">
                  {language === 'ar' ? 'المعالجات الذكية للغة العربية' : 'Arabic NLP Transformers'}
                </span>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-surface border border-outline-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizeDialect}
                    onChange={(e) => setNormalizeDialect(e.target.checked)}
                    className="mt-0.5 rounded text-secondary focus:ring-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-primary font-arabic block">
                      {language === 'ar' ? 'توحيد اللهجات إلى الفصحى (Dialect -> MSA)' : 'Dialect Normalization'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-arabic block leading-tight">
                      {language === 'ar' ? 'تحويل المصطلحات العامية إلى لغة رسمية مؤسسية' : 'Normalizes regional terms to standard Arabic'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-surface border border-outline-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maskPii}
                    onChange={(e) => setMaskPii(e.target.checked)}
                    className="mt-0.5 rounded text-secondary focus:ring-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-primary font-arabic block">
                      {language === 'ar' ? 'حجب الكيانات والبيانات الحساسة (PII Masking)' : 'PII Entity Masking'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-arabic block leading-tight">
                      {language === 'ar' ? 'حجب الهويات والحسابات البنكية قبل الإرسال' : 'Masks sensitive identifiers before inference'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-surface border border-outline-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceGlossary}
                    onChange={(e) => setEnforceGlossary(e.target.checked)}
                    className="mt-0.5 rounded text-secondary focus:ring-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-primary font-arabic block">
                      {language === 'ar' ? 'إلزامية مسرد المصطلحات الحكومي' : 'Sovereign Glossary'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-arabic block leading-tight">
                      {language === 'ar' ? 'تطبيق ترجمات موحدة للأنظمة واللوائح' : 'Enforces official terminology standards'}
                    </span>
                  </div>
                </label>
              </div>

              {/* System Prompt */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-primary font-arabic mb-1">
                  {language === 'ar' ? 'توجيه النظام العربي (System Prompt)' : 'System Prompt'}
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface font-arabic focus:outline-none focus:border-secondary resize-none"
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Chat Stream & Response Shape Inspection (Span 2) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Chat / Interaction Canvas */}
          <Card className="flex flex-col min-h-[450px]">
            <CardHeader
              title={language === 'ar' ? 'جلسة الاستدعاء المباشر' : 'Inference Session'}
              subtitle={language === 'ar' ? 'تبادل الرسائل باللغة العربية مع النموذج' : 'Arabic chat conversation stream'}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('formatted')}
                    className={`px-2.5 py-1 rounded text-xs font-arabic cursor-pointer ${
                      activeTab === 'formatted'
                        ? 'bg-primary text-white font-bold'
                        : 'text-on-surface-variant hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'العرض المنسق' : 'Formatted'}
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
                    {language === 'ar' ? 'رمز OpenAI JSON' : 'OpenAI JSON'}
                  </button>
                </div>
              }
            />

            <CardBody className="flex-1 overflow-y-auto space-y-4 max-h-[400px]">
              {activeTab === 'formatted' ? (
                messages.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-arabic">
                    {language === 'ar'
                      ? 'لا توجد رسائل سابقة. أدخل استعلامك المؤسسي أدناه للبدء.'
                      : 'No messages yet. Send an Arabic query to begin.'}
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 font-arabic">
                        <span className="font-bold">
                          {msg.role === 'user'
                            ? language === 'ar' ? 'المستخدم المؤسسي' : 'Enterprise User'
                            : language === 'ar' ? 'بوابة «وصل» العربية' : 'Wasl AI Assistant'}
                        </span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] text-xs font-arabic leading-relaxed whitespace-pre-line ${
                          msg.role === 'user'
                            ? 'bg-blue-50 text-slate-900 border border-blue-100 rounded-tr-none'
                            : 'bg-primary text-white rounded-tl-none shadow-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* Raw OpenAI JSON Inspection Tab */
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
                    {JSON.stringify(latestResponse, null, 2)}
                  </pre>
                </div>
              )}

              {isLoading && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <LoadingSpinner size="sm" label="" />
                  <span className="text-xs text-on-surface-variant font-arabic">
                    {language === 'ar'
                      ? 'جارٍ توجيه الاستعلام وفحص الكيانات عبر بوابة وصل العربية...'
                      : 'Routing prompt & masking entities via Wasl Sovereign Gateway...'}
                  </span>
                </div>
              )}
            </CardBody>

            {/* Prompt Input Form */}
            <div className="p-4 border-t border-slate-100 bg-surface">
              <form onSubmit={handleSendPrompt} className="space-y-3">
                <div className="relative">
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder={
                      language === 'ar'
                        ? 'أدخل الاستعلام المؤسسي باللغة العربية هنا...'
                        : 'Enter Arabic prompt query here...'
                    }
                    rows={2}
                    className="w-full p-3 pe-24 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-arabic text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15 resize-none leading-relaxed"
                  />
                  <div className="absolute end-2 bottom-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                      icon="send"
                      disabled={!promptInput.trim() || !providerConnectionId}
                    >
                      {t('action.run')}
                    </Button>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-arabic">
                  <span className="text-slate-400">{language === 'ar' ? 'أمثلة سريعة:' : 'Quick Prompts:'}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPromptInput(
                        'إذا وصل عرض سعر من المورد وكان المبلغ فوق 10000 ريال أرسله للمدير للموافقة.'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    عرض سعر &gt; 10000 ريال
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPromptInput(
                        'استخرج رقم السجل التجاري والرقم الضريبي والقيمة الإجمالية من نص العقد.'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    استخراج الكيانات الرسمية
                  </button>
                </div>
              </form>
            </div>
          </Card>

          {/* Telemetry Footer Bar */}
          {latestResponse && (
            <div className="p-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-arabic">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{language === 'ar' ? 'المعرف:' : 'ID:'}</span>
                <span className="font-mono font-bold text-primary">{latestResponse.id}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">{language === 'ar' ? 'الرموز:' : 'Tokens:'}</span>
                  <span className="font-mono font-semibold text-secondary">
                    {latestResponse.usage.total_tokens}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({latestResponse.usage.prompt_tokens} in / {latestResponse.usage.completion_tokens} out)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">{language === 'ar' ? 'زمن الاستجابة:' : 'Latency:'}</span>
                  <span className="font-mono font-semibold text-emerald-600">{latencyMs}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
