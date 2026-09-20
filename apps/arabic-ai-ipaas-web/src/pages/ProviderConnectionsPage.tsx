import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { SafeProviderConnection, ProviderType } from '../types/api.js';
import { Card, CardHeader, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { Dialog } from '../components/common/Dialog.js';
import { Input } from '../components/common/Input.js';
import { Select } from '../components/common/Select.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { ErrorMessage } from '../components/common/ErrorMessage.js';

export const ProviderConnectionsPage: React.FC = () => {
  const { language, t } = useI18n();

  const [providers, setProviders] = useState<SafeProviderConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Add Provider Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProviderType, setNewProviderType] = useState<ProviderType>('openai-compatible');
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newModelDefault, setNewModelDefault] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  // Delete Provider Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ArabicAiIpaasClient.listProviderConnections();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل بيانات موفري الذكاء الاصطناعي');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newApiKey.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await ArabicAiIpaasClient.createProviderConnection({
        providerType: newProviderType,
        name: newName.trim(),
        baseUrl: newBaseUrl.trim() || undefined,
        modelDefault: newModelDefault.trim() || undefined,
        apiKey: newApiKey.trim(),
      });

      setProviders((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setAddModalOpen(false);

      // Reset form and strictly wipe secret from state
      setNewName('');
      setNewBaseUrl('');
      setNewModelDefault('');
      setNewApiKey('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة الموفر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await ArabicAiIpaasClient.deleteProviderConnection(deleteId);
      setProviders((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل حذف الموفر');
    } finally {
      setIsDeleting(false);
    }
  };


  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.modelDefault && p.modelDefault.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || p.providerType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {language === 'ar' ? 'بوابة BYOAI' : 'BYOAI Gateway'}
            </Badge>
            <Badge variant="info" size="md">
              {language === 'ar' ? 'الأسرار محجوبة عن الواجهة' : 'Secrets redacted from UI'}
            </Badge>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'إدارة وتكامل موفري الذكاء الاصطناعي (AI Provider Connections)'
              : 'AI Provider Connections'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'إدارة اتصالات نماذج LLM مع إبقاء الاعتمادات محجوبة عن استجابات API والواجهة.'
              : 'Manage LLM connections while keeping stored credentials redacted from API responses and the UI.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon="refresh"
            onClick={fetchProviders}
            isLoading={isLoading}
          >
            {t('action.refresh')}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon="add"
            onClick={() => setAddModalOpen(true)}
          >
            {t('action.add')}
          </Button>
        </div>
      </div>

      {/* Strict Security Reminder */}
      <div className="p-4 bg-slate-900 text-white rounded-xl flex items-start gap-3 shadow-sm">
        <span className="material-symbols-outlined text-emerald-400 text-[22px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div className="space-y-1">
          <h4 className="text-xs font-bold font-arabic text-emerald-300">
            {t('security.noticeTitle')}
          </h4>
          <p className="text-xs text-slate-300 font-arabic leading-relaxed">
            {t('security.noticeDescription')}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              placeholder={language === 'ar' ? 'ابحث عن موفر أو نموذج...' : 'Search provider or model...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon="search"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-on-surface-variant font-arabic whitespace-nowrap">
              {language === 'ar' ? 'تصفية بالنوع:' : 'Filter by:'}
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs h-9 px-3 bg-surface border border-outline-variant rounded-lg font-arabic text-on-surface focus:outline-none"
            >
              <option value="all">{language === 'ar' ? 'كافة الأنواع' : 'All Providers'}</option>
              <option value="openai-compatible">OpenAI-Compatible</option>
              <option value="gemini">Google Vertex AI / Gemini</option>
              <option value="anthropic-compatible">Anthropic Claude</option>
              <option value="custom-http">Custom HTTP</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center">
          <LoadingSpinner size="lg" label={t('state.loading')} />
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchProviders} />
      ) : filteredProviders.length === 0 ? (
        <EmptyState
          icon="hub"
          title={language === 'ar' ? 'لا يوجد موفرو ذكاء اصطناعي مطابقون' : 'No matching providers found'}
          description={
            language === 'ar'
              ? 'قم بإضافة أول بوابة ذكاء اصطناعي لمساحة العمل الخاصة بك للبدء في توجيه الاستدعاءات.'
              : 'Add your first AI provider connection to begin routing prompts.'
          }
          actionText={t('action.add')}
          onAction={() => setAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProviders.map((provider) => (
            <Card key={provider.id} className="hover:border-slate-400 transition-colors">
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      {provider.providerType === 'gemini'
                        ? 'psychology'
                        : provider.providerType === 'anthropic-compatible'
                        ? 'memory'
                        : 'smart_toy'}
                    </span>
                    <span>{provider.name}</span>
                  </div>
                }
                action={
                  <Badge
                    variant={provider.status === 'active' ? 'success' : provider.status === 'disabled' ? 'neutral' : 'error'}
                    size="sm"
                  >
                    {provider.status === 'active'
                      ? t('status.active')
                      : provider.status === 'disabled'
                      ? t('status.disabled')
                      : t('status.error')}
                  </Badge>
                }
              />
              <CardBody className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-arabic">{language === 'ar' ? 'البروتوكول' : 'Protocol'}</span>
                    <span className="font-semibold text-primary font-mono">{provider.providerType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-arabic">{language === 'ar' ? 'النموذج الافتراضي' : 'Default Model'}</span>
                    <span className="font-semibold text-primary font-mono">{provider.modelDefault || 'غير محدد'}</span>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-slate-400 block font-arabic">{language === 'ar' ? 'نقطة النهاية (Endpoint)' : 'Base URL'}</span>
                  <span className="font-mono text-slate-700 break-all">{provider.baseUrl || 'الافتراضي للخدمة'}</span>
                </div>

                {/* STRICT REQUIREMENT: Secret is NEVER shown, only cipher badge */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-arabic">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">lock</span>
                    <span>{t('security.secretStored')}</span>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {provider.hasSecret ? (language === 'ar' ? 'اعتماد محفوظ' : 'Credential Stored') : (language === 'ar' ? 'بدون اعتماد' : 'No Credential')}
                  </Badge>
                </div>

              </CardBody>

              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  icon="delete"
                  onClick={() => setDeleteId(provider.id)}
                >
                  {t('action.delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Provider Modal Dialog */}
      <Dialog
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={language === 'ar' ? 'إضافة موفر ذكاء اصطناعي جديد' : 'Connect New AI Provider'}
        description={
          language === 'ar'
            ? 'أدخل بيانات الموفر واعتماد الوصول. يرسل المفتاح إلى الخادم عبر HTTPS ولا تعيده الواجهة بعد الحفظ.'
            : 'Enter provider credentials. The secret is sent over HTTPS and is never returned to the UI after storage.'
        }
      >
        <form onSubmit={handleAddProvider} className="space-y-4">
          <Select
            label={language === 'ar' ? 'نوع البروتوكول / المزود' : 'Provider Protocol'}
            value={newProviderType}
            onChange={(e) => {
              const val = e.target.value as ProviderType;
              setNewProviderType(val);
              if (val === 'openai-compatible') {
                setNewBaseUrl('https://api.openai.com/v1');
                setNewModelDefault('gpt-4o');
              } else if (val === 'gemini') {
                setNewBaseUrl('https://me-central2-aiplatform.googleapis.com/v1');
                setNewModelDefault('gemini-1.5-pro');
              } else if (val === 'anthropic-compatible') {
                setNewBaseUrl('https://api.anthropic.com/v1');
                setNewModelDefault('claude-3-5-sonnet');
              }
            }}
            options={[
              { value: 'openai-compatible', label: 'OpenAI-Compatible (Azure, OpenAI, Groq)' },
              { value: 'gemini', label: 'Google Cloud Vertex AI / Gemini' },
              { value: 'anthropic-compatible', label: 'Anthropic Claude' },
              { value: 'custom-http', label: 'Custom HTTP / Local Model' },
            ]}
          />

          <Input
            label={language === 'ar' ? 'اسم نقطة الاتصال' : 'Connection Name'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثال: Azure OpenAI Production"
            required
          />

          <Input
            label={language === 'ar' ? 'النموذج الافتراضي (Default Model)' : 'Default Model'}
            value={newModelDefault}
            onChange={(e) => setNewModelDefault(e.target.value)}
            placeholder="gpt-4o / gemini-1.5-pro"
            dir="ltr"
          />

          <Input
            label={language === 'ar' ? 'عنوان واجهة المزود (Base URL)' : 'Base URL'}
            value={newBaseUrl}
            onChange={(e) => setNewBaseUrl(e.target.value)}
            placeholder="https://..."
            dir="ltr"
          />

          <Input
            label={language === 'ar' ? 'مفتاح الاعتماد السري (API Key / Secret)' : 'Secret API Key'}
            type="password"
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            placeholder="أدخل مفتاح API؛ لن يظهر مجدداً بعد الحفظ"
            helperText={language === 'ar' ? 'تنبيه: لن يتم إظهار هذا المفتاح مجدداً في الواجهات.' : 'Notice: Stored secrets are never displayed again.'}
            dir="ltr"
            required
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setAddModalOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={language === 'ar' ? 'تأكيد حذف موفر الذكاء الاصطناعي' : 'Confirm Provider Deletion'}
        description={
          language === 'ar'
            ? 'هل أنت متأكد من رغبتك في حذف هذا الموفر؟ سيؤدي ذلك إلى توقف المسارات التي تعتمد عليه.'
            : 'Are you sure you want to remove this provider? Workflows relying on it will fail.'
        }
        confirmText={t('action.delete')}
        confirmVariant="danger"
        onConfirm={handleDeleteProvider}
        isConfirmLoading={isDeleting}
      >
        <p className="text-xs text-on-surface-variant font-arabic">
          {language === 'ar'
            ? 'سيتم حذف اتصال الموفر ومواد الاعتماد المرتبطة به من مساحة العمل.'
            : 'Stored encryption blobs for this provider will be permanently purged.'}
        </p>
      </Dialog>
    </div>
  );
};
