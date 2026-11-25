import mutnatecHqBanner from '../assets/images/mutnatec_hq_banner_1795350007494.jpg';
import type {
  AuthorizationStatus,
  BenefitCategoryFilter,
  BenefitGuideSection,
  CareType,
  ClaimStatus,
  CoveragePlan,
  CoverageRule,
  ProcedureType,
  ProviderItem,
} from '../types/mutual';

export function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relativePath.replace(/^\/+/, '')}`;
}

export const HERO_IMAGE_PATH = mutnatecHqBanner;
export const EMBLEM_IMAGE_PATH = assetUrl('/assets/aistudio/image_6f487a22.png');

export const CONTACT_REPRESENTATIVE = {
  name: 'الأستاذ هبري نعاس',
  role: 'عضو الجمعية العامة للتعاضدية الوطنية لعمال التربية والثقافة',
  imagePath: assetUrl('/assets/aistudio/image_4281a8ee.png'),
  facebookUrl: 'https://www.facebook.com/groups/1819912938299649/user/100022183221055',
} as const;

export function getSafeExternalUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const OFFICIAL_69_WILAYAS = [
  'أدرار',
  'الشلف',
  'الأغواط',
  'أم البواقي',
  'باتنة',
  'بجاية',
  'بسكرة',
  'بشار',
  'البليدة',
  'البويرة',
  'تمنراست',
  'تبسة',
  'تلمسان',
  'تيارت',
  'تيزي وزو',
  'الجزائر',
  'الجلفة',
  'جيجل',
  'سطيف',
  'سعيدة',
  'سكيكدة',
  'سيدي بلعباس',
  'عنابة',
  'قالمة',
  'قسنطينة',
  'المدية',
  'مستغانم',
  'المسيلة',
  'معسكر',
  'ورقلة',
  'وهران',
  'البيض',
  'إليزي',
  'برج بوعريريج',
  'بومرداس',
  'الطارف',
  'تندوف',
  'تيسمسيلت',
  'الوادي',
  'خنشلة',
  'سوق أهراس',
  'تيبازة',
  'ميلة',
  'عين الدفلى',
  'النعامة',
  'عين تموشنت',
  'غرداية',
  'غليزان',
  'تيميمون',
  'برج باجي مختار',
  'أولاد جلال',
  'بني عباس',
  'عين صالح',
  'عين قزام',
  'تقرت',
  'جانت',
  'المغير',
  'المنيعة',
  'أفلو',
  'بريكة',
  'القنطرة',
  'بئر العاتر',
  'العريشة',
  'قصر الشلالة',
  'عين وسارة',
  'مسعد',
  'قصر البخاري',
  'بوسعادة',
  'الأبيض سيدي الشيخ',
];

export const ALL_69_WILAYAS: string[] = OFFICIAL_69_WILAYAS;

export const ENROLLMENT_WILAYA_OPTIONS: Array<{ value: string; label: string }> = (() => {
  const opts: Array<{ value: string; label: string }> = [];
  OFFICIAL_69_WILAYAS.forEach((name, idx) => {
    const code = String(idx + 1).padStart(2, '0');
    opts.push({ value: name, label: `${code} - ${name}` });
    if (code === '16') {
      opts.push({ value: 'الجزائر وسط', label: '16أ - الجزائر وسط' });
      opts.push({ value: 'الجزائر غرب', label: '16ب - الجزائر غرب' });
      opts.push({ value: 'الجزائر شرق', label: '16ج - الجزائر شرق' });
    }
  });
  return opts;
})();

export const PAYMENT_CENTERS_GALLERY = [
  {
    id: 'centers-01-12',
    title: 'دليل مراكز الدفع — الولايات من 01 إلى 12',
    imagePath: assetUrl('/assets/aistudio/image_81b9c1ca.png'),
  },
  {
    id: 'centers-25-36',
    title: 'دليل مراكز الدفع — الولايات من 25 إلى 36',
    imagePath: assetUrl('/assets/aistudio/image_4178b124.png'),
  },
  {
    id: 'centers-37-48',
    title: 'دليل مراكز الدفع — الولايات من 37 إلى 48',
    imagePath: assetUrl('/assets/aistudio/image_f5901443.png'),
  },
] as const;

const ALGIERS_SECTOR_OFFICE_NAMES: Record<string, string> = {
  '70': 'الجزائر وسط',
  '71': 'الجزائر غرب',
  '72': 'الجزائر شرق',
};

export const WILAYA_DEFAULT_LABELS: Array<{ code: string; name: string }> = Array.from(
  { length: 96 },
  (_, index) => {
    const num = index + 1;
    const code = String(num).padStart(2, '0');
    const name =
      OFFICIAL_69_WILAYAS[index] ??
      ALGIERS_SECTOR_OFFICE_NAMES[code] ??
      `المقاطعة / الفرع الولائي ${code}`;
    return { code, name };
  }
);

export const CARE_TYPES: CareType[] = [
  'العطل المرضية',
  'منتجات صيدلانية وأجهزة اصطناعية',
  'الجراحة العامة',
  'جراحة وتقويم وزراعة الأسنان',
  'التحاليل الطبية والخزعات',
  'الأشعة الطبية الكبرى',
  'طب العيون والبصريات',
  'الأشعة والتحاليل التشخيصية',
  'إعادة التأهيل الوظيفي',
  'المنح العائلية (الزواج / الولادة / الختان)',
  'منحة الإحالة على التقاعد',
  'منح الأرامل والأيتام والتمدرس',
  'مساعدة مصاريف الجنازة',
  'الإعانات الاجتماعية (الأمراض المستعصية / الإعاقة)',
];

export const PROCEDURE_TYPES: ProcedureType[] = [
  'استشفاء وجراحة',
  'فحص بالرنين المغناطيسي / السكانير',
  'تركيبات وتقويم الأسنان',
  'علاج الأمراض المزمنة',
  'ترويض طبي متخصص',
];

export const COVERAGE_PLANS: CoveragePlan[] = [
  'التغطية الأساسية الشاملة',
  'التغطية التكميلية+',
  'التغطية العائلية المميزة',
];

export const SECTORS_LIST: string[] = [
  'التربية الوطنية — التعليم الابتدائي',
  'التربية الوطنية — التعليم المتوسط',
  'التربية الوطنية — التعليم الثانوي',
  'مديريات التربية والإدارة المركزية',
  'قطاع الثقافة والفنون والمكتبات',
  'المتقاعدون وذوو الحقوق',
];

export const CITIES_LIST: string[] = Array.from(
  new Set([
    'الجزائر العاصمة',
    'الجزائر وسط',
    'الجزائر غرب',
    'الجزائر شرق',
    ...OFFICIAL_69_WILAYAS,
  ])
);

export const BASE_FILE_DOCUMENTS: string[] = [
  'كشف حساب التعويضات للضمان الاجتماعي (CNAS).',
  'الفاتورة الأصلية أو نسخة منها.',
  'كشف الراتب الشهري الأخير.',
  'نسخة من بطاقة الانخراط (أو شهادة التحيين اليومي للمتقاعد).',
  'صك بريدي مشطوب (Chèque barré).',
];

export const BENEFIT_CATEGORIES: BenefitCategoryFilter[] = [
  'الكل',
  'القواعد والملف القاعدي',
  'الرعاية الصحية والجراحة',
  'الأشعة والعيون والتأهيل',
  'المنح العائلية والتقاعد',
  'الحماية الاجتماعية والجنازة',
];

export const BENEFITS_2026_SECTIONS: BenefitGuideSection[] = [
  {
    id: 'guide-cover',
    title: 'دليل المزايا والأداءات — طبعة 2026 الشاملة',
    subtitle: 'التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC)',
    category: 'القواعد والملف القاعدي',
    imagePath: assetUrl('/assets/aistudio/image_9d3f918b.png'),
    iconKey: 'book',
    validityNote: 'طبعة محينة لعام 2026',
    extraDocsNote: 'من إعداد وتصميم هبري النعاس · الدليل المرجعي للأداءات والمنح',
    items: [
      {
        label: 'التغطية التكميلية',
        value: '20% إلى 50%',
        detail: 'تعويضات تكميلية للعطل المرضية والأدوية والجراحة والتحاليل',
      },
      {
        label: 'أداءات طبية ثابتة',
        value: '200 — 5,000 دج',
        detail: 'الأشعة الكبرى، طب العيون، التحاليل التشخيصية، وإعادة التأهيل',
      },
      {
        label: 'المنح والتضامن',
        value: '5,000 — 50,000 دج',
        detail: 'المنح العائلية، التقاعد، الأرامل والأيتام، الإعانات والجنازة',
      },
    ],
  },
  {
    id: 'basic-rules',
    title: 'القواعد الأساسية وتاريخ السريان',
    subtitle: 'تاريخ بداية التنفيذ والنطاق الجغرافي للأداءات',
    category: 'القواعد والملف القاعدي',
    imagePath: assetUrl('/assets/aistudio/image_6ab72b0a.png'),
    iconKey: 'calendar',
    validityNote: 'ساري المفعول ابتداءً من 01-01-2024',
    extraDocsNote: 'كل الأداءات والمشتريات الطبية خارج الوطن غير قابلة للتعويض نهائياً',
    items: [
      {
        label: 'تاريخ بداية التنفيذ',
        value: '1 جانفي 2024',
        detail: 'جميع الإجراءات والنسب المذكورة في الدليل سارية انطلاقاً من هذا التاريخ',
      },
      {
        label: 'النطاق الجغرافي',
        value: 'داخل الوطن فقط',
        detail: 'الأداءات والمشتريات الطبية خارج الوطن غير قابلة للتعويض نهائياً',
      },
    ],
  },
  {
    id: 'base-file',
    title: 'صيغة الملف القاعدي الموحد',
    subtitle: 'المعادلة المعتمدة: [الملف القاعدي] + [وثائق خاصة بالمرض/الحدث] = [ملف التعويض الكامل]',
    category: 'القواعد والملف القاعدي',
    imagePath: assetUrl('/assets/aistudio/image_8de38f00.png'),
    iconKey: 'folder',
    validityNote: 'يُطلب في جميع الطلبات (إلا إذا نُص على خلاف ذلك)',
    extraDocsNote: '5 وثائق أساسية لتفادي التكرار وتسريع دراسة الملف',
    items: [
      { label: '1. الضمان الاجتماعي', value: 'كشف حساب CNAS', detail: 'كشف حساب التعويضات للضمان الاجتماعي' },
      { label: '2. الفوترة', value: 'الفاتورة الأصلية', detail: 'الفاتورة الأصلية أو نسخة مصادق عليها' },
      { label: '3. الوضعية المهنية', value: 'كشف الراتب الأخير', detail: 'كشف الراتب الشهري الأخير' },
      { label: '4. العضوية', value: 'بطاقة الانخراط', detail: 'نسخة من بطاقة الانخراط أو شهادة التحيين اليومي للمتقاعد' },
      { label: '5. الحساب البريدي', value: 'صك بريدي مشطوب', detail: 'صك بريدي مشطوب لصب التعويض في الحساب' },
    ],
  },
  {
    id: 'daily-care',
    title: 'الرعاية الصحية اليومية والغيابات المرضية',
    subtitle: 'تعويض العطل المرضية والمنتجات الصيدلانية والأجهزة الاصطناعية',
    category: 'الرعاية الصحية والجراحة',
    imagePath: assetUrl('/assets/aistudio/image_60336719.png'),
    iconKey: 'pill',
    validityNote: 'أجل الصلاحية لجميع الأداءات الطبية: 3 سنوات',
    extraDocsNote: 'شريطة أن تكون نسبة كشف حساب تعويضات الضمان الاجتماعي 50% بالنسبة للعطل المرضية',
    associatedCareType: 'العطل المرضية',
    items: [
      {
        label: 'العطل المرضية',
        value: '50%',
        detail: 'من المبلغ الإجمالي (شريطة نسبة 50% في كشف حساب الضمان الاجتماعي)',
      },
      {
        label: 'منتجات صيدلانية وأجهزة اصطناعية',
        value: '20%',
        detail: 'من المبلغ الإجمالي للأدوية والأجهزة الاصطناعية',
      },
    ],
  },
  {
    id: 'surgery-labs',
    title: 'التدخلات الجراحية والتحاليل الدقيقة',
    subtitle: 'الجراحة العامة، جراحة وتقويم وزراعة الأسنان، والتحاليل الطبية والخزعات',
    category: 'الرعاية الصحية والجراحة',
    imagePath: assetUrl('/assets/aistudio/image_563c7791.png'),
    iconKey: 'scissors',
    validityNote: 'أجل الصلاحية: 3 سنوات · سقف سنوي محدد (مرة في السنة)',
    extraDocsNote: 'الأسنان: ورقة علاج الأسنان حاملة لترميز الأداء · التحاليل: نسخة من نتيجة التحاليل',
    associatedCareType: 'الجراحة العامة',
    items: [
      {
        label: 'الجراحة العامة',
        value: '25% (سقف 50,000 دج)',
        detail: 'السقف السنوي: 50,000 دج (مرة واحدة في السنة)',
      },
      {
        label: 'جراحة وتقويم وزراعة الأسنان',
        value: '30% (سقف 20,000 دج)',
        detail: 'مرة في السنة + ورقة علاج الأسنان حاملة لترميز الأداء',
      },
      {
        label: 'التحاليل الطبية والخزعات',
        value: '30% (سقف 10,000 دج)',
        detail: 'مرة في السنة + نسخة من نتيجة التحاليل',
      },
    ],
  },
  {
    id: 'major-radiology',
    title: 'الأشعة الطبية الكبرى (عالية القيمة)',
    subtitle: 'أداءات ثابتة للمنخرط وذوي الحقوق',
    category: 'الأشعة والعيون والتأهيل',
    imagePath: assetUrl('/assets/aistudio/image_a6afaf7d.png'),
    iconKey: 'scan',
    validityNote: 'أجل الصلاحية: 3 سنوات',
    extraDocsNote: 'إضافة للملف القاعدي: نسخة من نتيجة التحاليل / الأشعة',
    associatedCareType: 'الأشعة الطبية الكبرى',
    items: [
      { label: 'IRM (التصوير بالرنين المغناطيسي)', value: '5,000 دج', detail: 'مرة واحدة في السنة' },
      { label: 'Scanner (المسح الضوئي)', value: '2,500 دج', detail: 'مرة واحدة في السنة' },
      { label: 'Mammographie (تصوير الثدي)', value: '1,500 دج', detail: 'مرتين في السنة' },
    ],
  },
  {
    id: 'ophthalmology',
    title: 'مركز طب العيون والبصريات',
    subtitle: 'الإطارات، الزجاج البصري، العدسات، والعين الاصطناعية',
    category: 'الأشعة والعيون والتأهيل',
    imagePath: assetUrl('/assets/aistudio/image_4cd27737.png'),
    iconKey: 'eye',
    validityNote: 'أجل الصلاحية: 3 سنوات',
    extraDocsNote: 'الوثيقة الإضافية: وصفة طبية من طبيب العيون',
    associatedCareType: 'طب العيون والبصريات',
    items: [
      { label: 'الإطارات', value: '50% (سقف 2,000 دج)', detail: 'إطار واحد / سنة' },
      { label: 'الزجاج البصري', value: '50% (سقف 1,000 دج/زجاجة)', detail: 'حتى 4 زجاجات / سنة' },
      { label: 'العدسات', value: '3,000 دج', detail: 'للطاقم الزوجي — مرة واحدة / سنة' },
      { label: 'عين اصطناعية / زراعة العين', value: '4,000 دج', detail: 'للطاقم الزوجي — مرة واحدة / سنة' },
    ],
  },
  {
    id: 'diagnostic-matrix',
    title: 'مصفوفة الأشعة والتحاليل التشخيصية',
    subtitle: 'يتم التعويض مرتين (02) في السنة كحد أقصى لكل أداء',
    category: 'الأشعة والعيون والتأهيل',
    imagePath: assetUrl('/assets/aistudio/image_a3210a8b.png'),
    iconKey: 'activity',
    validityNote: 'مرتين (02) في السنة كحد أقصى لكل أداء',
    extraDocsNote: 'تشمل فحوصات القلب والأعصاب والعيون والهضم والتصوير الطبي',
    associatedCareType: 'الأشعة والتحاليل التشخيصية',
    items: [
      {
        label: 'الفئة الأولى — 1,000 دج',
        value: '1,000 دج',
        detail: 'Doppler · Angiographie · Scintigraphie · Fibroscopie · Colonoscopie · ENMG · EEG · Octopus · Champ visuel · R.X. divers · Hystérosalpingographie · Topographie',
      },
      {
        label: 'الفئة الثانية — 500 دج',
        value: '500 دج',
        detail: 'Audiogramme · Frottis · Échographie · Panoramique dentaire · الأشعة سبر المؤسسة',
      },
    ],
  },
  {
    id: 'rehabilitation',
    title: 'إعادة التأهيل الوظيفي',
    subtitle: 'تعويض جلسات الترويض وإعادة التأهيل الطبي',
    category: 'الأشعة والعيون والتأهيل',
    imagePath: assetUrl('/assets/aistudio/image_f0db9ca9.png'),
    iconKey: 'dumbbell',
    validityNote: 'مسقفة بـ 10 جلسات في السنة كحد أقصى (للمنخرط وذوي الحقوق)',
    extraDocsNote: 'إضافة للملف القاعدي: وصفة طبية من الطبيب المختص تحدد بدقة عدد الجلسات التأهيلية',
    associatedCareType: 'إعادة التأهيل الوظيفي',
    items: [
      { label: 'مبلغ التعويض للجلسة', value: '200 دج / جلسة', detail: 'الحد الأقصى 10 جلسات في السنة (2,000 دج/سنة)' },
      { label: 'المستفيدون', value: 'المنخرط وذوو الحقوق', detail: 'يشترط وصفة طبية تحدد بدقة عدد الجلسات' },
    ],
  },
  {
    id: 'family-grants',
    title: 'المنح العائلية ومحطات الحياة',
    subtitle: 'منح الزواج، الولادة، والختان للطفل تحت الكفالة',
    category: 'المنح العائلية والتقاعد',
    imagePath: assetUrl('/assets/aistudio/image_6ce90fed.png'),
    iconKey: 'heart',
    validityNote: 'أجل الصلاحية للمنح العائلية: سنتان (02)',
    extraDocsNote: 'تُرفق بالملف القاعدي حسب الحالة العائلية',
    associatedCareType: 'المنح العائلية (الزواج / الولادة / الختان)',
    items: [
      { label: 'منحة الزواج', value: '20,000 دج', detail: 'المطلوب: عقد الزواج + شهادة عائلية' },
      { label: 'منحة الولادة', value: '6,000 دج', detail: 'المطلوب: شهادة الميلاد + شهادة عائلية' },
      { label: 'منحة الختان (للطفل تحت الكفالة)', value: '5,000 دج', detail: 'شهادة ختان أصلية + شهادة عائلية + شهادة ذوي الحقوق من الضمان' },
    ],
  },
  {
    id: 'retirement-grant',
    title: 'التتويج: منحة الإحالة على التقاعد',
    subtitle: 'منحة تصرف مرة واحدة في العمر تقديراً لمساركم المهني',
    category: 'المنح العائلية والتقاعد',
    imagePath: assetUrl('/assets/aistudio/image_ab5c7a94.png'),
    iconKey: 'award',
    validityNote: 'تصرف مرة واحدة في العمر',
    extraDocsNote: 'تتطلب 3 وثائق إلزامية من المصالح الإدارية للمستخدم',
    associatedCareType: 'منحة الإحالة على التقاعد',
    items: [
      { label: 'قيمة المنحة', value: '50,000 دج', detail: 'منحة الإحالة على التقاعد مرة واحدة في العمر' },
      { label: 'الوثيقة 1', value: 'قرار الإحالة', detail: 'قرار الإحالة على التقاعد / شهادة توقيف الراتب' },
      { label: 'الوثيقة 2', value: 'مجمل الخدمات', detail: 'وثيقة مجمل الخدمات المهنية' },
      { label: 'الوثيقة 3', value: 'شهادة الاشتراكات', detail: 'ألا تقل عن 10 سنوات بدون انقطاع إلى تاريخ التقاعد' },
    ],
  },
  {
    id: 'widows-orphans',
    title: 'الحماية الممتدة: منح الأرامل والأيتام',
    subtitle: 'منح سنوية قابلة للتجديد لدعم أسر المتوفين',
    category: 'الحماية الاجتماعية والجنازة',
    imagePath: assetUrl('/assets/aistudio/image_a876bb60.png'),
    iconKey: 'umbrella',
    validityNote: 'منح سنوية قابلة للتجديد',
    extraDocsNote: 'شهادات الوفاة والحالة العائلية · شهادة عدم الانتساب (CASNOS) وعدم الزواج للبنات فوق 21 سنة والأرامل',
    associatedCareType: 'منح الأرامل والأيتام والتمدرس',
    items: [
      { label: 'يتيم الأبوين', value: '42,000 دج', detail: 'منحة سنوية قابلة للتجديد' },
      { label: 'الأرملة غير العاملة', value: '24,000 دج', detail: 'شهادة عدم الانتساب CASNOS + شهادة عدم الزواج' },
      { label: 'يتيم وليه لا يعمل', value: '14,400 دج', detail: 'منحة سنوية قابلة للتجديد' },
      { label: 'يتيم وليه يعمل', value: '7,200 دج', detail: 'منحة سنوية قابلة للتجديد' },
    ],
  },
  {
    id: 'funeral-assistance',
    title: 'مساعدة مصاريف الجنازة',
    subtitle: 'مرافقة مالية فورية لعائلة المنخرط في مصابها',
    category: 'الحماية الاجتماعية والجنازة',
    imagePath: assetUrl('/assets/aistudio/image_94e8def6.png'),
    iconKey: 'shield',
    validityNote: 'أجل الصلاحية: سنتان',
    extraDocsNote: 'الوثائق الأساسية: شهادة الوفاة، شهادة عائلية، وشهادة ذوي الحقوق لغير العضو',
    associatedCareType: 'مساعدة مصاريف الجنازة',
    items: [
      { label: 'وفاة العضو المنخرط', value: '50,000 دج', detail: 'تُصرف لذوي الحقوق' },
      { label: 'وفاة الزوجة أو الابن تحت الكفالة', value: '30,000 دج', detail: 'مصحوبة بشهادة الوفاة والشهادة العائلية' },
      { label: 'وفاة شخص تحت الكفالة', value: '10,000 دج', detail: 'شهادة ذوي الحقوق + شهادة الوفاة' },
      { label: 'وفاة أحد الوالدين', value: '5,000 دج', detail: 'شهادة الوفاة + الشهادة العائلية' },
    ],
  },
  {
    id: 'social-hardship',
    title: 'الإعانات الاجتماعية في أوقات الشدة',
    subtitle: 'إعانة الأمراض المستعصية والإعانة الخاصة بالإعاقة',
    category: 'الحماية الاجتماعية والجنازة',
    imagePath: assetUrl('/assets/aistudio/image_dcc55512.png'),
    iconKey: 'handHeart',
    validityNote: 'تُصرف مرة في السنة',
    extraDocsNote: 'إضافة شهادة طبية من مختص (للأمراض المستعصية) أو نسخة من بطاقة الإعاقة',
    associatedCareType: 'الإعانات الاجتماعية (الأمراض المستعصية / الإعاقة)',
    items: [
      {
        label: 'إعانة الأمراض المستعصية (السرطان، القصور الكلوي، الإيدز)',
        value: '50,000 دج',
        detail: 'مرة في السنة · شهادة طبية من مختص توضح طبيعة المرض',
      },
      {
        label: 'إعانة خاصة بالإعاقة',
        value: '20,000 دج',
        detail: 'مرة في السنة · نسخة من بطاقة الإعاقة',
      },
    ],
  },
  {
    id: 'schooling-grant',
    title: 'منحة التمدرس للأيتام وميثاق الرعاية',
    subtitle: 'التعاضدية الوطنية لعمال التربية والثقافة هي درعك الواقي وشريكك الدائم',
    category: 'الحماية الاجتماعية والجنازة',
    imagePath: assetUrl('/assets/aistudio/image_fce008b7.png'),
    iconKey: 'graduation',
    validityNote: 'تصرف مرة في السنة',
    extraDocsNote: 'المطلوب: شهادة مدرسية سارية المفعول',
    associatedCareType: 'منح الأرامل والأيتام والتمدرس',
    items: [
      {
        label: 'منحة التمدرس للأيتام',
        value: '6,000 دج',
        detail: 'تصرف مرة في السنة · المطلوب: شهادة مدرسية',
      },
      {
        label: 'رسالة التعاضدية',
        value: 'مرافقة شاملة',
        detail: 'من بداية المسار المهني، مروراً بتأسيس العائلة والرعاية الصحية، وصولاً إلى التقاعد',
      },
    ],
  },
];

export const COVERAGE_RULES: CoverageRule[] = [
  {
    careType: 'العطل المرضية',
    mode: 'percent',
    mutualRate: 50,
    annualCap: null,
    validityPeriod: '3 سنوات',
    requiredDocs: ['الملف القاعدي الكامل', 'كشف حساب الضمان الاجتماعي بنسبة 50%'],
  },
  {
    careType: 'منتجات صيدلانية وأجهزة اصطناعية',
    mode: 'percent',
    mutualRate: 20,
    annualCap: null,
    validityPeriod: '3 سنوات',
    requiredDocs: ['الملف القاعدي الكامل', 'كشف تعويض CNAS والوصفات الطبية'],
  },
  {
    careType: 'الجراحة العامة',
    mode: 'percent',
    mutualRate: 25,
    annualCap: 50000,
    validityPeriod: '3 سنوات (مرة في السنة)',
    requiredDocs: ['الملف القاعدي الكامل', 'ملخص الخروج والفاتورة المفصلة للعملية'],
  },
  {
    careType: 'جراحة وتقويم وزراعة الأسنان',
    mode: 'percent',
    mutualRate: 30,
    annualCap: 20000,
    validityPeriod: '3 سنوات (مرة في السنة)',
    requiredDocs: ['الملف القاعدي الكامل', 'ورقة علاج الأسنان حاملة لترميز الأداء'],
  },
  {
    careType: 'التحاليل الطبية والخزعات',
    mode: 'percent',
    mutualRate: 30,
    annualCap: 10000,
    validityPeriod: '3 سنوات (مرة في السنة)',
    requiredDocs: ['الملف القاعدي الكامل', 'نسخة من نتيجة التحاليل'],
  },
  {
    careType: 'الأشعة الطبية الكبرى',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 5000,
    annualCap: 5000,
    validityPeriod: '3 سنوات',
    requiredDocs: ['الملف القاعدي الكامل', 'نسخة من نتيجة الأشعة (IRM 5,000 / Scanner 2,500 / Mammographie 1,500 دج)'],
  },
  {
    careType: 'طب العيون والبصريات',
    mode: 'percent',
    mutualRate: 50,
    annualCap: 4000,
    validityPeriod: '3 سنوات',
    requiredDocs: ['الملف القاعدي الكامل', 'وصفة طبية من طبيب العيون (إطار سقف 2,000 دج / زجاج 1,000 دج × 4 / عدسات 3,000 دج)'],
  },
  {
    careType: 'الأشعة والتحاليل التشخيصية',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 1000,
    annualCap: 2000,
    validityPeriod: 'مرتين (02) في السنة لكل أداء',
    requiredDocs: ['الملف القاعدي الكامل', 'نتيجة الفحص (1,000 دج أو 500 دج حسب المصفوفة)'],
  },
  {
    careType: 'إعادة التأهيل الوظيفي',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 2000,
    annualCap: 2000,
    validityPeriod: 'سقف 10 جلسات / سنة',
    requiredDocs: ['الملف القاعدي الكامل', 'وصفة طبيب مختص تحدد بدقة عدد الجلسات (200 دج/جلسة)'],
  },
  {
    careType: 'المنح العائلية (الزواج / الولادة / الختان)',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 20000,
    annualCap: 20000,
    validityPeriod: 'سنتان (02)',
    requiredDocs: ['الملف القاعدي', 'عقد الزواج (20,000 دج) أو شهادة الميلاد (6,000 دج) أو شهادة ختان أصلية (5,000 دج) + شهادة عائلية'],
  },
  {
    careType: 'منحة الإحالة على التقاعد',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 50000,
    annualCap: 50000,
    validityPeriod: 'مرة واحدة في العمر',
    requiredDocs: ['قرار الإحالة على التقاعد / توقيف الراتب', 'مجمل الخدمات', 'شهادة استيفاء الاشتراكات (≥ 10 سنوات بدون انقطاع)'],
  },
  {
    careType: 'منح الأرامل والأيتام والتمدرس',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 24000,
    annualCap: 42000,
    validityPeriod: 'منح سنوية قابلة للتجديد',
    requiredDocs: ['شهادات الوفاة والحالة العائلية', 'شهادة عدم الانتساب CASNOS وعدم الزواج', 'شهادة مدرسية لمنحة التمدرس (6,000 دج)'],
  },
  {
    careType: 'مساعدة مصاريف الجنازة',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 50000,
    annualCap: 50000,
    validityPeriod: 'سنتان',
    requiredDocs: ['شهادة الوفاة', 'شهادة عائلية', 'شهادة ذوي الحقوق لغير العضو (50,000 / 30,000 / 10,000 / 5,000 دج)'],
  },
  {
    careType: 'الإعانات الاجتماعية (الأمراض المستعصية / الإعاقة)',
    mode: 'fixed',
    mutualRate: 100,
    fixedAmount: 50000,
    annualCap: 50000,
    validityPeriod: 'مرة في السنة',
    requiredDocs: ['الملف القاعدي', 'شهادة طبية من مختص للأمراض المستعصية (50,000 دج) أو بطاقة الإعاقة (20,000 دج)'],
  },
];

export function estimateReimbursement(
  careType: CareType,
  totalAmount: number,
  _plan: CoveragePlan = 'التغطية التكميلية+'
): {
  basicShare: number;
  mutualShare: number;
  totalReimbursement: number;
  outOfPocket: number;
  effectiveRate: number;
  appliedCap: number | null;
} {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return {
      basicShare: 0,
      mutualShare: 0,
      totalReimbursement: 0,
      outOfPocket: 0,
      effectiveRate: 0,
      appliedCap: null,
    };
  }

  const rule = COVERAGE_RULES.find((r) => r.careType === careType) || COVERAGE_RULES[1];

  if (rule.mode === 'fixed') {
    const fixedAmt = rule.fixedAmount || 0;
    const mutualShare = Math.min(Math.round(totalAmount), fixedAmt);
    const outOfPocket = Math.max(0, Math.round(totalAmount - mutualShare));
    const effectiveRate = totalAmount > 0 ? Math.round((mutualShare / totalAmount) * 100) : 0;
    return {
      basicShare: 0,
      mutualShare,
      totalReimbursement: mutualShare,
      outOfPocket,
      effectiveRate,
      appliedCap: rule.annualCap,
    };
  }

  const rawMutual = Math.round(totalAmount * (rule.mutualRate / 100));
  const mutualShare = rule.annualCap ? Math.min(rawMutual, rule.annualCap) : rawMutual;
  const outOfPocket = Math.max(0, Math.round(totalAmount - mutualShare));

  return {
    basicShare: 0,
    mutualShare,
    totalReimbursement: mutualShare,
    outOfPocket,
    effectiveRate: rule.mutualRate,
    appliedCap: rule.annualCap,
  };
}

export const PROVIDERS_DIRECTORY: ProviderItem[] = [
  {
    id: 'prv-1',
    name: 'المديرية العامة للتعاضدية الوطنية (MUTNATEC) — المقر الوطني',
    category: 'وكالة التعاضدية',
    city: 'الجزائر العاصمة',
    address: 'حي العناصر / القبة، الجزائر الوسطى',
    phone: '021-67-42-10',
    conventionCode: 'MUT-DZ-1600',
    thirdPartyPay: true,
  },
  {
    id: 'prv-2',
    name: 'مصحة الضمان الاجتماعي والتعاضدية — بن عكنون',
    category: 'مصحة متعاقدة',
    city: 'الجزائر العاصمة',
    address: 'طريق دودو مختار، بن عكنون',
    phone: '021-91-34-55',
    conventionCode: 'CNV-16-014',
    thirdPartyPay: true,
  },
  {
    id: 'prv-3',
    name: 'مركز الأشعة والتشخيص الطبي المتعاقد — وهران',
    category: 'مختبر التحاليل والأشعة',
    city: 'وهران',
    address: 'نهج العقيد لطفي، إقامة الياسمين',
    phone: '041-33-19-00',
    conventionCode: 'LAB-31-008',
    thirdPartyPay: true,
  },
  {
    id: 'prv-4',
    name: 'عيادة جراحة وطب الأسنان التعاضدية — قسنطينة',
    category: 'مركز طب الأسنان',
    city: 'قسنطينة',
    address: 'وسط المدينة، شارع عبان رمضان',
    phone: '031-92-48-15',
    conventionCode: 'DNT-25-029',
    thirdPartyPay: true,
  },
  {
    id: 'prv-5',
    name: 'القسم الولائي للتعاضدية الوطنية (MUTNATEC) — سطيف',
    category: 'وكالة التعاضدية',
    city: 'سطيف',
    address: 'حي 1000 مسكن، مقابل مديرية التربية لولاية سطيف',
    phone: '036-84-21-77',
    conventionCode: 'MUT-DZ-1900',
    thirdPartyPay: true,
  },
  {
    id: 'prv-6',
    name: 'بصريات النور المعتمدة لعمال التربية',
    category: 'بصريات معتمدة',
    city: 'عنابة',
    address: 'ساحة الثورة، عمارة ب رقم 12',
    phone: '038-86-55-32',
    conventionCode: 'OPT-23-019',
    thirdPartyPay: false,
  },
  {
    id: 'prv-7',
    name: 'مصحة جراحة العيون والليزر المتعاقدة — تيزي وزو',
    category: 'مصحة متعاقدة',
    city: 'تيزي وزو',
    address: 'المدينة الجديدة، شارع 20 أوت',
    phone: '026-21-40-66',
    conventionCode: 'CNV-15-041',
    thirdPartyPay: true,
  },
  {
    id: 'prv-8',
    name: 'مخبر التحاليل الطبية المعتمد — باتنة',
    category: 'مختبر التحاليل والأشعة',
    city: 'باتنة',
    address: 'حي الزهور، شارع الاستقلال رقم 18',
    phone: '033-85-71-40',
    conventionCode: 'LAB-05-012',
    thirdPartyPay: true,
  },
  {
    id: 'prv-9',
    name: 'مصحة الشفاء متعددة التخصصات — البليدة',
    category: 'مصحة متعاقدة',
    city: 'البليدة',
    address: 'أولاد يعيش، الطريق الوطني رقم 1',
    phone: '025-41-33-18',
    conventionCode: 'CNV-09-052',
    thirdPartyPay: true,
  },
  {
    id: 'prv-10',
    name: 'القسم الولائي للتعاضدية الوطنية (MUTNATEC) — ورقلة',
    category: 'وكالة التعاضدية',
    city: 'ورقلة',
    address: 'حي النصر، قرب مديرية التربية',
    phone: '029-71-11-45',
    conventionCode: 'MUT-DZ-3000',
    thirdPartyPay: true,
  },
];

export const CLAIM_STATUS_FILTERS: Array<'الكل' | ClaimStatus> = [
  'الكل',
  'قيد الدراسة',
  'تمت الموافقة',
  'تم الصرف',
  'وثائق ناقصة',
  'مرفوض',
];

export const AUTH_STATUS_FILTERS: Array<'الكل' | AuthorizationStatus> = [
  'الكل',
  'قيد الدراسة',
  'موافق عليه',
  'مرفوض',
];

export const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ج`;
}

export function generateSafeId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `${cleanPrefix}-${stamp}-${rand}`;
}

export function generateMembershipNumber(uid: string): string {
  const suffix = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || '160420';
  return `MUT-2026-${suffix}`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
