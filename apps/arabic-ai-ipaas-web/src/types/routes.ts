export type AppRoute =
  | 'workspace-onboarding'
  | 'provider-connections'
  | 'gateway-playground'
  | 'workflow-builder'
  | 'workflow-runs'
  | 'document-intelligence'
  | 'usage-dashboard'
  | 'data-policy';

export interface RouteMetadata {
  id: AppRoute;
  path: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
}

export const APPROVED_ROUTES: RouteMetadata[] = [
  {
    id: 'workspace-onboarding',
    path: '/workspace-onboarding',
    titleAr: 'إعداد مساحة عمل المؤسسة',
    titleEn: 'Workspace Onboarding',
    descriptionAr: 'تهيئة بيئة العمل السيادية وربط أول موفر ذكاء اصطناعي واختيار سياسة البيانات',
    descriptionEn: 'Configure sovereign workspace, connect first AI provider, and select data policy',
    icon: 'domain_add',
  },
  {
    id: 'provider-connections',
    path: '/provider-connections',
    titleAr: 'موفرو الذكاء الاصطناعي',
    titleEn: 'AI Provider Connections',
    descriptionAr: 'إدارة وتكامل بوابات وموفري الذكاء الاصطناعي (BYOAI) مع التشفير السيادي',
    descriptionEn: 'Manage and integrate AI model providers with sovereign encryption',
    icon: 'hub',
  },
  {
    id: 'gateway-playground',
    path: '/gateway-playground',
    titleAr: 'مختبر البوابة الذكية',
    titleEn: 'Gateway Playground',
    descriptionAr: 'تجربة استدعاءات النماذج باللغة العربية واختبار المعالجة وحجب البيانات الحساسة',
    descriptionEn: 'Test Arabic model inference, entity masking, and response inspection',
    icon: 'terminal',
  },
  {
    id: 'workflow-builder',
    path: '/workflow-builder',
    titleAr: 'منشئ مسارات العمل',
    titleEn: 'Workflow Builder',
    descriptionAr: 'بناء وهيكلة مسارات الأتمتة الذكية عبر الأوامر الطبيعية باللغة العربية',
    descriptionEn: 'Build intelligent automation workflows using Arabic natural instructions',
    icon: 'account_tree',
  },
  {
    id: 'workflow-runs',
    path: '/workflow-runs',
    titleAr: 'سجل تشغيل المسارات',
    titleEn: 'Workflow Run History',
    descriptionAr: 'تتبع وتدقيق عمليات التشغيل الفورية للمسارات مع تفاصيل كل خطوة ومخرجاتها',
    descriptionEn: 'Track and audit real-time workflow runs with step-level telemetry and logs',
    icon: 'history',
  },
  {
    id: 'document-intelligence',
    path: '/document-intelligence',
    titleAr: 'ذكاء المستندات العربية',
    titleEn: 'Document Intelligence',
    descriptionAr: 'استخراج ومعالجة الوثائق الرسمية والعقود العربية بتقنية OCR مع الحفاظ على اتجاه القراءة',
    descriptionEn: 'Process Arabic documents and contracts via OCR with RTL reading order preservation',
    icon: 'document_scanner',
  },
  {
    id: 'usage-dashboard',
    path: '/usage-dashboard',
    titleAr: 'لوحة الاستخدام والموثوقية',
    titleEn: 'Usage & Reliability Dashboard',
    descriptionAr: 'مصفوفة مؤشرات الأداء، استهلاك الرموز، زمن الاستجابة، وموثوقية المزودين (SLA)',
    descriptionEn: 'Performance matrix, token consumption, latency, and provider reliability',
    icon: 'monitoring',
  },
  {
    id: 'data-policy',
    path: '/data-policy',
    titleAr: 'سياسة وحوكمة البيانات',
    titleEn: 'Data Policy & Privacy',
    descriptionAr: 'إدارة تصنيف البيانات السيادية (PRIVATE, ANONYMOUS, OPT-IN) وحوكمة النماذج',
    descriptionEn: 'Manage sovereign data tiers (PRIVATE, ANONYMOUS, OPT-IN) and governance',
    icon: 'policy',
  },
];
