export const translations: Record<'ar' | 'en', Record<string, string>> = {
  ar: {
    // Brand & App Bar
    'brand.name': 'وصل للذكاء الاصطناعي',
    'brand.tagline': 'طبقة التكامل والأتمتة العربية للذكاء الاصطناعي',
    'brand.sovereignBadge': 'بيئة مرحلية — القدرات تعتمد على الإعداد الفعلي',
    'brand.complianceBadge': 'ضوابط سياسة قابلة للتحقق — دون ادعاء اعتماد',

    // Navigation
    'nav.workspaceOnboarding': 'إعداد مساحة العمل',
    'nav.providerConnections': 'موفرو الذكاء الاصطناعي',
    'nav.gatewayPlayground': 'مختبر البوابة الذكية',
    'nav.workflowBuilder': 'منشئ مسارات العمل',
    'nav.workflowRuns': 'سجل التشغيل الفوري',
    'nav.documentIntelligence': 'ذكاء المستندات',
    'nav.usageDashboard': 'لوحة الاستخدام والموثوقية',
    'nav.dataPolicy': 'سياسة وحوكمة البيانات',

    // Common Actions
    'action.save': 'حفظ التغييرات',
    'action.cancel': 'إلغاء',
    'action.delete': 'حذف',
    'action.edit': 'تعديل',
    'action.add': 'إضافة جديد',
    'action.testConnection': 'اختبار الاتصال الفوري',
    'action.run': 'تشغيل الاستدعاء',
    'action.compile': 'توليد وهيكلة مسار العمل',
    'action.refresh': 'تحديث البيانات',
    'action.export': 'تصدير JSON',
    'action.retry': 'إعادة المحاولة',
    'action.close': 'إغلاق',
    'action.viewDetails': 'عرض التفاصيل والرمز',
    'action.confirm': 'تأكيد الإجراء',
    'action.upload': 'رفع مستند جديد',
    'action.copy': 'نسخ',
    'action.copied': 'تم النسخ!',

    // Common Statuses
    'status.active': 'نشط ومفعل',
    'status.disabled': 'معطل مؤقتاً',
    'status.error': 'خطأ في الاتصال',
    'status.running': 'قيد التنفيذ',
    'status.success': 'مكتمل بنجاح',
    'status.failed': 'فشل في التنفيذ',
    'status.pending': 'قيد الانتظار',
    'status.configured': 'مكتمل الإعداد',
    'status.pendingAuth': 'بانتظار المصادقة',

    // Security & Secrets
    'security.noticeTitle': 'سياسة أمان المفاتيح والاعتمادات المشددة',
    'security.noticeDescription':
      'تلتزم المنصة بعدم إظهار أو كشف المفاتيح السرية بعد حفظها. يتم تشفير كافة الاعتمادات بواسطة وحدات التشفير المادية (HSM/KMS) ولا تظهر إطلاقاً في الواجهات أو السجلات.',
    'security.secretStored': 'مفتاح الاعتماد مشفر في الخزينة العربية (Ciphertext Only)',
    'security.enterKey': 'أدخل المفتاح السري للاعتماد',
    'security.keyPlaceholder': '••••••••••••••••••••••••••••••••',

    // Placeholder indicator
    'badge.placeholder': 'واجهة نموذجية متصلة بعميل API نمطي (Non-Production Placeholder)',
    'badge.live': 'متصل مباشرة بالبوابة الحية (Live API)',

    // Data Policy
    'policy.privateTitle': 'المستوى 1: سياسة البيانات الخاصة المعزولة كلياً (Strict Private)',
    'policy.privateDesc': 'حظر كامل لتخزين أي بيانات خارج حدود المعالجة الفورية. لا يتم استخدام أي استفسارات لتحسين النماذج (no-retention request (provider verification required)).',
    'policy.telemetryTitle': 'المستوى 2: بيانات القياس عن بُعد المجهولة (Anonymous Telemetry)',
    'policy.telemetryDesc': 'مشاركة مؤشرات تشغيلية مجهولة الهوية مثل زمن الاستجابة وعدد الرموز لمراقبة الموثوقية دون تضمين أي نصوص أو معلومات شخصية.',
    'policy.optInTitle': 'المستوى 3: المشاركة المصرح بها لتحسين النماذج العربية (Improvement Opt-In)',
    'policy.optInDesc': 'موافقة صريحة وموقعة قانونياً للمساهمة في بناء كتل الذكاء الاصطناعي العربية ومعالجة اللهجات، مع تسجيل كافة التراخيص في سجل التدقيق.',

    // Empty & Loading States
    'state.loading': 'جارٍ تحميل البيانات العربية...',
    'state.empty': 'لا توجد بيانات حالياً',
    'state.error': 'حدث خطأ أثناء تحميل البيانات',
  },
  en: {
    // Brand & App Bar
    'brand.name': 'Wasl AI iPaaS',
    'brand.tagline': 'Arabic AI Integration & Automation Platform',
    'brand.sovereignBadge': 'Staging — capabilities depend on verified configuration',
    'brand.complianceBadge': 'Verifiable policy controls — no certification claim',

    // Navigation
    'nav.workspaceOnboarding': 'Workspace Onboarding',
    'nav.providerConnections': 'AI Provider Connections',
    'nav.gatewayPlayground': 'Gateway Playground',
    'nav.workflowBuilder': 'Workflow Builder',
    'nav.workflowRuns': 'Workflow Run History',
    'nav.documentIntelligence': 'Document Intelligence',
    'nav.usageDashboard': 'Usage & Reliability',
    'nav.dataPolicy': 'Data Policy & Privacy',

    // Common Actions
    'action.save': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.add': 'Add New Provider',
    'action.testConnection': 'Test Live Connection',
    'action.run': 'Run Inference Request',
    'action.compile': 'Compile Workflow',
    'action.refresh': 'Refresh Data',
    'action.export': 'Export JSON',
    'action.retry': 'Retry',
    'action.close': 'Close',
    'action.viewDetails': 'View Details & JSON',
    'action.confirm': 'Confirm Action',
    'action.upload': 'Upload Document',
    'action.copy': 'Copy',
    'action.copied': 'Copied!',

    // Common Statuses
    'status.active': 'Active',
    'status.disabled': 'Disabled',
    'status.error': 'Connection Error',
    'status.running': 'Running',
    'status.success': 'Completed Successfully',
    'status.failed': 'Failed',
    'status.pending': 'Pending',
    'status.configured': 'Configured',
    'status.pendingAuth': 'Pending Auth',

    // Security & Secrets
    'security.noticeTitle': 'Strict Credential & Secret Security Policy',
    'security.noticeDescription':
      'The platform never echoes back stored API keys after submission. All secrets are encrypted via Hardware Security Modules (HSM/KMS) and never appear in client UI or logs.',
    'security.secretStored': 'Encrypted in Arabic AI Vault (Ciphertext Only)',
    'security.enterKey': 'Enter provider secret API key',
    'security.keyPlaceholder': '••••••••••••••••••••••••••••••••',

    // Placeholder indicator
    'badge.placeholder': 'Non-Production Typed Placeholder',
    'badge.live': 'Live Backend Connected',

    // Data Policy
    'policy.privateTitle': 'Tier 1: Strict Arabic AI Private (Zero Data Retention)',
    'policy.privateDesc': 'Complete prohibition on storing customer content beyond real-time inference. Zero data retention for model learning.',
    'policy.telemetryTitle': 'Tier 2: Anonymous Operational Telemetry',
    'policy.telemetryDesc': 'Aggregated operational metrics such as latency and token counts are shared for reliability monitoring without PII.',
    'policy.optInTitle': 'Tier 3: Arabic AI Improvement Opt-In',
    'policy.optInDesc': 'Explicit, legally signed consent to contribute filtered Arabic dialect & OCR correction signals to the proprietary Arabic AI corpus.',

    // Empty & Loading States
    'state.loading': 'Loading sovereign data...',
    'state.empty': 'No data available',
    'state.error': 'An error occurred while loading data',
  },
};
