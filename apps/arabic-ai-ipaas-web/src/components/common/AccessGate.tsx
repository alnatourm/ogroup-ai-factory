import React, { useState } from 'react';
import { ArabicAiIpaasClient } from '../../api/client.js';
import { getApiConfig, updateApiConfig } from '../../api/config.js';
import { useI18n } from '../../i18n/I18nContext.js';

interface AccessGateProps {
  onAuthenticated: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onAuthenticated }) => {
  const { language, toggleLanguage } = useI18n();
  const initial = getApiConfig();
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    const credential = apiKey.trim();
    if (!credential) {
      setError(language === 'ar' ? 'مفتاح الوصول مطلوب.' : 'An access key is required.');
      return;
    }

    setChecking(true);
    setError('');
    updateApiConfig({ apiKey: credential, baseUrl: baseUrl.trim() });
    try {
      await ArabicAiIpaasClient.listProviderConnections();
      setApiKey('');
      onAuthenticated();
    } catch {
      updateApiConfig({ apiKey: undefined });
      setError(
        language === 'ar'
          ? 'تعذر التحقق من بيانات الدخول. لم يتم فتح مساحة العمل.'
          : 'The credential could not be verified. The workspace remains locked.',
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-on-surface">
      <section className="mx-auto max-w-lg rounded-2xl border border-outline-variant bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
              و
            </div>
            <h1 className="font-arabic text-2xl font-bold text-primary">
              {language === 'ar' ? 'منصة وصل للذكاء الاصطناعي العربي' : 'Wasl Arabic AI iPaaS'}
            </h1>
            <p className="mt-2 font-arabic text-sm leading-6 text-on-surface-variant">
              {language === 'ar'
                ? 'طبقة الذكاء العربي بين الأشخاص وأنظمة الأعمال ومزودي الذكاء الاصطناعي.'
                : 'The Arabic intelligence layer between people, business systems, and AI providers.'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-primary"
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {language === 'ar'
            ? 'هذه بيئة مرحلية مغلقة. لا تُعرض بيانات مساحة العمل ولا تُنفذ العمليات قبل التحقق من مفتاح الوصول.'
            : 'This is a locked staging environment. Workspace data and actions remain unavailable until the access key is verified.'}
        </div>

        <form onSubmit={connect} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-arabic text-sm font-semibold">
              {language === 'ar' ? 'عنوان واجهة API' : 'API base URL'}
            </span>
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={language === 'ar' ? 'نفس النطاق' : 'Same origin'}
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm"
              autoComplete="url"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-arabic text-sm font-semibold">
              {language === 'ar' ? 'مفتاح الوصول' : 'Access key'}
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={checking}
            className="w-full rounded-lg bg-primary px-4 py-3 font-arabic text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking
              ? language === 'ar' ? 'جارٍ التحقق...' : 'Verifying...'
              : language === 'ar' ? 'فتح مساحة العمل' : 'Open workspace'}
          </button>
        </form>

        <p className="mt-5 font-arabic text-xs leading-5 text-on-surface-variant">
          {language === 'ar'
            ? 'يبقى المفتاح في ذاكرة جلسة المتصفح فقط ولا يُحفظ في التخزين المحلي.'
            : 'The key remains in browser session memory and is not written to local storage.'}
        </p>
      </section>
    </main>
  );
};
