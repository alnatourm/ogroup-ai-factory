import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { ProviderMetric, UsageSummary } from '../types/api.js';
import { Card, CardBody, CardHeader } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/common/Table.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';

export const UsageDashboardPage: React.FC = () => {
  const { language, t } = useI18n();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [providers, setProviders] = useState<ProviderMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ArabicAiIpaasClient.getUsageSummary();
      setSummary(data.summary);
      setProviders(data.providers);
    } catch {
      setSummary(null);
      setProviders([]);
      setError(language === 'ar' ? 'تعذر تحميل مؤشرات الاستخدام المتحققة.' : 'Verified usage metrics could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, []);

  const cards = summary
    ? [
        [language === 'ar' ? 'إجمالي الطلبات' : 'Total requests', summary.totalRequests.toLocaleString()],
        [language === 'ar' ? 'إجمالي الرموز' : 'Total tokens', summary.totalTokens.toLocaleString()],
        [language === 'ar' ? 'مسارات العمل النشطة' : 'Active workflows', summary.activeWorkflows.toLocaleString()],
        [language === 'ar' ? 'المستندات المعالجة' : 'Processed documents', summary.processedDocuments.toLocaleString()],
        [language === 'ar' ? 'معدل النجاح المقاس' : 'Measured success rate', summary.totalRequests > 0 ? summary.successRate + '%' : '—'],
        [language === 'ar' ? 'متوسط زمن الاستجابة' : 'Average latency', summary.totalRequests > 0 ? summary.avgLatencyMs + ' ms' : '—'],
      ]
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="primary" size="md">
            {language === 'ar' ? 'مؤشرات API المتحققة' : 'Verified API metrics'}
          </Badge>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar' ? 'لوحة الاستخدام والموثوقية' : 'Usage & Reliability Dashboard'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'تعرض هذه الصفحة فقط القياسات المسجلة لمساحة العمل الحالية. الصفر يعني عدم وجود قياسات مسجلة.'
              : 'This page shows only recorded measurements for the current workspace. Zero means no measurements are recorded.'}
          </p>
        </div>
        <Button variant="outline" size="sm" icon="refresh" onClick={fetchMetrics} isLoading={isLoading}>
          {t('action.refresh')}
        </Button>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-arabic">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center">
          <LoadingSpinner size="lg" label={t('state.loading')} />
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(([label, value]) => (
              <Card className="p-4" key={label}>
                <div className="text-xs text-slate-500 font-arabic mb-1">{label}</div>
                <div className="text-xl font-bold font-mono text-primary">{value}</div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              title={language === 'ar' ? 'قياسات الموفرين المسجلة' : 'Recorded provider metrics'}
              subtitle={language === 'ar' ? 'لا يتم عرض SLA أو ضمانات غير مقاسة.' : 'No unmeasured SLA or assurance claims are shown.'}
            />
            {providers.length === 0 ? (
              <CardBody>
                <div className="p-6 text-center text-sm text-slate-500 font-arabic">
                  {language === 'ar' ? 'لا توجد قياسات موفرين مسجلة بعد.' : 'No provider measurements have been recorded yet.'}
                </div>
              </CardBody>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>{language === 'ar' ? 'الموفر' : 'Provider'}</TableHeaderCell>
                    <TableHeaderCell>{language === 'ar' ? 'النموذج' : 'Model'}</TableHeaderCell>
                    <TableHeaderCell>{language === 'ar' ? 'الطلبات' : 'Requests'}</TableHeaderCell>
                    <TableHeaderCell>{language === 'ar' ? 'معدل النجاح' : 'Success rate'}</TableHeaderCell>
                    <TableHeaderCell>{language === 'ar' ? 'متوسط الاستجابة' : 'Average latency'}</TableHeaderCell>
                    <TableHeaderCell>P99</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.providerId}>
                      <TableCell>{provider.providerName}</TableCell>
                      <TableCell><span className="font-mono text-xs">{provider.model}</span></TableCell>
                      <TableCell>{provider.requestCount.toLocaleString()}</TableCell>
                      <TableCell>{provider.requestCount > 0 ? provider.successRate + '%' : '—'}</TableCell>
                      <TableCell>{provider.requestCount > 0 ? provider.avgLatencyMs + ' ms' : '—'}</TableCell>
                      <TableCell>{provider.requestCount > 0 ? provider.p99LatencyMs + ' ms' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
};
