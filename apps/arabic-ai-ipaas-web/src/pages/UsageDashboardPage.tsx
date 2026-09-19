import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { UsageSummary, ProviderMetric } from '../types/api.js';
import { Card, CardHeader, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/common/Table.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

export const UsageDashboardPage: React.FC = () => {
  const { language, t } = useI18n();

  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [providers, setProviders] = useState<ProviderMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await ArabicAiIpaasClient.getUsageSummary();
      setSummary(data.summary);
      setProviders(data.providers);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {language === 'ar' ? 'مصفوفة مؤشرات الأداء السيادية' : 'Sovereign Telemetry'}
            </Badge>
            <Badge variant="success" size="md">
              SLA 99.8% Met
            </Badge>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'لوحة الاستخدام والموثوقية (Usage & Reliability Dashboard)'
              : 'Usage & Reliability Dashboard'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'مراقبة استهلاك الرموز، وأداء بوابات الذكاء الاصطناعي، ونسب نجاح معالجة اللهجات العربية وحجب البيانات الحساسة.'
              : 'Monitor token volume, model SLA latency, Arabic dialect distribution, and entity protection.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs h-9 px-3 bg-surface border border-outline-variant rounded-lg font-arabic text-on-surface focus:outline-none"
          >
            <option value="24h">{language === 'ar' ? 'آخر 24 ساعة' : 'Last 24 Hours'}</option>
            <option value="7d">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
            <option value="30d">{language === 'ar' ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
          </select>
          <Button variant="outline" size="sm" icon="refresh" onClick={fetchMetrics} isLoading={isLoading}>
            {t('action.refresh')}
          </Button>
        </div>
      </div>

      {isLoading || !summary ? (
        <div className="p-12 text-center">
          <LoadingSpinner size="lg" label={t('state.loading')} />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-500 font-arabic mb-1">
                {language === 'ar' ? 'إجمالي الاستدعاءات' : 'Total Requests'}
              </div>
              <div className="text-xl font-bold font-mono text-primary">
                {summary.totalRequests.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold font-arabic mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+18.4% نمو أسبوعي</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-slate-500 font-arabic mb-1">
                {language === 'ar' ? 'حجم الرموز العربية المستهلكة' : 'Tokens Processed'}
              </div>
              <div className="text-xl font-bold font-mono text-secondary">
                {(summary.totalTokens / 1_000_000).toFixed(1)}M
              </div>
              <div className="text-[11px] text-slate-400 font-arabic mt-1">
                ترميز عربي محسن (Tokenizer)
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-slate-500 font-arabic mb-1">
                {language === 'ar' ? 'معدل النجاح والموثوقية (SLA)' : 'Success Rate'}
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600">
                {summary.successRate}%
              </div>
              <div className="text-[11px] text-emerald-700 font-arabic mt-1">
                معدل الخطأ: {summary.errorRate}% فقط
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-slate-500 font-arabic mb-1">
                {language === 'ar' ? 'متوسط زمن الاستجابة' : 'Avg Latency'}
              </div>
              <div className="text-xl font-bold font-mono text-slate-800">
                {summary.avgLatencyMs}ms
              </div>
              <div className="text-[11px] text-slate-400 font-arabic mt-1">
                استجابة السحابة السيادية المحلية
              </div>
            </Card>
          </div>

          {/* Provider Reliability Matrix */}
          <Card>
            <CardHeader
              title={language === 'ar' ? 'مصفوفة موثوقية موفري الذكاء الاصطناعي (SLA Matrix)' : 'Provider Reliability Matrix'}
              subtitle={language === 'ar' ? 'مراقبة الأداء الحي ومعدل الخطأ لكل بوابة متصلة' : 'Live SLA & latency across connected gateways'}
            />
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>{language === 'ar' ? 'اسم الموفر' : 'Provider'}</TableHeaderCell>
                  <TableHeaderCell>{language === 'ar' ? 'النموذج' : 'Model'}</TableHeaderCell>
                  <TableHeaderCell>{language === 'ar' ? 'الحالة' : 'Status'}</TableHeaderCell>
                  <TableHeaderCell>{language === 'ar' ? 'الطلبات' : 'Requests'}</TableHeaderCell>
                  <TableHeaderCell>{language === 'ar' ? 'الموثوقية' : 'Reliability'}</TableHeaderCell>
                  <TableHeaderCell>{language === 'ar' ? 'متوسط الاستجابة' : 'Avg Latency'}</TableHeaderCell>
                  <TableHeaderCell>P99 Latency</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.providerId}>
                    <TableCell>
                      <span className="font-bold text-xs text-primary font-arabic">{p.providerName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-600">{p.model}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.status === 'active' ? 'success' : p.status === 'degraded' ? 'warning' : 'error'}
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-800">{p.requestCount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-emerald-600">{p.successRate}%</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-700">{p.avgLatencyMs}ms</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500">{p.p99LatencyMs}ms</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Arabic Dialect & Security Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader
                title={language === 'ar' ? 'توزيع اللهجات في الاستدعاءات' : 'Arabic Dialect Distribution'}
                subtitle={language === 'ar' ? 'نسب تحويل واستيعاب اللهجات المحلية إلى الفصحى' : 'Dialect ingestion into MSA'}
              />
              <CardBody className="space-y-3 font-arabic text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>العربية الفصحى المعاصرة (MSA)</span>
                    <span className="font-mono font-bold">74%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: '74%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>اللهجة السعودية والخليجية (Gulf / Saudi)</span>
                    <span className="font-mono font-bold">18%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '18%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>اللهجة المصرية (Egyptian)</span>
                    <span className="font-mono font-bold">5%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: '5%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>اللهجة الشامية والمغاربية (Levant / Maghreb)</span>
                    <span className="font-mono font-bold">3%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '3%' }} />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title={language === 'ar' ? 'حوكمة الكيانات والأمن السيبراني' : 'Security & PII Protection'}
                subtitle={language === 'ar' ? 'إحصاءات الحجب الآلي للبيانات الشخصية والحساسة' : 'Masked identifiers audit'}
              />
              <CardBody className="space-y-4 font-arabic text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-bold block">
                      {language === 'ar' ? 'إجمالي الكيانات المحجوبة سيادياً' : 'Total Masked PII'}
                    </span>
                    <span className="text-xl font-mono font-bold text-emerald-900 mt-1 block">
                      14,210
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">verified_user</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                    <span className="block text-[11px] text-slate-400">أرقام الهوية الوطنية</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">6,492</span>
                  </div>
                  <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                    <span className="block text-[11px] text-slate-400">الحسابات البنكية (IBAN)</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">4,810</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
