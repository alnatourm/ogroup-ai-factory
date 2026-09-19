import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.js';
import { APPROVED_ROUTES, type AppRoute } from '../../types/routes.js';
import { getApiConfig, updateApiConfig } from '../../api/config.js';
import { Dialog } from './Dialog.js';
import { Input } from './Input.js';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentRoute, onNavigate, children }) => {
  const { language, toggleLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Runtime settings state
  const config = getApiConfig();
  const [runtimeWorkspaceId, setRuntimeWorkspaceId] = useState(config.workspaceId);
  const [runtimeApiKey, setRuntimeApiKey] = useState(config.apiKey || '');
  const [runtimeBaseUrl, setRuntimeBaseUrl] = useState(config.baseUrl);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSaveSettings = () => {
    updateApiConfig({
      workspaceId: runtimeWorkspaceId.trim(),
      apiKey: runtimeApiKey.trim() || undefined,
      baseUrl: runtimeBaseUrl.trim() || '/api',
    });
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setSettingsOpen(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans selection:bg-secondary selection:text-white">
      {/* ================= TOP APP BAR ================= */}
      <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-40 shadow-xs">
        <div className="flex items-center justify-between w-full px-4 lg:px-8 max-w-[1600px] mx-auto h-16">
          {/* Brand & Sovereign Cluster */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('workspace-onboarding')}
              className="flex items-center gap-2.5 text-start cursor-pointer group"
              type="button"
            >
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-primary-container transition-colors">
                و
              </div>
              <div>
                <span className="font-bold text-base text-primary tracking-tight block font-arabic leading-tight">
                  {t('brand.name')}
                </span>
                <span className="text-[10px] text-on-surface-variant block font-arabic leading-none">
                  Wasl Arabic AI iPaaS
                </span>
              </div>
            </button>

            <div className="hidden xl:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('brand.sovereignBadge')}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 h-full" aria-label="التنقل الرئيسي">
            {APPROVED_ROUTES.map((route) => {
              const isActive = currentRoute === route.id;
              return (
                <button
                  key={route.id}
                  onClick={() => onNavigate(route.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer font-arabic ${
                    isActive
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {route.icon}
                  </span>
                  <span>{language === 'ar' ? route.titleAr : route.titleEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Trailing Action Cluster */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-surface-container-low transition-colors rounded-lg border border-outline-variant cursor-pointer"
              title="تبديل اللغة / Toggle Language"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">language</span>
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Runtime API & Workspace Config */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors rounded-lg border border-outline-variant cursor-pointer"
              title="إعدادات الاتصال والتوثيق / Runtime Config"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span className="hidden sm:inline font-arabic">
                {language === 'ar' ? 'بيئة الاتصال' : 'Runtime'}
              </span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
              aria-label="القائمة"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-outline-variant bg-surface-container-lowest p-3 space-y-1 shadow-md">
            {APPROVED_ROUTES.map((route) => {
              const isActive = currentRoute === route.id;
              return (
                <button
                  key={route.id}
                  onClick={() => {
                    onNavigate(route.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-xs rounded-lg transition-colors flex items-center gap-2.5 text-start font-arabic cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white font-bold'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{route.icon}</span>
                  <div>
                    <span className="font-semibold block">
                      {language === 'ar' ? route.titleAr : route.titleEn}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {language === 'ar' ? route.descriptionAr : route.descriptionEn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ================= MAIN CONTENT CANVAS ================= */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb & Top Authority Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant border-b border-slate-200 pb-3">
          <nav aria-label="مسار التنقل" className="flex items-center gap-2 font-arabic">
            <span className="flex items-center gap-1 text-slate-500">
              <span className="material-symbols-outlined text-[16px]">domain</span>
              <span>{runtimeWorkspaceId}</span>
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">
              {APPROVED_ROUTES.find((r) => r.id === currentRoute)
                ? language === 'ar'
                  ? APPROVED_ROUTES.find((r) => r.id === currentRoute)!.titleAr
                  : APPROVED_ROUTES.find((r) => r.id === currentRoute)!.titleEn
                : currentRoute}
            </span>
          </nav>

          <div className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-secondary border border-blue-200 px-3 py-1 rounded-full font-arabic font-medium">
            <span className="material-symbols-outlined text-secondary text-[16px]">shield</span>
            <span>{t('brand.complianceBadge')}</span>
          </div>
        </div>

        {/* Page Content */}
        {children}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant py-6 px-4 lg:px-8 mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant font-arabic">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">منصة وصل للذكاء الاصطناعي العربي</span>
            <span>•</span>
            <span>OGroup AI Factory v0.1</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>حالة الحماية: تعتمد على إعدادات الخادم المتحقق منها</span>
            <span>•</span>
            <span>سياسة البيانات: خاصة افتراضياً وتخضع لإعدادات المزود</span>
          </div>
        </div>
      </footer>

      {/* Runtime Configuration Modal Dialog */}
      <Dialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="إعدادات بيئة الاتصال والتوثيق (Runtime Configuration)"
        description="تكوين عنوان واجهة التحكم ومفتاح الوصول دون تضمين أي سر في الكود المصدري."
        confirmText="تطبيق الإعدادات"
        cancelText="إلغاء"
        onConfirm={handleSaveSettings}
      >
        <div className="space-y-4">
          <Input
            label="معرف مساحة العمل (Workspace ID)"
            value={runtimeWorkspaceId}
            onChange={(e) => setRuntimeWorkspaceId(e.target.value)}
            helperText="يعرض معرّف مساحة العمل المرتبط بالمفتاح بعد التحقق من الخادم."
          />
          <Input
            label="عنوان نقطة النهاية (API Base URL)"
            value={runtimeBaseUrl}
            onChange={(e) => setRuntimeBaseUrl(e.target.value)}
            helperText="عنوان خادم Arabic AI iPaaS Control API (الافتراضي: /api أو المتغير البيئي VITE_API_BASE_URL)."
          />
          <Input
            label="مفتاح وصول Bearer API Key (اختياري / يُحفظ في جلسة العمل الحالية فقط)"
            type="password"
            value={runtimeApiKey}
            onChange={(e) => setRuntimeApiKey(e.target.value)}
            placeholder="أدخل مفتاح Bearer صالحاً؛ سيُرفض الاتصال بدونه"
            helperText="لا يُخزن المفتاح نهائياً في الكود أو ملفات الاختبار، بل يُمرر ديناميكياً في ترويسة Authorization."
          />

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>تم تحديث إعدادات بيئة التشغيل بنجاح!</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
            <span className="font-bold block text-slate-800">حدود الأمان الحالية:</span>
            <p>1. المفاتيح المدخلة لا تُسجل إطلاقاً في وحدة التخزين الدائم للمتصفح.</p>
            <p>2. يتم تمرير الاعتمادات عبر HTTPS فقط بموجب ضوابط الأمان الصارمة.</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
