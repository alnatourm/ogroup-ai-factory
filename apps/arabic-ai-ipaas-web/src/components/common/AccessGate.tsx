import React, { useEffect, useState } from 'react';
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
  const [oidcConfigured, setOidcConfigured] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    ArabicAiIpaasClient.getAuthStatus()
      .then((status) => {
        if (!active) return;
        setOidcConfigured(status.configured);
        if (status.authenticated && status.session) {
          updateApiConfig({
            workspaceId: status.session.workspaceId,
            userId: status.session.userId,
            role: status.session.role,
          });
          onAuthenticated();
        }
      })
      .catch(() => {
        if (active) setError(language === 'ar' ? 'تعذر قراءة حالة المصادقة.' : 'Authentication status is unavailable.');
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [language, onAuthenticated]);

  const connectWithApiKey = async (event: React.FormEvent) => {
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

  const startEnterpriseLogin = () => {
    const authBase = getApiConfig().baseUrl;
    window.location.assign(`${authBase}/auth/login`);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-on-surface">
      <section className="mx-auto max-w-lg rounded-2xl border border-outline-variant bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">و</div>
            <h1 className="font-arabic text-2xl font-bold text-primary">
              {language === 'ar' ? 'منصة وصل للذكاء الاصطناعي العربي' : 'Wasl Arabic AI iPaaS'}
            </h1>
            <p className="mt-2 font-arabic text-sm leading-6 text-on-surface-variant">
              {language === 'ar'
                ? 'طبقة الذكاء العربي بين الأشخاص وأنظمة الأعمال ومزودي الذكاء الاصطناعي.'
                : 'The Arabic intelligence layer between people, business systems, and AI providers.'}
            </p>
          </div>
          <button type="button" onClick={toggleLanguage} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-primary">
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {language === 'ar'
            ? 'هذه بيئة مرحلية مغلقة. لا تُعرض بيانات مساحة العمل ولا تُنفذ العمليات قبل التحقق من الهوية.'
            : 'This is a locked staging environment. Workspace data and actions remain unavailable until identity is verified.'}
        </div>

        {statusLoading ? (
          <p className="py-4 text-center text-sm text-on-surface-variant">
            {language === 'ar' ? 'جارٍ فحص إعداد المصادقة...' : 'Checking authentication configuration...'}
          </p>
        ) : oidcConfigured ? (
          <button type="button" onClick={startEnterpriseLogin} className="w-full rounded-lg bg-primary px-4 py-3 font-arabic text-sm font-bold text-white">
            {language === 'ar' ? 'تسجيل الدخول المؤسسي' : 'Enterprise sign in'}
          </button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {language === 'ar'
              ? 'تسجيل الدخول المؤسسي غير مهيأ بعد. يمكن استخدام مفتاح API إداري للاختبار المرحلي.'
              : 'Enterprise sign-in is not configured yet. An administrative API key can be used for controlled staging access.'}
          </div>
        )}

        <details className="mt-5">
          <summary className="cursor-pointer font-arabic text-sm font-semibold text-primary">
            {language === 'ar' ? 'دخول API للمرحلة الانتقالية' : 'Transitional API access'}
          </summary>
          <form onSubmit={connectWithApiKey} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block font-arabic text-sm font-semibold">
                {language === 'ar' ? 'عنوان واجهة API' : 'API base URL'}
              </span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={language === 'ar' ? 'نفس النطاق' : 'Same origin'} className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm" autoComplete="url" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-arabic text-sm font-semibold">
                {language === 'ar' ? 'مفتاح الوصول' : 'Access key'}
              </span>
              <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm" autoComplete="off" required />
            </label>
            <button type="submit" disabled={checking} className="w-full rounded-lg border border-primary bg-white px-4 py-3 font-arabic text-sm font-bold text-primary disabled:opacity-60">
              {checking
                ? language === 'ar' ? 'جارٍ التحقق...' : 'Verifying...'
                : language === 'ar' ? 'فتح بمفتاح API' : 'Open with API key'}
            </button>
          </form>
        </details>

        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <p className="mt-5 font-arabic text-xs leading-5 text-on-surface-variant">
          {language === 'ar'
            ? 'جلسة OIDC تستخدم ملفات ارتباط HttpOnly. مفاتيح API الانتقالية تبقى في ذاكرة الصفحة فقط.'
            : 'OIDC sessions use HttpOnly cookies. Transitional API keys remain in page memory only.'}
        </p>
      </section>
    </main>
  );
};
