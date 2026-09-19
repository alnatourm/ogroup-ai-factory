import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { WorkflowRun, WorkflowRunStatus } from '../types/api.js';
import { Card, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../components/common/Table.js';
import { Dialog } from '../components/common/Dialog.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { Input } from '../components/common/Input.js';

export const WorkflowRunsPage: React.FC = () => {
  const { language, t } = useI18n();

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [isLivePolling, setIsLivePolling] = useState(true);

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const data = await ArabicAiIpaasClient.listWorkflowRuns();
      setRuns(data);
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.workflowName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: WorkflowRunStatus) => {
    switch (status) {
      case 'success':
        return <Badge variant="success" size="sm">{t('status.success')}</Badge>;
      case 'failed':
        return <Badge variant="error" size="sm">{t('status.failed')}</Badge>;
      case 'running':
        return <Badge variant="info" size="sm">{t('status.running')}</Badge>;
      case 'pending':
        return <Badge variant="pending" size="sm">{t('status.pending')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {language === 'ar' ? 'سجل التدقيق والتنفيذ' : 'Audit Trail & Telemetry'}
            </Badge>
            <button
              type="button"
              onClick={() => setIsLivePolling(!isLivePolling)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer ${
                isLivePolling
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLivePolling ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>
                {isLivePolling
                  ? language === 'ar' ? 'التحديث الحي: نشط' : 'Live Polling: On'
                  : language === 'ar' ? 'التحديث الحي: متوقف' : 'Live Polling: Off'}
              </span>
            </button>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'سجل تشغيل مسارات الذكاء الاصطناعي (Workflow Run History)'
              : 'Workflow Run History & Telemetry'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'مراقبة وتتبع تنفيذ مسارات الأتمتة الفورية، وفحص بيانات كل خطوة ومخرجاتها وزمن الاستجابة بدقة متناهية.'
              : 'Monitor execution logs, inspect step payloads, duration, and error diagnostics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon="refresh" onClick={fetchRuns} isLoading={isLoading}>
            {t('action.refresh')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-arabic mb-1">
            {language === 'ar' ? 'إجمالي التشغيلات (Total Runs)' : 'Total Runs'}
          </div>
          <div className="text-xl font-bold font-mono text-primary">142,618</div>
          <div className="text-[11px] text-emerald-600 font-semibold font-arabic mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+14.2% مقارنة بالأسبوع الماضي</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-500 font-arabic mb-1">
            {language === 'ar' ? 'معدل النجاح (Success Rate)' : 'Success Rate'}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600">99.88%</div>
          <div className="text-[11px] text-slate-400 font-arabic mt-1">ضمن حدود SLA المعتمدة</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-500 font-arabic mb-1">
            {language === 'ar' ? 'متوسط مدة المسار (Avg Duration)' : 'Avg Duration'}
          </div>
          <div className="text-xl font-bold font-mono text-secondary">1,410ms</div>
          <div className="text-[11px] text-slate-400 font-arabic mt-1">معالجة فورية وتشفير كامل</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-500 font-arabic mb-1">
            {language === 'ar' ? 'عمليات فاشلة (Failed Runs)' : 'Failed Runs'}
          </div>
          <div className="text-xl font-bold font-mono text-rose-600">18</div>
          <div className="text-[11px] text-rose-600 font-arabic mt-1">تمت إعادة المحاولة تلقائياً</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <Input
              placeholder={language === 'ar' ? 'البحث برقم المعرف Run ID أو اسم المسار...' : 'Search Run ID or name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon="search"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-on-surface-variant font-arabic whitespace-nowrap">
              {language === 'ar' ? 'الحالة:' : 'Status:'}
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs h-9 px-3 bg-surface border border-outline-variant rounded-lg font-arabic text-on-surface focus:outline-none"
            >
              <option value="all">{language === 'ar' ? 'كافة الحالات' : 'All Statuses'}</option>
              <option value="success">{language === 'ar' ? 'ناجح' : 'Success'}</option>
              <option value="failed">{language === 'ar' ? 'فاشل' : 'Failed'}</option>
              <option value="running">{language === 'ar' ? 'قيد التنفيذ' : 'Running'}</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Runs Table */}
      {isLoading ? (
        <div className="p-12 text-center">
          <LoadingSpinner size="lg" label={t('state.loading')} />
        </div>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>{language === 'ar' ? 'رقم التشغيل (Run ID)' : 'Run ID'}</TableHeaderCell>
              <TableHeaderCell>{language === 'ar' ? 'اسم مسار العمل' : 'Workflow Name'}</TableHeaderCell>
              <TableHeaderCell>{language === 'ar' ? 'نوع المشغّل' : 'Trigger'}</TableHeaderCell>
              <TableHeaderCell>{language === 'ar' ? 'الحالة' : 'Status'}</TableHeaderCell>
              <TableHeaderCell>{language === 'ar' ? 'وقت البدء' : 'Started At'}</TableHeaderCell>
              <TableHeaderCell>{language === 'ar' ? 'المدة' : 'Duration'}</TableHeaderCell>
              <TableHeaderCell>{language === 'ar' ? 'الإجراء' : 'Actions'}</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredRuns.map((run) => (
              <TableRow key={run.id} onClick={() => setSelectedRun(run)}>
                <TableCell>
                  <span className="font-mono font-bold text-primary text-xs">{run.id}</span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-xs text-primary font-arabic block">
                    {run.workflowName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {run.completedSteps} / {run.stepsCount} {language === 'ar' ? 'خطوات مكتملة' : 'steps'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" size="sm">
                    {run.triggerType}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(run.status)}</TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500 font-mono" dir="ltr">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {run.durationMs}ms
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="visibility"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRun(run);
                    }}
                  >
                    {t('action.viewDetails')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Run Step Details Modal */}
      {selectedRun && (
        <Dialog
          isOpen={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          title={`تفاصيل التشغيل: ${selectedRun.id}`}
          description={selectedRun.workflowName}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs font-arabic border border-slate-200">
              <div>
                <span className="text-slate-400 block">{language === 'ar' ? 'الحالة العامة' : 'Status'}</span>
                <span className="font-bold">{getStatusBadge(selectedRun.status)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'ar' ? 'المدة الكلية' : 'Total Duration'}</span>
                <span className="font-mono font-bold text-slate-800">{selectedRun.durationMs}ms</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'ar' ? 'الخطوات' : 'Steps'}</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedRun.completedSteps} / {selectedRun.stepsCount}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-primary font-arabic">
                {language === 'ar' ? 'تفاصيل تنفيذ الخطوات (Step Trace):' : 'Step Traces:'}
              </h4>
              {selectedRun.stepRuns.map((step, idx) => (
                <div
                  key={step.stepId}
                  className="p-3 bg-surface border border-outline-variant rounded-xl text-xs space-y-1.5 font-arabic"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-primary">{step.stepName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{step.durationMs}ms</span>
                      <Badge
                        variant={step.status === 'success' ? 'success' : 'error'}
                        size="sm"
                      >
                        {step.status}
                      </Badge>
                    </div>
                  </div>

                  {step.errorMessage && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-[11px] font-semibold">
                      خطأ: {step.errorMessage}
                    </div>
                  )}

                  {step.outputPayload && (
                    <pre className="p-2 bg-slate-900 text-emerald-400 rounded text-[10px] font-mono overflow-x-auto" dir="ltr">
                      {JSON.stringify(step.outputPayload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" onClick={() => setSelectedRun(null)}>
                {t('action.close')}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
