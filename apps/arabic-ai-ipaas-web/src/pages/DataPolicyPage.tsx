import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { DataPolicyConfig, DataPolicyTier } from '../types/api.js';
import { Card, CardHeader, CardBody, CardFooter } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

export const DataPolicyPage: React.FC = () => {
  const { language, t } = useI18n();

  const [policy, setPolicy] = useState<DataPolicyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [dataZone, setDataZone] = useState<DataPolicyTier>('PRIVATE');
  const [piiMasking, setPiiMasking] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);
  const [auditLogging, setAuditLogging] = useState(true);
  const [strictZdrLevel, setStrictZdrLevel] = useState(4);
  const [dualAdmin, setDualAdmin] = useState(true);

  const fetchPolicy = async () => {
    setIsLoading(true);
    try {
      const data = await ArabicAiIpaasClient.getDataPolicy();
      setPolicy(data);
      setDataZone(data.dataZone);
      setPiiMasking(data.piiMaskingEnabled);
      setRetentionDays(data.retentionDays);
      setAuditLogging(data.auditLoggingEnabled);
      setStrictZdrLevel(data.strictZdrLevel);
      setDualAdmin(data.dualAdminApprovalRequired);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await ArabicAiIpaasClient.updateDataPolicy({
        dataZone,
        piiMaskingEnabled: piiMasking,
        retentionDays,
        auditLoggingEnabled: auditLogging,
        strictZdrLevel,
        dualAdminApprovalRequired: dualAdmin,
      });
      setPolicy(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تحديث سياسة البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {language === 'ar' ? 'حوكمة البيانات والسيادة' : 'Data Governance & Sovereignty'}
            </Badge>
            <Badge variant="success" size="md">
              NDMO-L4 Compliant
            </Badge>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'سياسة وحوكمة البيانات والخصوصية السيادية (Data Policy & Privacy)'
              : 'Data Policy & Sovereign Privacy'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'إدارة مستويات تصنيف وحماية البيانات السيادية (PRIVATE, ANONYMOUS, OPT-IN) وحوكمة النماذج مع ضمانات عدم التدريب والاحتفاظ الصفري (Zero Data Retention).'
              : 'Configure sovereign data tiers, privacy safeguards, and verify strict zero data retention compliance.'}
          </p>
        </div>

        {policy && (
          <div className="text-xs font-arabic text-slate-500">
            <span>{language === 'ar' ? 'آخر تحديث للسياسة:' : 'Last updated:'} </span>
            <span className="font-mono text-slate-700">
              {new Date(policy.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-[24px]">check_circle</span>
          <p className="text-sm font-semibold font-arabic">
            {language === 'ar'
              ? 'تم حفظ واعتماد سياسة حوكمة البيانات بنجاح، وسجل التدقيق السيادي محدث.'
              : 'Data governance policy updated and cryptographically audited!'}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center">
          <LoadingSpinner size="lg" label={t('state.loading')} />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Sovereign Data Tiers */}
          <Card>
            <CardHeader
              title={language === 'ar' ? 'مستوى تصنيف البيانات السيادية (Sovereign Tier)' : 'Sovereign Data Tier'}
              subtitle={language === 'ar' ? 'حدد نطاق مشاركة البيانات وفق المتطلبات النظامية لمنشأتك' : 'Select data sharing tier for your organization'}
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TIER 1: PRIVATE */}
                <div
                  onClick={() => setDataZone('PRIVATE')}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    dataZone === 'PRIVATE'
                      ? 'border-secondary bg-blue-50/60 shadow-sm'
                      : 'border-outline-variant bg-surface hover:border-slate-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ZDR Tier 1
                      </span>
                      <input
                        type="radio"
                        name="dataZone"
                        checked={dataZone === 'PRIVATE'}
                        onChange={() => setDataZone('PRIVATE')}
                        className="text-secondary focus:ring-secondary"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-primary font-arabic mb-1">
                      {t('policy.privateTitle')}
                    </h4>
                    <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                      {t('policy.privateDesc')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-emerald-700 font-semibold flex items-center gap-1 font-arabic">
                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                    <span>{language === 'ar' ? 'ضمان عدم التدريب (No Training)' : 'Guaranteed No Training'}</span>
                  </div>
                </div>

                {/* TIER 2: ANONYMOUS_TELEMETRY */}
                <div
                  onClick={() => setDataZone('ANONYMOUS_TELEMETRY')}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    dataZone === 'ANONYMOUS_TELEMETRY'
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
                        name="dataZone"
                        checked={dataZone === 'ANONYMOUS_TELEMETRY'}
                        onChange={() => setDataZone('ANONYMOUS_TELEMETRY')}
                        className="text-secondary focus:ring-secondary"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-primary font-arabic mb-1">
                      {t('policy.telemetryTitle')}
                    </h4>
                    <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                      {t('policy.telemetryDesc')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-arabic">
                    {language === 'ar' ? 'مؤشرات الأداء التشغيلية' : 'Operational Metrics Only'}
                  </div>
                </div>

                {/* TIER 3: IMPROVEMENT_OPT_IN */}
                <div
                  onClick={() => setDataZone('IMPROVEMENT_OPT_IN')}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    dataZone === 'IMPROVEMENT_OPT_IN'
                      ? 'border-secondary bg-blue-50/60 shadow-sm'
                      : 'border-outline-variant bg-surface hover:border-slate-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        Flywheel Consent
                      </span>
                      <input
                        type="radio"
                        name="dataZone"
                        checked={dataZone === 'IMPROVEMENT_OPT_IN'}
                        onChange={() => setDataZone('IMPROVEMENT_OPT_IN')}
                        className="text-secondary focus:ring-secondary"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-primary font-arabic mb-1">
                      {t('policy.optInTitle')}
                    </h4>
                    <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                      {t('policy.optInDesc')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-purple-700 font-semibold font-arabic">
                    {language === 'ar' ? 'يتطلب موافقة الإدارة القانونية' : 'Requires Legal Approval'}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 2: Privacy Controls & Protection Gates */}
          <Card>
            <CardHeader
              title={language === 'ar' ? 'ضوابط الخصوصية والاحتفاظ' : 'Privacy & Retention Safeguards'}
              subtitle={language === 'ar' ? 'إعدادات حجب الهويات ومدة الاحتفاظ وسجلات التدقيق' : 'PII masking, retention windows, and audit enforcement'}
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-outline-variant cursor-pointer hover:border-slate-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={piiMasking}
                    onChange={(e) => setPiiMasking(e.target.checked)}
                    className="mt-1 rounded text-secondary focus:ring-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-primary font-arabic block">
                      {language === 'ar' ? 'التفعيل الإلزامي لحجب الكيانات الحساسة (PII Masking)' : 'Mandatory PII Masking'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-arabic block leading-relaxed">
                      {language === 'ar'
                        ? 'حجب الهويات الوطنية، الحسابات المصرفية، وأرقام الهواتف تلقائياً قبل إرسال الاستعلام للمزود.'
                        : 'Automatically masks national IDs, IBANs, and phones before forwarding to provider.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-outline-variant cursor-pointer hover:border-slate-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={auditLogging}
                    onChange={(e) => setAuditLogging(e.target.checked)}
                    className="mt-1 rounded text-secondary focus:ring-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-primary font-arabic block">
                      {language === 'ar' ? 'سجل التدقيق غير القابل للتعديل (Immutable Audit Log)' : 'Immutable Audit Log'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-arabic block leading-relaxed">
                      {language === 'ar'
                        ? 'تسجيل كافة عمليات الاستدعاء والوصول وتغيير السياسات في سجل WORM مشفر.'
                        : 'Logs every API request, access event, and policy change in a tamper-evident audit ledger.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-outline-variant cursor-pointer hover:border-slate-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={dualAdmin}
                    onChange={(e) => setDualAdmin(e.target.checked)}
                    className="mt-1 rounded text-secondary focus:ring-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-primary font-arabic block">
                      {language === 'ar' ? 'الموافقة الثنائية لأي تغيير (Dual-Admin Approval)' : 'Dual-Admin Approval Required'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-arabic block leading-relaxed">
                      {language === 'ar'
                        ? 'يتطلب خفض مستوى الحماية موافقة كل من مسؤول الأمن ومسؤول البيانات (CISO & CDO).'
                        : 'Downgrading data protection tier requires independent approval from CISO & CDO.'}
                    </span>
                  </div>
                </label>

                <div className="p-4 rounded-xl bg-surface border border-outline-variant space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary font-arabic">
                      {language === 'ar' ? 'فترة الاحتفاظ بالبيانات التشغيلية:' : 'Operational Retention Period:'}
                    </span>
                    <span className="text-xs font-bold font-mono text-secondary">
                      {retentionDays} {language === 'ar' ? 'يوم' : 'days'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="365"
                    step="7"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-arabic">
                    <span>7 أيام</span>
                    <span>90 يوماً (الافتراضي)</span>
                    <span>365 يوماً</span>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-arabic">
                {language === 'ar'
                  ? 'مستوى تصنيف ZDR الحالي: المستوى ' + strictZdrLevel
                  : 'Current Strict ZDR Level: ' + strictZdrLevel}
              </span>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                icon="shield"
              >
                {t('action.save')}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
};
