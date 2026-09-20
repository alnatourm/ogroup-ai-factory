import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { WorkflowRun, WorkflowRunStatus } from '../types/api.js';
import { Card, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/common/Table.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Input } from '../components/common/Input.js';

export const WorkflowRunsPage: React.FC = () => {
  const { language, t } = useI18n();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRuns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRuns(await ArabicAiIpaasClient.listWorkflowRuns());
    } catch {
      setRuns([]);
      setError(language === 'ar' ? 'تعذر تحميل سجل التشغيل المتحقق.' : 'Verified workflow runs could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRuns();
  }, []);

  const filteredRuns = runs.filter((run) => {
    const query = searchQuery.toLowerCase();
    return (run.id.toLowerCase().includes(query) || run.workflowName.toLowerCase().includes(query))
      && (statusFilter === 'all' || run.status === statusFilter);
  });

  const metrics = useMemo(() => {
    const finished = runs.filter((run) => run.status === 'success' || run.status === 'failed');
    const successes = finished.filter((run) => run.status === 'success').length;
    const avg = finished.length ? Math.round(finished.reduce((sum, run) => sum + run.durationMs, 0) / finished.length) : null;
    return {
      total: runs.length,
      successRate: finished.length ? Math.round((successes / finished.length) * 10000) / 100 : null,
      averageDuration: avg,
      failed: finished.length - successes,
    };
  }, [runs]);

  const statusBadge = (status: WorkflowRunStatus) => {
    const variant = status === 'success' ? 'success' : status === 'failed' ? 'error' : status === 'running' ? 'info' : 'pending';
    return <Badge variant={variant} size="sm">{t('status.' + status)}</Badge>;
  };

  const cards = [
    [language === 'ar' ? 'إجمالي التشغيلات' : 'Total runs', String(metrics.total)],
    [language === 'ar' ? 'معدل النجاح المقاس' : 'Measured success rate', metrics.successRate === null ? '—' : metrics.successRate + '%'],
    [language === 'ar' ? 'متوسط المدة' : 'Average duration', metrics.averageDuration === null ? '—' : metrics.averageDuration + ' ms'],
    [language === 'ar' ? 'التشغيلات الفاشلة' : 'Failed runs', String(metrics.failed)],
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="primary" size="md">{language === 'ar' ? 'سجل API المتحقق' : 'Verified API history'}</Badge>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar' ? 'سجل تشغيل مسارات العمل' : 'Workflow Run History'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic">
            {language === 'ar' ? 'تعرض المؤشرات أدناه فقط التشغيلات التي أعادها الخادم لمساحة العمل الحالية.' : 'Metrics below are calculated only from runs returned by the server for this workspace.'}
          </p>
        </div>
        <Button variant="outline" size="sm" icon="refresh" onClick={fetchRuns} isLoading={isLoading}>{t('action.refresh')}</Button>
      </div>

      {error && <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm font-arabic">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <Card className="p-4" key={label}>
            <div className="text-xs text-slate-500 font-arabic mb-1">{label}</div>
            <div className="text-xl font-bold font-mono text-primary">{value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-80">
            <Input placeholder={language === 'ar' ? 'البحث برقم التشغيل أو المسار...' : 'Search run or workflow ID...'} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} icon="search" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="text-xs h-9 px-3 bg-surface border border-outline-variant rounded-lg">
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
            <option value="success">{language === 'ar' ? 'ناجح' : 'Success'}</option>
            <option value="failed">{language === 'ar' ? 'فاشل' : 'Failed'}</option>
            <option value="running">{language === 'ar' ? 'قيد التنفيذ' : 'Running'}</option>
            <option value="pending">{language === 'ar' ? 'بالانتظار' : 'Pending'}</option>
          </select>
        </CardBody>
      </Card>

      {isLoading ? (
        <div className="p-12 text-center"><LoadingSpinner size="lg" label={t('state.loading')} /></div>
      ) : filteredRuns.length === 0 ? (
        <Card><CardBody><div className="p-8 text-center text-sm text-slate-500 font-arabic">{language === 'ar' ? 'لا توجد تشغيلات مسجلة مطابقة.' : 'No matching workflow runs are recorded.'}</div></CardBody></Card>
      ) : (
        <Table>
          <TableHead><tr>
            <TableHeaderCell>{language === 'ar' ? 'رقم التشغيل' : 'Run ID'}</TableHeaderCell>
            <TableHeaderCell>{language === 'ar' ? 'رقم المسار' : 'Workflow ID'}</TableHeaderCell>
            <TableHeaderCell>{language === 'ar' ? 'المشغّل' : 'Trigger'}</TableHeaderCell>
            <TableHeaderCell>{language === 'ar' ? 'الحالة' : 'Status'}</TableHeaderCell>
            <TableHeaderCell>{language === 'ar' ? 'وقت البدء' : 'Started'}</TableHeaderCell>
            <TableHeaderCell>{language === 'ar' ? 'المدة' : 'Duration'}</TableHeaderCell>
          </tr></TableHead>
          <TableBody>
            {filteredRuns.map((run) => (
              <TableRow key={run.id}>
                <TableCell><span className="font-mono text-xs">{run.id}</span></TableCell>
                <TableCell><span className="font-mono text-xs">{run.workflowId}</span></TableCell>
                <TableCell>{run.triggerType}</TableCell>
                <TableCell>{statusBadge(run.status)}</TableCell>
                <TableCell><span className="font-mono text-xs">{new Date(run.startedAt).toLocaleString()}</span></TableCell>
                <TableCell><span className="font-mono text-xs">{run.durationMs} ms</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
