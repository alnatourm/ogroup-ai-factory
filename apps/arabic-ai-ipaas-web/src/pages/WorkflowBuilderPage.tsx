import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext.js';
import { ArabicAiIpaasClient } from '../api/client.js';
import type { WorkflowDefinition, WorkflowStep, WorkflowStepType } from '../types/api.js';
import { Card, CardHeader, CardBody } from '../components/common/Card.js';
import { Button } from '../components/common/Button.js';
import { Badge } from '../components/common/Badge.js';
import { Dialog } from '../components/common/Dialog.js';
import { Input } from '../components/common/Input.js';
import { Select } from '../components/common/Select.js';

export const WorkflowBuilderPage: React.FC = () => {
  const { language, t } = useI18n();

  const [promptInput, setPromptInput] = useState('');

  const [isCompiling, setIsCompiling] = useState(false);

  const [workflow, setWorkflow] = useState<WorkflowDefinition>({
    id: 'local-draft',
    workspaceId: '',
    nameAr: 'مسار جديد',
    nameEn: 'New workflow',
    promptInstructionAr: '',
    status: 'draft',
    steps: [],
    rawJsonV1: { version: 'workflow-json-v1', steps: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Add Step Modal
  const [addStepModalOpen, setAddStepModalOpen] = useState(false);
  const [newStepType, setNewStepType] = useState<WorkflowStepType>('notification');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');

  // JSON Drawer Modal
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  const handleCompileFlow = async () => {
    if (!promptInput.trim()) return;
    setIsCompiling(true);
    try {
      const compiled = await ArabicAiIpaasClient.compileWorkflowPrompt(promptInput.trim());
      setWorkflow(compiled);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تجميع المسار');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;

    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      titleAr: newStepTitle.trim(),
      titleEn: newStepTitle.trim(),
      stepType: newStepType,
      descriptionAr: newStepDesc.trim() || 'إجراء مخصص ضمن مسار العمل الذكي',
      descriptionEn: newStepDesc.trim() || 'Custom step in local workflow draft',
      config: { custom: true },
      status: 'configured',
    };

    setWorkflow((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: new Date().toISOString(),
    }));

    setAddStepModalOpen(false);
    setNewStepTitle('');
    setNewStepDesc('');
  };

  const handleDeleteStep = (stepId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleToggleStatus = () => {
    setWorkflow((prev) => ({
      ...prev,
      status: prev.status === 'active' ? 'draft' : 'active',
      updatedAt: new Date().toISOString(),
    }));
  };

  const stepTypeIcons: Record<WorkflowStepType, { icon: string; color: string }> = {
    trigger: { icon: 'bolt', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    pii_masking: { icon: 'shield', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    condition: { icon: 'alt_route', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    llm_transform: { icon: 'smart_toy', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    manager_approval: { icon: 'how_to_reg', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    notification: { icon: 'notifications', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    archive: { icon: 'archive', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              Wasl Natural Flow Compiler
            </Badge>
            <Badge variant={workflow.status === 'active' ? 'success' : 'neutral'} size="md">
              {workflow.status === 'active' ? 'مسار نشط ومفعل' : 'مسودة (Draft)'}
            </Badge>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-primary font-arabic">
            {language === 'ar'
              ? 'موجّه بناء مسارات العمل باللغة العربية (Arabic Workflow Builder)'
              : 'Arabic Workflow Builder'}
          </h1>
          <p className="text-xs text-on-surface-variant font-arabic max-w-3xl">
            {language === 'ar'
              ? 'صف منطق مسار العمل باللغة العربية الفصحى أو بلهجة الأعمال المؤسسية؛ وسيقوم محرك «وصل» بتحليله وبناء عقد الأتمتة (workflow-json-v1) فوراً.'
              : 'Describe your workflow logic in natural Arabic; Wasl AI compiles it into a validated structured schema.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon="code"
            onClick={() => setJsonModalOpen(true)}
          >
            {t('action.export')}
          </Button>
          <Button
            variant={workflow.status === 'active' ? 'outline' : 'secondary'}
            size="sm"
            icon={workflow.status === 'active' ? 'pause' : 'play_arrow'}
            onClick={handleToggleStatus}
          >
            {workflow.status === 'active'
              ? language === 'ar' ? 'تعطيل المسار' : 'Deactivate'
              : language === 'ar' ? 'تفعيل المسار للإنتاج' : 'Activate Workflow'}
          </Button>
        </div>
      </div>

      {/* Compiler Instruction Input Box */}
      <Card>
        <CardHeader
          title={language === 'ar' ? 'صياغة المسار بالأمر العربي الطبيعي' : 'Natural Arabic Workflow Instruction'}
          subtitle={language === 'ar' ? 'اكتب شروطك وخطواتك وسيقوم المترجم بهيكلتها' : 'Input rules, triggers, and actions in plain Arabic'}
        />
        <CardBody className="space-y-3">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            rows={3}
            className="w-full p-4 bg-surface border border-outline-variant rounded-xl text-sm font-arabic text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15 leading-relaxed resize-none"
            placeholder="صف مسار العمل المطلوب باللغة العربية..."
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-arabic">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>
                {language === 'ar'
                  ? 'يدعم تحويل القيود المالية، والتحقق الأمني، وحجب PII، وإشعارات الموافقة.'
                  : 'Supports financial thresholds, PII masking, and multi-step approvals.'}
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              icon="auto_awesome"
              isLoading={isCompiling}
              onClick={handleCompileFlow}
            >
              {t('action.compile')}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Interactive Step Graph Canvas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-primary font-arabic">
              {language === 'ar' ? 'مخطط خطوات مسار العمل المؤتمت' : 'Compiled Workflow Steps Graph'}
            </h2>
            <Badge variant="neutral" size="sm">
              {workflow.steps.length} {language === 'ar' ? 'خطوات' : 'steps'}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon="add"
            onClick={() => setAddStepModalOpen(true)}
          >
            {language === 'ar' ? 'إضافة خطوة مخصصة' : 'Add Custom Step'}
          </Button>
        </div>

        {/* Step Sequence Timeline */}
        <div className="space-y-3">
          {workflow.steps.map((step, index) => {
            const typeInfo = stepTypeIcons[step.stepType] || stepTypeIcons.trigger;
            return (
              <div
                key={step.id}
                className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs hover:border-slate-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${typeInfo.color}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{typeInfo.icon}</span>
                    </div>
                    {index < workflow.steps.length - 1 && (
                      <div className="w-0.5 h-6 bg-slate-200 mt-2 hidden md:block" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-sm font-bold text-primary font-arabic">
                        {language === 'ar' ? step.titleAr : step.titleEn}
                      </h3>
                      <Badge variant="neutral" size="sm">
                        {step.stepType}
                      </Badge>
                    </div>
                    <p className="text-xs text-on-surface-variant font-arabic leading-relaxed">
                      {language === 'ar' ? step.descriptionAr : step.descriptionEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteStep(step.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title={t('action.delete')}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Step Dialog */}
      <Dialog
        isOpen={addStepModalOpen}
        onClose={() => setAddStepModalOpen(false)}
        title={language === 'ar' ? 'إضافة خطوة جديدة للمسار' : 'Add New Step to Workflow'}
        description={
          language === 'ar'
            ? 'حدد نوع الخطوة وأدخل تفاصيل الإجراء المراد تنفيذه.'
            : 'Select the step type and define custom action details.'
        }
      >
        <form onSubmit={handleAddStep} className="space-y-4">
          <Select
            label={language === 'ar' ? 'نوع الخطوة (Step Type)' : 'Step Type'}
            value={newStepType}
            onChange={(e) => setNewStepType(e.target.value as WorkflowStepType)}
            options={[
              { value: 'trigger', label: 'مشغّل مسار (Trigger / Inbound)' },
              { value: 'pii_masking', label: 'حجب وفحص أمني (PII Masking)' },
              { value: 'condition', label: 'شرط وتفرع منطقي (Condition)' },
              { value: 'llm_transform', label: 'استدعاء ذكاء اصطناعي (LLM Inference)' },
              { value: 'manager_approval', label: 'طلب موافقة مسؤول (Manager Approval)' },
              { value: 'notification', label: 'إشعار وتنبيه (Notification)' },
              { value: 'archive', label: 'أرشفة وتخزين سيادي (Archive)' },
            ]}
          />

          <Input
            label={language === 'ar' ? 'عنوان الخطوة' : 'Step Title'}
            value={newStepTitle}
            onChange={(e) => setNewStepTitle(e.target.value)}
            placeholder="مثال: إرسال تنبيه عاجل لمدير الامتثال"
            required
          />

          <Input
            label={language === 'ar' ? 'وصف الإجراء' : 'Description'}
            value={newStepDesc}
            onChange={(e) => setNewStepDesc(e.target.value)}
            placeholder="شرح موجز لمنطق تنفيذ هذه الخطوة..."
          />

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setAddStepModalOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button variant="primary" size="md" type="submit">
              {language === 'ar' ? 'إضافة الخطوة للمخطط' : 'Add Step'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* JSON Inspection Modal */}
      <Dialog
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        title="عقد الأتمتة الموحد (workflow-json-v1)"
        description="النسق المعياري لمسار العمل المتوافق مع محرك التنفيذ وقاعدة بيانات PostgreSQL."
        maxWidth="lg"
      >
        <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed" dir="ltr">
          {JSON.stringify(
            {
              version: 'workflow-json-v1',
              workflowId: workflow.id,
              name: workflow.nameAr,
              status: workflow.status,
              steps: workflow.steps.map((s, idx) => ({
                stepIndex: idx + 1,
                id: s.id,
                type: s.stepType,
                title: s.titleAr,
                config: s.config,
              })),
            },
            null,
            2
          )}
        </pre>
      </Dialog>
    </div>
  );
};
