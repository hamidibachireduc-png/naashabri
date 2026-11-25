import wilayaSeedJson from '../../data/wilaya-offices.json';
import { WILAYA_DEFAULT_LABELS } from '../data/mutualCatalog';
import type {
  AdminReportsSummary,
  AuthorizationRequest,
  AuthorizationStatus,
  CardVerificationResult,
  ClaimStatus,
  CoveragePlan,
  Dependent,
  EnrollmentStatus,
  ExcelSyncMeta,
  IndividualEnrollment,
  InternalRosterMember,
  MedicalClaim,
  MemberGender,
  MemberProfile,
  MemberStatus,
  NationalWarehouseMeta,
  PublicMemberStats,
  PublicWilayaMapEntry,
  WilayaBackupRestoreResponse,
  WilayaHeadAccount,
  WilayaHeadProvisionedCredential,
  WilayaHeadStatus,
  WilayaHeadWorkspaceData,
  WilayaOffice,
} from '../types/mutual';

const STORAGE_KEY = 'mutnatec_ghp_store_v1';
const AUTH_SALT = 'mutnatec_ghp_2026_v1';
const ADMIN_USERNAME = 'habrinaas';
const ADMIN_PASSWORD_HASH =
  '9aac29c703d6bd50d633f4827d357645c4926ad9b83ae290dcef1e55a02f0aa1';

interface StaticRosterEntry extends InternalRosterMember {
  accessCodeHash?: string;
}

interface StaticWilayaHeadEntry {
  wilayaCode: string;
  username: string;
  fullName: string;
  title: string;
  phone: string;
  email: string;
  status: WilayaHeadStatus;
  passwordHash?: string;
  updatedAt: string;
}

interface StaticDatabaseState {
  roster: StaticRosterEntry[];
  dependents: Dependent[];
  claims: MedicalClaim[];
  authorizations: AuthorizationRequest[];
  enrollments: IndividualEnrollment[];
  wilayas: WilayaOffice[];
  wilayaHeads: StaticWilayaHeadEntry[];
  lastSyncedAt: string;
}

const SEEDED_ROSTER: StaticRosterEntry[] = [
  {
    membershipNumber: 'MUT-2026-1001',
    accessCode: '••••••••',
    accessCodeHash:
      '59fc20944355e646a5108fde7c4826f3d399de9042e583d89607cf2b10fa1aa5',
    fullName: 'أحمد بن علي',
    email: 'ahmed.benali@education.dz',
    nationalId: '1984160420011205',
    socialSecurityNumber: '841604200192',
    birthDate: '1984-05-14',
    birthPlace: 'الجزائر الوسطى',
    jobTitle: 'أستاذ التعليم الثانوي',
    memberRole: 'منخرط نشط',
    enrollmentYear: '2026',
    gender: 'ذكر',
    seniorityYears: 14,
    sector: 'التربية الوطنية — التعليم الثانوي',
    city: 'الجزائر العاصمة',
    municipality: 'الجزائر الوسطى',
    institution: 'ثانوية حسيبة بن بوعلي',
    phone: '0551248930',
    rib: '00799999001842901124',
    coveragePlan: 'التغطية التكميلية+',
    annualCeiling: 250000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1002',
    accessCode: '••••••••',
    accessCodeHash:
      'c89536497cbc50aa533413cac769dbd1846035e6e19f41c73f06115238be95c4',
    fullName: 'فاطمة الزهراء منصوري',
    email: 'f.mansouri@culture.dz',
    nationalId: '1989310210045812',
    socialSecurityNumber: '893102100451',
    birthDate: '1989-11-03',
    birthPlace: 'وهران',
    jobTitle: 'ملحقة حفظ وتنشيط ثقافي',
    memberRole: 'منخرطة نشطة',
    enrollmentYear: '2026',
    gender: 'أنثى',
    seniorityYears: 8,
    sector: 'قطاع الثقافة والفنون والمكتبات',
    city: 'وهران',
    municipality: 'السانيا',
    institution: 'دار الثقافة لوهران',
    phone: '0662419087',
    rib: '00799999003190448810',
    coveragePlan: 'التغطية العائلية المميزة',
    annualCeiling: 350000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1003',
    accessCode: '••••••••',
    accessCodeHash:
      'f20be2819abb967375055288bbdb7d66d4019b0734b74d2813daf2f81e8ee01b',
    fullName: 'كريم بوزيد',
    email: 'k.bouzid@education.dz',
    nationalId: '1976250190033174',
    socialSecurityNumber: '762501900338',
    birthDate: '1976-03-22',
    birthPlace: 'قسنطينة',
    jobTitle: 'مدير مدرسة ابتدائية',
    memberRole: 'منخرط نشط',
    enrollmentYear: '2026',
    gender: 'ذكر',
    seniorityYears: 22,
    sector: 'التربية الوطنية — التعليم الابتدائي',
    city: 'قسنطينة',
    municipality: 'قسنطينة',
    institution: 'مدرسة ابن باديس الابتدائية',
    phone: '0770351942',
    rib: '00799999002577120933',
    coveragePlan: 'التغطية الأساسية الشاملة',
    annualCeiling: 180000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1004',
    accessCode: '••••••••',
    accessCodeHash:
      'bbaf91078d91bfd08c7c8f9e09af0360de32f0e3ab0da548227bf58d704b9d65',
    fullName: 'سارة بن عيسى',
    email: 's.benaissa@education.dz',
    nationalId: '1994160880024110',
    socialSecurityNumber: '941608800244',
    birthDate: '1994-08-19',
    birthPlace: 'الحراش',
    jobTitle: 'أستاذة التعليم الابتدائي',
    memberRole: 'منخرطة نشطة',
    enrollmentYear: '2026',
    gender: 'أنثى',
    seniorityYears: 4,
    sector: 'التربية الوطنية — التعليم الابتدائي',
    city: 'الجزائر العاصمة',
    municipality: 'باب الزوار',
    institution: 'مدرسة الإخوة عيساتي الابتدائية',
    phone: '0554901122',
    rib: '00799999001928374655',
    coveragePlan: 'التغطية الأساسية الشاملة',
    annualCeiling: 180000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1005',
    accessCode: '••••••••',
    accessCodeHash:
      '5f9b13d6ff03b2723f941c1f99d50e27cf85bdd094fc63124f00bcc8051abbe3',
    fullName: 'نادية قاسي',
    email: 'n.kaci@education.dz',
    nationalId: '1986150340019822',
    socialSecurityNumber: '861503400195',
    birthDate: '1986-02-11',
    birthPlace: 'تيزي وزو',
    jobTitle: 'أستاذة التعليم المتوسط',
    memberRole: 'منخرطة نشطة',
    enrollmentYear: '2026',
    gender: 'أنثى',
    seniorityYears: 12,
    sector: 'التربية الوطنية — التعليم المتوسط',
    city: 'تيزي وزو',
    municipality: 'تيزي وزو',
    institution: 'متوسطة العقيد عميروش',
    phone: '0661784321',
    rib: '00799999001500998877',
    coveragePlan: 'التغطية التكميلية+',
    annualCeiling: 250000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1006',
    accessCode: '••••••••',
    accessCodeHash:
      '981b75acb386bfa981e13e555d638796315f5c52e243679151cb378411e6c58b',
    fullName: 'محمد الأمين شايب',
    email: 'm.chaib@education.dz',
    nationalId: '1974190220041209',
    socialSecurityNumber: '741902200411',
    birthDate: '1974-09-27',
    birthPlace: 'سطيف',
    jobTitle: 'مفتش التربية الوطنية (متقاعد)',
    memberRole: 'منخرط متقاعد',
    enrollmentYear: '2026',
    gender: 'ذكر',
    seniorityYears: 25,
    sector: 'متقاعدو التربية والثقافة',
    city: 'سطيف',
    municipality: 'سطيف',
    institution: 'مديرية التربية لولاية سطيف',
    phone: '0771223344',
    rib: '00799999001944556677',
    coveragePlan: 'التغطية العائلية المميزة',
    annualCeiling: 350000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1007',
    accessCode: '••••••••',
    accessCodeHash:
      'b6d4e5617edeb342bf1be043a6663ccd714428e974f5172fbafaa36f403eda25',
    fullName: 'خديجة مزاري',
    email: 'k.mezari@education.dz',
    nationalId: '1991090440017765',
    socialSecurityNumber: '910904400179',
    birthDate: '1991-06-05',
    birthPlace: 'البليدة',
    jobTitle: 'مستشارة التوجيه المدرسي',
    memberRole: 'منخرطة نشطة',
    enrollmentYear: '2026',
    gender: 'أنثى',
    seniorityYears: 7,
    sector: 'التربية الوطنية — التعليم الثانوي',
    city: 'البليدة',
    municipality: 'بوفاريك',
    institution: 'ثانوية حسيبة بن بوعلي',
    phone: '0558332211',
    rib: '00799999000911223344',
    coveragePlan: 'التغطية التكميلية+',
    annualCeiling: 250000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1008',
    accessCode: '••••••••',
    accessCodeHash:
      '9bc0c536ebb9d3ab9b24540cb47499672e7435bd9f1e28d85d20d22fb4b4100d',
    fullName: 'ياسين بركاني',
    email: 'y.berkani@education.dz',
    nationalId: '1982050110089432',
    socialSecurityNumber: '820501100890',
    birthDate: '1982-12-18',
    birthPlace: 'باتنة',
    jobTitle: 'ناظر متوسطة',
    memberRole: 'منخرط نشط',
    enrollmentYear: '2026',
    gender: 'ذكر',
    seniorityYears: 17,
    sector: 'التربية الوطنية — التعليم المتوسط',
    city: 'باتنة',
    municipality: 'باتنة',
    institution: 'متوسطة العقيد لطفي',
    phone: '0663554411',
    rib: '00799999000588776655',
    coveragePlan: 'التغطية التكميلية+',
    annualCeiling: 250000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1009',
    accessCode: '••••••••',
    accessCodeHash:
      '66f586718959c6182235c5c6beeca593b82da8b0f436d8c8001b074f88c31fd6',
    fullName: 'إيمان زروقي',
    email: 'i.zerrouki@culture.dz',
    nationalId: '1996160770051290',
    socialSecurityNumber: '961607700513',
    birthDate: '1996-04-09',
    birthPlace: 'القبة',
    jobTitle: 'أمينة مكتبة رئيسية',
    memberRole: 'منخرطة نشطة',
    enrollmentYear: '2026',
    gender: 'أنثى',
    seniorityYears: 3,
    sector: 'قطاع الثقافة والفنون والمكتبات',
    city: 'الجزائر العاصمة',
    municipality: 'الجزائر الوسطى',
    institution: 'المكتبة الوطنية الجزائرية',
    phone: '0552889900',
    rib: '00799999001677889900',
    coveragePlan: 'التغطية الأساسية الشاملة',
    annualCeiling: 180000,
    status: 'نشط',
  },
  {
    membershipNumber: 'MUT-2026-1010',
    accessCode: '••••••••',
    accessCodeHash:
      '865f6fa45fff0751371fcb04a07ed2e0a6149a3c7f4e7ce53bc666c763606bc5',
    fullName: 'عبد القادر رحماني',
    email: 'a.rahmani@education.dz',
    nationalId: '1988310990065431',
    socialSecurityNumber: '883109900658',
    birthDate: '1988-07-30',
    birthPlace: 'وهران',
    jobTitle: 'مقتصد رئيسي',
    memberRole: 'منخرط نشط',
    enrollmentYear: '2026',
    gender: 'ذكر',
    seniorityYears: 9,
    sector: 'التربية الوطنية — موظفو المصالح الإدارية',
    city: 'وهران',
    municipality: 'بئر الجير',
    institution: 'ثانوية العقيد لطفي وهران',
    phone: '0773119988',
    rib: '00799999003155443322',
    coveragePlan: 'التغطية التكميلية+',
    annualCeiling: 250000,
    status: 'نشط',
  },
];

const SEEDED_DEPENDENTS: Dependent[] = [
  {
    id: 'DEP-INT-01',
    ownerId: 'MUT-2026-1001',
    fullName: 'سارة بن علي',
    relationship: 'الزوج/الزوجة',
    birthDate: '1988-04-12',
    coverageCode: 'DEP-1001-01',
    active: true,
  },
  {
    id: 'DEP-INT-02',
    ownerId: 'MUT-2026-1001',
    fullName: 'ياسين بن علي',
    relationship: 'ابن/ابنة',
    birthDate: '2015-09-03',
    coverageCode: 'DEP-1001-02',
    active: true,
  },
];

const SEEDED_CLAIMS: MedicalClaim[] = [
  {
    id: 'CLM-INT-01',
    ownerId: 'MUT-2026-1001',
    memberName: 'أحمد بن علي',
    membershipNumber: 'MUT-2026-1001',
    referenceCode: 'CLM-2026-1001A',
    beneficiaryName: 'أحمد بن علي',
    beneficiaryRelation: 'المنخرط الرئيسي',
    careType: 'الأشعة الطبية الكبرى',
    providerName: 'مركز الأشعة والتشخيص الطبي — الجزائر',
    careDate: '2026-10-14',
    totalAmount: 18000,
    estimatedReimbursement: 5000,
    approvedAmount: 5000,
    status: 'تم الصرف',
    notes: 'فحص IRM مع كشف الضمان الاجتماعي والملف القاعدي',
    reviewerNote: 'تم التحويل عبر CCP وفق السقف الثابت 5,000 دج',
  },
  {
    id: 'CLM-INT-02',
    ownerId: 'MUT-2026-1001',
    memberName: 'أحمد بن علي',
    membershipNumber: 'MUT-2026-1001',
    referenceCode: 'CLM-2026-1001B',
    beneficiaryName: 'سارة بن علي',
    beneficiaryRelation: 'الزوج/الزوجة',
    careType: 'طب العيون والبصريات',
    providerName: 'مركز طب العيون والبصريات — الجزائر الوسطى',
    careDate: '2026-06-19',
    totalAmount: 9000,
    estimatedReimbursement: 4000,
    approvedAmount: 4000,
    status: 'تم الصرف',
    notes: 'نظارات طبية (إطار + زجاج بصري) مع وصفة طبيب العيون',
    reviewerNote: 'تمت الموافقة والتحويل البريدي',
  },
  {
    id: 'CLM-INT-03',
    ownerId: 'MUT-2026-1001',
    memberName: 'أحمد بن علي',
    membershipNumber: 'MUT-2026-1001',
    referenceCode: 'CLM-2026-1001C',
    beneficiaryName: 'ياسين بن علي',
    beneficiaryRelation: 'ابن/ابنة',
    careType: 'منتجات صيدلانية وأجهزة اصطناعية',
    providerName: 'صيدلية الشفاء — القبة',
    careDate: '2026-03-08',
    totalAmount: 12500,
    estimatedReimbursement: 2500,
    approvedAmount: 2500,
    status: 'تمت الموافقة',
    notes: 'وصفة أدوية مع كشف حساب تعويضات CNAS',
    reviewerNote: 'نسبة 20% معتمدة وفق جدول 2026',
  },
  {
    id: 'CLM-INT-04',
    ownerId: 'MUT-2026-1001',
    memberName: 'أحمد بن علي',
    membershipNumber: 'MUT-2026-1001',
    referenceCode: 'CLM-2026-1001D',
    beneficiaryName: 'أحمد بن علي',
    beneficiaryRelation: 'المنخرط الرئيسي',
    careType: 'التحاليل الطبية والخزعات',
    providerName: 'مخبر التحاليل الطبية — بن عكنون',
    careDate: '2026-08-22',
    totalAmount: 14000,
    estimatedReimbursement: 4200,
    approvedAmount: 4200,
    status: 'تم الصرف',
    notes: 'تحاليل دم شاملة مرفقة بالملف القاعدي',
    reviewerNote: '30% من المبلغ الإجمالي',
  },
  {
    id: 'CLM-INT-05',
    ownerId: 'MUT-2026-1001',
    memberName: 'أحمد بن علي',
    membershipNumber: 'MUT-2026-1001',
    referenceCode: 'CLM-2026-1001E',
    beneficiaryName: 'أحمد بن علي',
    beneficiaryRelation: 'المنخرط الرئيسي',
    careType: 'جراحة وتقويم وزراعة الأسنان',
    providerName: 'عيادة جراحة الأسنان التعاضدية',
    careDate: '2026-11-11',
    totalAmount: 32000,
    estimatedReimbursement: 9600,
    approvedAmount: 0,
    status: 'قيد الدراسة',
    notes: 'ورقة علاج الأسنان حاملة لترميز الأداء',
    reviewerNote: '',
  },
];

function buildInitialWilayas(): WilayaOffice[] {
  const byCode = new Map<string, Partial<WilayaOffice>>();
  if (Array.isArray(wilayaSeedJson)) {
    for (const item of wilayaSeedJson) {
      if (item && typeof item === 'object' && typeof item.code === 'string') {
        byCode.set(item.code, item as Partial<WilayaOffice>);
      }
    }
  }
  return WILAYA_DEFAULT_LABELS.map((row) => {
    const saved = byCode.get(row.code);
    return {
      code: row.code,
      wilayaName: saved?.wilayaName || row.name,
      officeName: saved?.officeName || `مركز الدفع الولائي — ${row.name}`,
      representativeName: saved?.representativeName || '',
      headTitle: saved?.headTitle,
      phone: saved?.phone || '',
      accountInfo: saved?.accountInfo || '',
      socialUrl: saved?.socialUrl || '',
      address: saved?.address || '',
      googleMapsUrl: saved?.googleMapsUrl || '',
      secondaryMapsUrl: saved?.secondaryMapsUrl || '',
      ...(typeof saved?.lat === 'number' && typeof saved?.lng === 'number'
        ? { lat: saved.lat, lng: saved.lng }
        : {}),
      updatedAt: saved?.updatedAt || '',
    };
  });
}

function buildInitialWilayaHeads(wilayas: WilayaOffice[]): StaticWilayaHeadEntry[] {
  return wilayas.map((w) => ({
    wilayaCode: w.code,
    username: `head${w.code}`,
    fullName: w.representativeName || '',
    title: w.headTitle || `رئيس التعاضدية الولائية — ${w.wilayaName}`,
    phone: w.phone || '',
    email: '',
    status: 'نشط',
    updatedAt: w.updatedAt || '',
  }));
}

function getInitialState(): StaticDatabaseState {
  const wilayas = buildInitialWilayas();
  return {
    roster: SEEDED_ROSTER.map((m) => ({ ...m })),
    dependents: SEEDED_DEPENDENTS.map((d) => ({ ...d })),
    claims: SEEDED_CLAIMS.map((c) => ({ ...c })),
    authorizations: [],
    enrollments: [],
    wilayas,
    wilayaHeads: buildInitialWilayaHeads(wilayas),
    lastSyncedAt: new Date().toISOString(),
  };
}

function readState(): StaticDatabaseState {
  if (typeof window === 'undefined') return getInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = getInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    const parsed = JSON.parse(raw) as Partial<StaticDatabaseState>;
    const defaults = getInitialState();
    const seedByCode = new Map(defaults.wilayas.map((w) => [w.code, w]));
    const wilayas =
      Array.isArray(parsed.wilayas) && parsed.wilayas.length > 0
        ? parsed.wilayas.map((w) => {
            const seed = seedByCode.get(w.code);
            return {
              ...w,
              lat: typeof w.lat === 'number' ? w.lat : seed?.lat,
              lng: typeof w.lng === 'number' ? w.lng : seed?.lng,
            };
          })
        : defaults.wilayas;
    const savedHeadsByCode = new Map(
      (Array.isArray(parsed.wilayaHeads) ? parsed.wilayaHeads : []).map((h) => [
        h.wilayaCode,
        h,
      ])
    );
    const wilayaHeads = wilayas.map((w) => {
      const saved = savedHeadsByCode.get(w.code);
      return (
        saved || {
          wilayaCode: w.code,
          username: `head${w.code}`,
          fullName: w.representativeName || '',
          title: w.headTitle || `رئيس التعاضدية الولائية — ${w.wilayaName}`,
          phone: w.phone || '',
          email: '',
          status: 'نشط' as WilayaHeadStatus,
          updatedAt: w.updatedAt || '',
        }
      );
    });
    return {
      roster: Array.isArray(parsed.roster) ? parsed.roster : defaults.roster,
      dependents: Array.isArray(parsed.dependents) ? parsed.dependents : defaults.dependents,
      claims: Array.isArray(parsed.claims) ? parsed.claims : defaults.claims,
      authorizations: Array.isArray(parsed.authorizations)
        ? parsed.authorizations
        : defaults.authorizations,
      enrollments: Array.isArray(parsed.enrollments)
        ? parsed.enrollments
        : defaults.enrollments,
      wilayas,
      wilayaHeads,
      lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
    };
  } catch {
    return getInitialState();
  }
}

function writeState(state: StaticDatabaseState) {
  if (typeof window === 'undefined') return;
  try {
    state.lastSyncedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

async function sha256SaltedHex(value: string): Promise<string> {
  const input = `${AUTH_SALT}:${value}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

async function computeStaticCardSig(membershipNumber: string): Promise<string> {
  const hex = await sha256SaltedHex(`CARD:${membershipNumber.toUpperCase()}`);
  return (hex || 'MUTNATEC20260000').slice(0, 16).toUpperCase();
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function parseStaticAdminToken(token: string): string | null {
  if (!token.startsWith('ghp-admin:')) return null;
  const sub = token.slice('ghp-admin:'.length).trim();
  return sub || null;
}

function parseStaticMemberToken(token: string): string | null {
  if (!token.startsWith('ghp-member:')) return null;
  const sub = token.slice('ghp-member:'.length).trim();
  return sub || null;
}

function parseStaticWilayaHeadToken(token: string): string | null {
  if (!token.startsWith('ghp-wilaya-head:')) return null;
  const sub = token.slice('ghp-wilaya-head:'.length).trim();
  return sub || null;
}

async function toMemberProfile(entry: StaticRosterEntry): Promise<MemberProfile> {
  return {
    uid: `internal:${entry.membershipNumber}`,
    fullName: entry.fullName,
    email: entry.email,
    nationalId: entry.nationalId,
    socialSecurityNumber: entry.socialSecurityNumber,
    birthDate: entry.birthDate,
    birthPlace: entry.birthPlace,
    jobTitle: entry.jobTitle,
    municipality: entry.municipality || entry.city,
    institution: entry.institution || entry.sector,
    memberRole: entry.memberRole || (entry.status === 'نشط' ? 'منخرط نشط' : entry.status),
    enrollmentYear: entry.enrollmentYear || '2026',
    cardQrSig: await computeStaticCardSig(entry.membershipNumber),
    membershipNumber: entry.membershipNumber,
    sector: entry.sector,
    city: entry.city,
    phone: entry.phone,
    rib: entry.rib,
    coveragePlan: entry.coveragePlan,
    annualCeiling: entry.annualCeiling,
    status: entry.status,
  };
}

export function isStaticSessionToken(token: string): boolean {
  return (
    token.startsWith('ghp-admin:') ||
    token.startsWith('ghp-member:') ||
    token.startsWith('ghp-wilaya-head:')
  );
}

export async function staticLoginAdmin(
  username: string,
  password: string
): Promise<{ token: string; username: string }> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanUser || !cleanPass) {
    throw new Error('يرجى إدخال اسم المستخدم والرقم السري.');
  }
  const passHash = await sha256SaltedHex(cleanPass);
  if (cleanUser !== ADMIN_USERNAME || passHash !== ADMIN_PASSWORD_HASH) {
    throw new Error('اسم المستخدم أو الرقم السري غير صحيح.');
  }
  return {
    token: `ghp-admin:${ADMIN_USERNAME}`,
    username: ADMIN_USERNAME,
  };
}

export async function staticLoginMember(
  membershipNumber: string,
  accessCode: string
): Promise<{ token: string; member: MemberProfile }> {
  const cleanNum = membershipNumber.trim().toUpperCase();
  const cleanCode = accessCode.trim();
  if (!cleanNum || !cleanCode) {
    throw new Error('يرجى إدخال رقم الانخراط ورمز الدخول.');
  }
  const state = readState();
  const matched = state.roster.find(
    (m) => m.membershipNumber.toUpperCase() === cleanNum
  );
  if (!matched) {
    throw new Error('رقم الانخراط أو رمز الدخول غير صحيح.');
  }

  let validCode = false;
  if (matched.accessCode && matched.accessCode !== '••••••••') {
    validCode = matched.accessCode === cleanCode;
  } else if (matched.accessCodeHash) {
    const codeHash = await sha256SaltedHex(cleanCode);
    validCode = codeHash === matched.accessCodeHash;
  }

  if (!validCode) {
    throw new Error('رقم الانخراط أو رمز الدخول غير صحيح.');
  }

  if (matched.status !== 'نشط') {
    throw new Error(
      `حساب الانخراط في وضعية (${matched.status}). يرجى مراجعة مدير الموقع.`
    );
  }

  return {
    token: `ghp-member:${matched.membershipNumber}`,
    member: await toMemberProfile(matched),
  };
}

export async function staticFetchMemberWorkspace(token: string): Promise<{
  member: MemberProfile;
  dependents: Dependent[];
  claims: MedicalClaim[];
  authorizations: AuthorizationRequest[];
}> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const entry = state.roster.find((m) => m.membershipNumber === membershipNumber);
  if (!entry) throw new Error('ملف المنخرط غير موجود.');
  // Strict per-member isolation: only return data owned by this membershipNumber
  return {
    member: await toMemberProfile(entry),
    dependents: state.dependents.filter((d) => d.ownerId === membershipNumber),
    claims: state.claims.filter((c) => c.ownerId === membershipNumber),
    authorizations: state.authorizations.filter((a) => a.ownerId === membershipNumber),
  };
}

export async function staticUpdateMemberProfile(
  token: string,
  payload: Partial<MemberProfile>
): Promise<{ member: MemberProfile }> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const idx = state.roster.findIndex((m) => m.membershipNumber === membershipNumber);
  if (idx === -1) throw new Error('الملف غير موجود.');
  state.roster[idx] = {
    ...state.roster[idx],
    fullName: payload.fullName?.trim() || state.roster[idx].fullName,
    nationalId: payload.nationalId?.trim() || state.roster[idx].nationalId,
    sector: payload.sector?.trim() || state.roster[idx].sector,
    city: payload.city?.trim() || state.roster[idx].city,
    phone: payload.phone?.trim() || state.roster[idx].phone,
    rib: payload.rib?.replace(/\s+/g, '') || state.roster[idx].rib,
    coveragePlan: payload.coveragePlan || state.roster[idx].coveragePlan,
  };
  writeState(state);
  return { member: await toMemberProfile(state.roster[idx]) };
}

export async function staticCreateDependent(
  token: string,
  payload: { fullName: string; relationship: string; birthDate: string }
): Promise<{ dependent: Dependent }> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const created: Dependent = {
    id: generateId('DEP'),
    ownerId: membershipNumber,
    fullName: payload.fullName.trim(),
    relationship: payload.relationship as Dependent['relationship'],
    birthDate: payload.birthDate,
    coverageCode: generateId('COV').slice(0, 16),
    active: true,
  };
  state.dependents.push(created);
  writeState(state);
  return { dependent: created };
}

export async function staticToggleDependent(
  token: string,
  id: string,
  active: boolean
): Promise<{ dependent: Dependent }> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const idx = state.dependents.findIndex(
    (d) => d.id === id && d.ownerId === membershipNumber
  );
  if (idx === -1) throw new Error('المستفيد غير موجود.');
  state.dependents[idx] = { ...state.dependents[idx], active };
  writeState(state);
  return { dependent: state.dependents[idx] };
}

export async function staticDeleteDependent(token: string, id: string): Promise<void> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  state.dependents = state.dependents.filter(
    (d) => !(d.id === id && d.ownerId === membershipNumber)
  );
  writeState(state);
}

export async function staticCreateClaim(
  token: string,
  payload: {
    beneficiaryName: string;
    beneficiaryRelation: string;
    careType: string;
    providerName: string;
    careDate: string;
    totalAmount: number;
    estimatedReimbursement: number;
    notes: string;
  }
): Promise<{ claim: MedicalClaim }> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const member = state.roster.find((m) => m.membershipNumber === membershipNumber);
  if (!member) throw new Error('المنخرط غير موجود.');
  const created: MedicalClaim = {
    id: generateId('CLM'),
    ownerId: membershipNumber,
    memberName: member.fullName,
    membershipNumber,
    referenceCode: generateId('CLM').slice(0, 20),
    beneficiaryName: payload.beneficiaryName || member.fullName,
    beneficiaryRelation: payload.beneficiaryRelation || 'المنخرط الرئيسي',
    careType: payload.careType as MedicalClaim['careType'],
    providerName: payload.providerName.trim(),
    careDate: payload.careDate,
    totalAmount: Number(payload.totalAmount) || 0,
    estimatedReimbursement: Number(payload.estimatedReimbursement) || 0,
    approvedAmount: 0,
    status: 'قيد الدراسة',
    notes: payload.notes.trim(),
    reviewerNote: '',
  };
  state.claims.unshift(created);
  writeState(state);
  return { claim: created };
}

export async function staticUpdateClaim(
  token: string,
  id: string,
  payload: {
    providerName: string;
    careDate: string;
    totalAmount: number;
    estimatedReimbursement: number;
    notes: string;
  }
): Promise<{ claim: MedicalClaim }> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const idx = state.claims.findIndex(
    (c) => c.id === id && c.ownerId === membershipNumber
  );
  if (idx === -1) throw new Error('ملف المرض غير موجود.');
  state.claims[idx] = {
    ...state.claims[idx],
    providerName: payload.providerName.trim(),
    careDate: payload.careDate,
    totalAmount: Number(payload.totalAmount) || 0,
    estimatedReimbursement: Number(payload.estimatedReimbursement) || 0,
    notes: payload.notes.trim(),
    status: 'قيد الدراسة',
  };
  writeState(state);
  return { claim: state.claims[idx] };
}

export async function staticDeleteClaim(token: string, id: string): Promise<void> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  state.claims = state.claims.filter(
    (c) => !(c.id === id && c.ownerId === membershipNumber && c.status === 'قيد الدراسة')
  );
  writeState(state);
}

export async function staticCreateAuthorization(
  token: string,
  payload: {
    beneficiaryName: string;
    procedureType: string;
    facilityName: string;
    expectedDate: string;
    estimatedCost: number;
    notes: string;
  }
): Promise<{ authorization: AuthorizationRequest }> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  const member = state.roster.find((m) => m.membershipNumber === membershipNumber);
  if (!member) throw new Error('المنخرط غير موجود.');
  const created: AuthorizationRequest = {
    id: generateId('PEC'),
    ownerId: membershipNumber,
    memberName: member.fullName,
    referenceCode: generateId('PEC').slice(0, 20),
    beneficiaryName: payload.beneficiaryName || member.fullName,
    procedureType: payload.procedureType as AuthorizationRequest['procedureType'],
    facilityName: payload.facilityName.trim(),
    expectedDate: payload.expectedDate,
    estimatedCost: Number(payload.estimatedCost) || 0,
    status: 'قيد الدراسة',
    notes: payload.notes.trim(),
    reviewerNote: '',
  };
  state.authorizations.unshift(created);
  writeState(state);
  return { authorization: created };
}

export async function staticDeleteAuthorization(
  token: string,
  id: string
): Promise<void> {
  const membershipNumber = parseStaticMemberToken(token);
  if (!membershipNumber) throw new Error('جلسة المنخرط غير صالحة.');
  const state = readState();
  state.authorizations = state.authorizations.filter(
    (a) => !(a.id === id && a.ownerId === membershipNumber && a.status === 'قيد الدراسة')
  );
  writeState(state);
}

// --- Admin Static Handlers ---
async function attachStaticQrSigs(
  list: StaticRosterEntry[]
): Promise<InternalRosterMember[]> {
  return Promise.all(
    list.map(async (item) => ({
      ...item,
      cardQrSig: await computeStaticCardSig(item.membershipNumber),
    }))
  );
}

export async function staticFetchAdminRoster(
  adminToken: string
): Promise<{ roster: InternalRosterMember[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  return { roster: await attachStaticQrSigs(state.roster) };
}

export async function staticAddAdminRosterMember(
  adminToken: string,
  member: InternalRosterMember
): Promise<{ roster: InternalRosterMember[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  if (
    state.roster.some(
      (m) => m.membershipNumber.toUpperCase() === member.membershipNumber.trim().toUpperCase()
    )
  ) {
    throw new Error('رقم الانخراط مسجل مسبقاً في الملف الداخلي.');
  }
  const code = member.accessCode.trim();
  const created: StaticRosterEntry = {
    ...member,
    accessCode: code,
    accessCodeHash: await sha256SaltedHex(code),
    enrollmentYear: member.enrollmentYear || String(new Date().getFullYear()),
  };
  state.roster.unshift(created);
  writeState(state);
  return { roster: await attachStaticQrSigs(state.roster) };
}

export async function staticUpdateAdminRosterMember(
  adminToken: string,
  membershipNumber: string,
  patch: Partial<InternalRosterMember>
): Promise<{ roster: InternalRosterMember[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const idx = state.roster.findIndex((m) => m.membershipNumber === membershipNumber);
  if (idx === -1) throw new Error('المنخرط غير موجود.');
  const nextAccessCode =
    patch.accessCode && patch.accessCode !== '••••••••'
      ? patch.accessCode.trim()
      : state.roster[idx].accessCode;
  state.roster[idx] = {
    ...state.roster[idx],
    ...patch,
    accessCode: nextAccessCode,
    accessCodeHash:
      patch.accessCode && patch.accessCode !== '••••••••'
        ? await sha256SaltedHex(patch.accessCode.trim())
        : state.roster[idx].accessCodeHash,
  };
  writeState(state);
  return { roster: await attachStaticQrSigs(state.roster) };
}

export async function staticDeleteAdminRosterMember(
  adminToken: string,
  membershipNumber: string
): Promise<{ roster: InternalRosterMember[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  state.roster = state.roster.filter((m) => m.membershipNumber !== membershipNumber);
  writeState(state);
  return { roster: await attachStaticQrSigs(state.roster) };
}

export async function staticImportAdminRoster(
  adminToken: string,
  roster: InternalRosterMember[]
): Promise<{ roster: InternalRosterMember[]; count: number }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const byNum = new Map(
    state.roster.map((m, i) => [m.membershipNumber.toUpperCase(), i])
  );
  let count = 0;
  for (const row of roster) {
    if (!row.membershipNumber || !row.fullName) continue;
    const entry: StaticRosterEntry = {
      ...row,
      accessCodeHash: row.accessCode ? await sha256SaltedHex(row.accessCode) : undefined,
    };
    const idx = byNum.get(row.membershipNumber.toUpperCase());
    if (idx === undefined) {
      state.roster.push(entry);
      byNum.set(row.membershipNumber.toUpperCase(), state.roster.length - 1);
    } else {
      state.roster[idx] = entry;
    }
    count += 1;
  }
  writeState(state);
  return { roster: await attachStaticQrSigs(state.roster), count };
}

export async function staticFetchAdminRecords(
  adminToken: string
): Promise<{ claims: MedicalClaim[]; authorizations: AuthorizationRequest[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  return { claims: state.claims, authorizations: state.authorizations };
}

export async function staticReviewAdminClaim(
  adminToken: string,
  id: string,
  payload: { status: ClaimStatus; approvedAmount: number; reviewerNote: string }
): Promise<{ claim: MedicalClaim }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const idx = state.claims.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('ملف المرض غير موجود.');
  state.claims[idx] = {
    ...state.claims[idx],
    status: payload.status,
    approvedAmount: payload.status === 'مرفوض' ? 0 : Math.max(0, payload.approvedAmount),
    reviewerNote: payload.reviewerNote,
  };
  writeState(state);
  return { claim: state.claims[idx] };
}

export async function staticReviewAdminAuth(
  adminToken: string,
  id: string,
  payload: { status: AuthorizationStatus; reviewerNote: string }
): Promise<{ authorization: AuthorizationRequest }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const idx = state.authorizations.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('طلب التكفل غير موجود.');
  state.authorizations[idx] = {
    ...state.authorizations[idx],
    status: payload.status,
    reviewerNote: payload.reviewerNote,
  };
  writeState(state);
  return { authorization: state.authorizations[idx] };
}

export async function staticFetchWilayaOffices(): Promise<{ offices: WilayaOffice[] }> {
  return { offices: readState().wilayas };
}

export async function staticSaveAdminWilayaOffice(
  adminToken: string,
  code: string,
  payload: Omit<WilayaOffice, 'code' | 'updatedAt'>
): Promise<{ office: WilayaOffice; offices: WilayaOffice[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const idx = state.wilayas.findIndex((w) => w.code === code);
  if (idx === -1) throw new Error('الولاية غير موجودة.');
  state.wilayas[idx] = {
    ...state.wilayas[idx],
    ...payload,
    code,
    updatedAt: new Date().toISOString(),
  };
  writeState(state);
  return { office: state.wilayas[idx], offices: state.wilayas };
}

export async function staticClearAdminWilayaOffice(
  adminToken: string,
  code: string
): Promise<{ offices: WilayaOffice[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const idx = state.wilayas.findIndex((w) => w.code === code);
  if (idx === -1) throw new Error('الولاية غير موجودة.');
  state.wilayas[idx] = {
    ...state.wilayas[idx],
    officeName: '',
    representativeName: '',
    phone: '',
    accountInfo: '',
    socialUrl: '',
    address: '',
    googleMapsUrl: '',
    secondaryMapsUrl: '',
    lat: undefined,
    lng: undefined,
    updatedAt: new Date().toISOString(),
  };
  writeState(state);
  return { offices: state.wilayas };
}

export async function staticImportAdminWilayaOffices(
  adminToken: string,
  offices: Array<Partial<WilayaOffice> & { code: string }>
): Promise<{ offices: WilayaOffice[]; count: number }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  let count = 0;
  for (const item of offices) {
    const idx = state.wilayas.findIndex((w) => w.code === item.code);
    if (idx !== -1) {
      state.wilayas[idx] = {
        ...state.wilayas[idx],
        ...item,
        updatedAt: new Date().toISOString(),
      };
      count += 1;
    }
  }
  writeState(state);
  return { offices: state.wilayas, count };
}

function toWilayaHeadAccount(
  head: StaticWilayaHeadEntry,
  office: WilayaOffice
): WilayaHeadAccount {
  return {
    wilayaCode: head.wilayaCode,
    wilayaName: office.wilayaName,
    username: head.username,
    fullName: head.fullName || office.representativeName || '',
    title: head.title || office.headTitle || `رئيس التعاضدية الولائية — ${office.wilayaName}`,
    phone: head.phone || office.phone || '',
    email: head.email || '',
    officeName: office.officeName,
    accountInfo: office.accountInfo,
    socialUrl: office.socialUrl,
    address: office.address,
    googleMapsUrl: office.googleMapsUrl,
    secondaryMapsUrl: office.secondaryMapsUrl || '',
    lat: office.lat,
    lng: office.lng,
    status: head.status,
    hasPassword: Boolean(head.passwordHash),
    updatedAt: head.updatedAt || office.updatedAt || '',
  };
}

function isStaticCityInScope(city: string, code: string, wilayaName: string): boolean {
  const c = city.trim();
  if (!c) return false;
  if (c === wilayaName) return true;
  if (code === '16' && c.startsWith('الجزائر')) return true;
  if (
    (code === '70' || code === '71' || code === '72') &&
    (c === wilayaName || c === 'الجزائر' || c === 'الجزائر العاصمة')
  ) {
    return true;
  }
  return c.includes(wilayaName);
}

export async function staticFetchPublicWilayaHeadsMap(): Promise<{
  entries: PublicWilayaMapEntry[];
}> {
  const state = readState();
  const headByCode = new Map(state.wilayaHeads.map((h) => [h.wilayaCode, h]));
  return {
    entries: state.wilayas.map((office) => {
      const head = headByCode.get(office.code);
      return {
        code: office.code,
        wilayaName: office.wilayaName,
        officeName: office.officeName,
        representativeName: head?.fullName || office.representativeName || '',
        headTitle:
          head?.title || office.headTitle || `رئيس التعاضدية الولائية — ${office.wilayaName}`,
        headUsername: head?.username || `head${office.code}`,
        headStatus: head?.status || 'نشط',
        hasActiveAccount: Boolean(head?.passwordHash && head?.status === 'نشط'),
        phone: head?.phone || office.phone || '',
        email: head?.email || '',
        accountInfo: office.accountInfo,
        socialUrl: office.socialUrl,
        address: office.address,
        googleMapsUrl: office.googleMapsUrl,
        secondaryMapsUrl: office.secondaryMapsUrl || '',
        lat: office.lat,
        lng: office.lng,
        updatedAt: head?.updatedAt || office.updatedAt || '',
      };
    }),
  };
}

export async function staticLoginWilayaHead(
  username: string,
  password: string
): Promise<{ token: string; account: WilayaHeadAccount }> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanUser || !cleanPass) {
    throw new Error('يرجى إدخال اسم المستخدم والرقم السري للرئيس الولائي.');
  }
  const state = readState();
  const matched = state.wilayaHeads.find(
    (h) =>
      h.username.toLowerCase() === cleanUser ||
      h.wilayaCode === cleanUser.padStart(2, '0')
  );
  if (!matched || !matched.passwordHash) {
    throw new Error('بيانات الدخول غير صحيحة أو لم يتم تفعيل كلمة المرور لهذا الحساب بعد.');
  }
  const hash = await sha256SaltedHex(`WH:${matched.wilayaCode}:${cleanPass}`);
  if (hash !== matched.passwordHash) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
  }
  if (matched.status !== 'نشط') {
    throw new Error('تم تعليق حساب رئيس التعاضدية الولائية. يرجى مراجعة الإدارة المركزية.');
  }
  const office = state.wilayas.find((w) => w.code === matched.wilayaCode)!;
  return {
    token: `ghp-wilaya-head:${matched.wilayaCode}`,
    account: toWilayaHeadAccount(matched, office),
  };
}

export async function staticFetchWilayaHeadWorkspace(
  token: string
): Promise<WilayaHeadWorkspaceData> {
  const code = parseStaticWilayaHeadToken(token);
  if (!code) throw new Error('جلسة رئيس التعاضدية الولائية غير صالحة.');
  const state = readState();
  const head = state.wilayaHeads.find((h) => h.wilayaCode === code);
  const office = state.wilayas.find((w) => w.code === code);
  if (!head || !office) throw new Error('الحساب الولائي غير موجود.');
  const scopedMembers = state.roster.filter((m) =>
    isStaticCityInScope(m.city, office.code, office.wilayaName)
  );
  const memberNums = new Set(scopedMembers.map((m) => m.membershipNumber));
  const scopedClaims = state.claims.filter((c) => memberNums.has(c.ownerId));
  const scopedEnrollments = state.enrollments.filter((e) =>
    isStaticCityInScope(e.city, office.code, office.wilayaName)
  );
  const safeMembers = scopedMembers.map(({ accessCode: _omit, ...rest }) => rest);

  return {
    account: toWilayaHeadAccount(head, office),
    office,
    stats: {
      membersCount: safeMembers.length,
      activeMembersCount: safeMembers.filter((m) => m.status === 'نشط').length,
      claimsCount: scopedClaims.length,
      pendingClaimsCount: scopedClaims.filter(
        (c) => c.status === 'قيد الدراسة' || c.status === 'وثائق ناقصة'
      ).length,
      totalApprovedAmount: scopedClaims.reduce(
        (sum, c) => sum + (Number(c.approvedAmount) || 0),
        0
      ),
      enrollmentsCount: scopedEnrollments.length,
      pendingEnrollmentsCount: scopedEnrollments.filter(
        (e) => e.status === 'جاري التدقيق والموافقة'
      ).length,
    },
    warehouseSync: {
      fileName: 'national-members-warehouse.xlsx',
      lastSyncedAt: new Date().toISOString(),
      nationalTotalMembers: state.roster.length,
      wilayaSyncedMembers: safeMembers.length,
    },
    members: safeMembers,
    claims: scopedClaims,
    enrollments: scopedEnrollments,
  };
}

export async function staticUpdateWilayaHeadProfile(
  token: string,
  payload: Partial<WilayaHeadAccount>
): Promise<{ account: WilayaHeadAccount; office: WilayaOffice }> {
  const code = parseStaticWilayaHeadToken(token);
  if (!code) throw new Error('جلسة رئيس التعاضدية الولائية غير صالحة.');
  const state = readState();
  const hIdx = state.wilayaHeads.findIndex((h) => h.wilayaCode === code);
  const wIdx = state.wilayas.findIndex((w) => w.code === code);
  if (hIdx === -1 || wIdx === -1) throw new Error('الحساب غير موجود.');
  const now = new Date().toISOString();
  const fullName = payload.fullName?.trim() ?? state.wilayaHeads[hIdx].fullName;
  const title = payload.title?.trim() || state.wilayaHeads[hIdx].title;
  const phone = payload.phone?.trim() ?? state.wilayaHeads[hIdx].phone;
  const email = payload.email?.trim() ?? state.wilayaHeads[hIdx].email;

  state.wilayaHeads[hIdx] = {
    ...state.wilayaHeads[hIdx],
    fullName,
    title,
    phone,
    email,
    updatedAt: now,
  };
  state.wilayas[wIdx] = {
    ...state.wilayas[wIdx],
    officeName: payload.officeName?.trim() ?? state.wilayas[wIdx].officeName,
    representativeName: fullName,
    headTitle: title,
    phone,
    accountInfo: payload.accountInfo?.trim() ?? state.wilayas[wIdx].accountInfo,
    socialUrl: payload.socialUrl?.trim() ?? state.wilayas[wIdx].socialUrl,
    address: payload.address?.trim() ?? state.wilayas[wIdx].address,
    googleMapsUrl: payload.googleMapsUrl?.trim() ?? state.wilayas[wIdx].googleMapsUrl,
    secondaryMapsUrl: payload.secondaryMapsUrl?.trim() ?? state.wilayas[wIdx].secondaryMapsUrl,
    lat: typeof payload.lat === 'number' ? payload.lat : state.wilayas[wIdx].lat,
    lng: typeof payload.lng === 'number' ? payload.lng : state.wilayas[wIdx].lng,
    updatedAt: now,
  };
  writeState(state);
  return {
    account: toWilayaHeadAccount(state.wilayaHeads[hIdx], state.wilayas[wIdx]),
    office: state.wilayas[wIdx],
  };
}

export async function staticChangeWilayaHeadPassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean }> {
  const code = parseStaticWilayaHeadToken(token);
  if (!code) throw new Error('جلسة رئيس التعاضدية الولائية غير صالحة.');
  const state = readState();
  const hIdx = state.wilayaHeads.findIndex((h) => h.wilayaCode === code);
  if (hIdx === -1) throw new Error('الحساب غير موجود.');
  const expected = await sha256SaltedHex(`WH:${code}:${currentPassword.trim()}`);
  if (expected !== state.wilayaHeads[hIdx].passwordHash) {
    throw new Error('كلمة المرور الحالية غير صحيحة.');
  }
  state.wilayaHeads[hIdx] = {
    ...state.wilayaHeads[hIdx],
    passwordHash: await sha256SaltedHex(`WH:${code}:${newPassword.trim()}`),
    updatedAt: new Date().toISOString(),
  };
  writeState(state);
  return { ok: true };
}

export async function staticFetchAdminWilayaHeads(
  adminToken: string
): Promise<{ accounts: WilayaHeadAccount[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const officeByCode = new Map(state.wilayas.map((w) => [w.code, w]));
  return {
    accounts: state.wilayaHeads.map((h) =>
      toWilayaHeadAccount(h, officeByCode.get(h.wilayaCode)!)
    ),
  };
}

export async function staticSaveAdminWilayaHead(
  adminToken: string,
  code: string,
  payload: Partial<WilayaHeadAccount> & { password?: string }
): Promise<{ account: WilayaHeadAccount; accounts: WilayaHeadAccount[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const hIdx = state.wilayaHeads.findIndex((h) => h.wilayaCode === code);
  const wIdx = state.wilayas.findIndex((w) => w.code === code);
  if (hIdx === -1 || wIdx === -1) throw new Error('الولاية غير موجودة.');
  const now = new Date().toISOString();
  const nextUsername =
    payload.username?.trim().toLowerCase() || state.wilayaHeads[hIdx].username;
  if (
    state.wilayaHeads.some(
      (h) => h.wilayaCode !== code && h.username.toLowerCase() === nextUsername
    )
  ) {
    throw new Error('اسم المستخدم مستخدم من قبل ولاية أخرى.');
  }
  let nextHash = state.wilayaHeads[hIdx].passwordHash;
  if (payload.password && payload.password.trim().length >= 6) {
    nextHash = await sha256SaltedHex(`WH:${code}:${payload.password.trim()}`);
  }
  const fullName = payload.fullName?.trim() ?? state.wilayaHeads[hIdx].fullName;
  const title = payload.title?.trim() || state.wilayaHeads[hIdx].title;
  const phone = payload.phone?.trim() ?? state.wilayaHeads[hIdx].phone;
  state.wilayaHeads[hIdx] = {
    ...state.wilayaHeads[hIdx],
    username: nextUsername,
    fullName,
    title,
    phone,
    email: payload.email?.trim() ?? state.wilayaHeads[hIdx].email,
    status: payload.status === 'معلق' ? 'معلق' : 'نشط',
    passwordHash: nextHash,
    updatedAt: now,
  };
  state.wilayas[wIdx] = {
    ...state.wilayas[wIdx],
    officeName: payload.officeName?.trim() ?? state.wilayas[wIdx].officeName,
    representativeName: fullName,
    headTitle: title,
    phone,
    accountInfo: payload.accountInfo?.trim() ?? state.wilayas[wIdx].accountInfo,
    socialUrl: payload.socialUrl?.trim() ?? state.wilayas[wIdx].socialUrl,
    address: payload.address?.trim() ?? state.wilayas[wIdx].address,
    googleMapsUrl: payload.googleMapsUrl?.trim() ?? state.wilayas[wIdx].googleMapsUrl,
    secondaryMapsUrl: payload.secondaryMapsUrl?.trim() ?? state.wilayas[wIdx].secondaryMapsUrl,
    lat: typeof payload.lat === 'number' ? payload.lat : state.wilayas[wIdx].lat,
    lng: typeof payload.lng === 'number' ? payload.lng : state.wilayas[wIdx].lng,
    updatedAt: now,
  };
  writeState(state);
  const officeByCode = new Map(state.wilayas.map((w) => [w.code, w]));
  return {
    account: toWilayaHeadAccount(state.wilayaHeads[hIdx], state.wilayas[wIdx]),
    accounts: state.wilayaHeads.map((h) =>
      toWilayaHeadAccount(h, officeByCode.get(h.wilayaCode)!)
    ),
  };
}

export async function staticBulkProvisionWilayaHeads(
  adminToken: string,
  mode: 'missing_only' | 'reset_all' = 'missing_only'
): Promise<{
  provisionedCount: number;
  credentials: WilayaHeadProvisionedCredential[];
  accounts: WilayaHeadAccount[];
}> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const officeByCode = new Map(state.wilayas.map((w) => [w.code, w]));
  const now = new Date().toISOString();
  const credentials: WilayaHeadProvisionedCredential[] = [];

  for (let i = 0; i < state.wilayaHeads.length; i += 1) {
    const cur = state.wilayaHeads[i];
    if (mode !== 'reset_all' && cur.passwordHash) continue;
    const rand = Math.floor(100000 + Math.random() * 899999).toString();
    const plain = `MT-${cur.wilayaCode}-${rand}`;
    const office = officeByCode.get(cur.wilayaCode)!;
    state.wilayaHeads[i] = {
      ...cur,
      status: 'نشط',
      passwordHash: await sha256SaltedHex(`WH:${cur.wilayaCode}:${plain}`),
      updatedAt: now,
    };
    credentials.push({
      wilayaCode: cur.wilayaCode,
      wilayaName: office.wilayaName,
      username: state.wilayaHeads[i].username,
      password: plain,
      fullName: state.wilayaHeads[i].fullName || office.representativeName || '',
    });
  }

  writeState(state);
  return {
    provisionedCount: credentials.length,
    credentials,
    accounts: state.wilayaHeads.map((h) =>
      toWilayaHeadAccount(h, officeByCode.get(h.wilayaCode)!)
    ),
  };
}

export async function staticSubmitEnrollment(payload: {
  fullName: string;
  socialSecurityNumber: string;
  nationalId: string;
  gender: MemberGender;
  seniorityYears: number;
  birthDate: string;
  phone: string;
  email: string;
  sector: string;
  city: string;
  municipality: string;
  workplace: string;
  rib: string;
  coveragePlan: CoveragePlan;
  notes: string;
}): Promise<{
  enrollment: {
    id: string;
    trackingCode: string;
    fullName: string;
    status: EnrollmentStatus;
    statusMessage: string;
    createdAt: string;
  };
}> {
  const state = readState();
  const now = new Date().toISOString();
  const trackingCode = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const statusMessage = 'جاري ميزة التدقيق في الانخراط والموافقة من طرف الإدارة';
  const record: IndividualEnrollment = {
    id: generateId('ENR'),
    trackingCode,
    fullName: payload.fullName.trim(),
    socialSecurityNumber: payload.socialSecurityNumber.trim(),
    nationalId: payload.nationalId.trim(),
    gender: payload.gender,
    seniorityYears: payload.seniorityYears,
    birthDate: payload.birthDate,
    phone: payload.phone.trim(),
    email: payload.email.trim() || 'member@mutnatec.dz',
    sector: payload.sector,
    city: payload.city,
    municipality: payload.municipality.trim() || payload.city,
    workplace: payload.workplace.trim(),
    rib: payload.rib.trim(),
    coveragePlan: payload.coveragePlan,
    notes: payload.notes.trim(),
    status: 'جاري التدقيق والموافقة',
    statusMessage,
    assignedMembershipNumber: '',
    assignedAccessCode: '',
    reviewerNote: '',
    createdAt: now,
    updatedAt: now,
  };
  state.enrollments.push(record);
  writeState(state);
  return {
    enrollment: {
      id: record.id,
      trackingCode: record.trackingCode,
      fullName: record.fullName,
      status: record.status,
      statusMessage: record.statusMessage,
      createdAt: record.createdAt,
    },
  };
}

export async function staticCheckEnrollment(payload: {
  trackingCode: string;
  nationalId: string;
}): Promise<{
  enrollment: {
    trackingCode: string;
    fullName: string;
    city: string;
    coveragePlan: CoveragePlan;
    status: EnrollmentStatus;
    statusMessage: string;
    reviewerNote: string;
    assignedMembershipNumber: string;
    updatedAt: string;
  };
}> {
  const state = readState();
  const code = payload.trackingCode.trim().toUpperCase();
  const nin = payload.nationalId.replace(/\s+/g, '');
  const found = state.enrollments.find(
    (e) =>
      e.trackingCode.toUpperCase() === code &&
      (e.nationalId === nin || e.socialSecurityNumber === nin)
  );
  if (!found) {
    throw new Error('لم يتم العثور على طلب انخراط مطابق لهذه المعطيات.');
  }
  return {
    enrollment: {
      trackingCode: found.trackingCode,
      fullName: found.fullName,
      city: found.city,
      coveragePlan: found.coveragePlan,
      status: found.status,
      statusMessage: found.statusMessage,
      reviewerNote: found.reviewerNote,
      assignedMembershipNumber: found.assignedMembershipNumber,
      updatedAt: found.updatedAt,
    },
  };
}

export async function staticFetchAdminEnrollments(
  adminToken: string
): Promise<{ enrollments: IndividualEnrollment[] }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  return {
    enrollments: [...state.enrollments].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    ),
  };
}

export async function staticReviewAdminEnrollment(
  adminToken: string,
  id: string,
  payload: {
    status: EnrollmentStatus;
    reviewerNote: string;
    assignedMembershipNumber?: string;
    assignedAccessCode?: string;
  }
): Promise<{ enrollment: IndividualEnrollment }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const idx = state.enrollments.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('طلب الانخراط غير موجود.');
  const current = state.enrollments[idx];
  let membershipNum =
    payload.assignedMembershipNumber?.trim() || current.assignedMembershipNumber;
  let accessCode = payload.assignedAccessCode?.trim() || current.assignedAccessCode;

  if (payload.status === 'تمت الموافقة والتسجيل') {
    if (!membershipNum) {
      membershipNum = `MUT-2026-${Math.floor(2000 + Math.random() * 7999)}`;
    }
    if (!accessCode) {
      accessCode = String(Math.floor(100000 + Math.random() * 899999));
    }
    if (!state.roster.some((m) => m.membershipNumber === membershipNum)) {
      state.roster.unshift({
        membershipNumber: membershipNum,
        accessCode,
        accessCodeHash: await sha256SaltedHex(accessCode),
        fullName: current.fullName,
        email: current.email,
        nationalId: current.nationalId,
        socialSecurityNumber: current.socialSecurityNumber,
        birthDate: current.birthDate,
        birthPlace: current.city,
        jobTitle: current.sector,
        memberRole: 'منخرط نشط',
        enrollmentYear: String(new Date().getFullYear()),
        gender: current.gender || 'ذكر',
        seniorityYears: current.seniorityYears ?? 1,
        sector: current.sector,
        city: current.city,
        municipality: current.municipality || current.city,
        institution: current.workplace || current.sector,
        phone: current.phone,
        rib: current.rib,
        coveragePlan: current.coveragePlan,
        annualCeiling: 250000,
        status: 'نشط',
      });
    }
  }

  state.enrollments[idx] = {
    ...current,
    status: payload.status,
    statusMessage:
      payload.status === 'تمت الموافقة والتسجيل'
        ? 'تمت الموافقة على الانخراط وتفعيل البطاقة الرقمية'
        : payload.status === 'مرفوض / استكمال وثائق'
        ? 'يرجى استكمال الوثائق المطلوبة لدى المركز الولائي'
        : 'جاري ميزة التدقيق في الانخراط والموافقة من طرف الإدارة',
    reviewerNote: payload.reviewerNote,
    assignedMembershipNumber: membershipNum,
    assignedAccessCode: accessCode,
    updatedAt: new Date().toISOString(),
  };
  writeState(state);
  return { enrollment: state.enrollments[idx] };
}

function buildStaticExcelMeta(state: StaticDatabaseState): ExcelSyncMeta {
  const activeWilayas = state.wilayas.filter(
    (w) => Boolean(w.phone || w.address || w.googleMapsUrl)
  ).length;
  return {
    fileName: 'mutnatec-database-github-pages.xls',
    lastSyncedAt: state.lastSyncedAt,
    fileSizeBytes: JSON.stringify(state).length,
    syncedCounts: {
      roster: state.roster.length,
      claims: state.claims.length,
      authorizations: state.authorizations.length,
      enrollments: state.enrollments.length,
      dependents: state.dependents.length,
      wilayasActive: activeWilayas,
    },
  };
}

export async function staticFetchAdminReports(
  adminToken: string
): Promise<AdminReportsSummary> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const activeMembers = state.roster.filter((m) => m.status === 'نشط').length;
  const totalAnnualCeiling = state.roster.reduce(
    (sum, m) => sum + (Number(m.annualCeiling) || 0),
    0
  );
  const totalClaimedAmount = state.claims.reduce(
    (sum, c) => sum + (Number(c.totalAmount) || 0),
    0
  );
  const totalEstimatedAmount = state.claims.reduce(
    (sum, c) => sum + (Number(c.estimatedReimbursement) || 0),
    0
  );
  const totalApprovedAmount = state.claims.reduce(
    (sum, c) => sum + (Number(c.approvedAmount) || 0),
    0
  );
  const paidClaimsCount = state.claims.filter((c) => c.status === 'تم الصرف').length;
  const pendingClaimsCount = state.claims.filter(
    (c) => c.status === 'قيد الدراسة' || c.status === 'وثائق ناقصة'
  ).length;
  const pendingAuthorizationsCount = state.authorizations.filter(
    (a) => a.status === 'قيد الدراسة'
  ).length;
  const pendingEnrollmentsCount = state.enrollments.filter(
    (e) => e.status === 'جاري التدقيق والموافقة'
  ).length;
  const approvedEnrollmentsCount = state.enrollments.filter(
    (e) => e.status === 'تمت الموافقة والتسجيل'
  ).length;
  const activeWilayaCenters = state.wilayas.filter(
    (w) => Boolean(w.phone || w.address || w.googleMapsUrl)
  ).length;

  const byCareMap = new Map<
    string,
    { careType: string; claimsCount: number; totalClaimed: number; totalApproved: number }
  >();
  for (const c of state.claims) {
    const cur = byCareMap.get(c.careType) || {
      careType: c.careType,
      claimsCount: 0,
      totalClaimed: 0,
      totalApproved: 0,
    };
    cur.claimsCount += 1;
    cur.totalClaimed += Number(c.totalAmount) || 0;
    cur.totalApproved += Number(c.approvedAmount) || 0;
    byCareMap.set(c.careType, cur);
  }

  const byWilayaMap = new Map<
    string,
    { city: string; membersCount: number; claimsCount: number; totalApproved: number }
  >();
  for (const m of state.roster) {
    const cur = byWilayaMap.get(m.city) || {
      city: m.city,
      membersCount: 0,
      claimsCount: 0,
      totalApproved: 0,
    };
    cur.membersCount += 1;
    byWilayaMap.set(m.city, cur);
  }
  for (const c of state.claims) {
    const owner = state.roster.find((m) => m.membershipNumber === c.ownerId);
    const city = owner?.city || 'الجزائر العاصمة';
    const cur = byWilayaMap.get(city) || {
      city,
      membersCount: 0,
      claimsCount: 0,
      totalApproved: 0,
    };
    cur.claimsCount += 1;
    cur.totalApproved += Number(c.approvedAmount) || 0;
    byWilayaMap.set(city, cur);
  }

  const byMonthMap = new Map<
    string,
    { month: string; claimsCount: number; totalClaimed: number; totalApproved: number }
  >();
  for (const c of state.claims) {
    const month = c.careDate ? c.careDate.slice(0, 7) : '2026-01';
    const cur = byMonthMap.get(month) || {
      month,
      claimsCount: 0,
      totalClaimed: 0,
      totalApproved: 0,
    };
    cur.claimsCount += 1;
    cur.totalClaimed += Number(c.totalAmount) || 0;
    cur.totalApproved += Number(c.approvedAmount) || 0;
    byMonthMap.set(month, cur);
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalMembers: state.roster.length,
      activeMembers,
      pendingOrSuspendedMembers: state.roster.length - activeMembers,
      totalAnnualCeiling,
      totalClaims: state.claims.length,
      totalClaimedAmount,
      totalEstimatedAmount,
      totalApprovedAmount,
      paidClaimsCount,
      pendingClaimsCount,
      totalAuthorizations: state.authorizations.length,
      pendingAuthorizationsCount,
      totalEnrollments: state.enrollments.length,
      pendingEnrollmentsCount,
      approvedEnrollmentsCount,
      activeWilayaCenters,
    },
    byCareType: Array.from(byCareMap.values()),
    byWilaya: Array.from(byWilayaMap.values()),
    byMonth: Array.from(byMonthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    ),
    excelSync: buildStaticExcelMeta(state),
  };
}

export async function staticSyncExcel(
  adminToken: string
): Promise<{ excelSync: ExcelSyncMeta; reports: AdminReportsSummary }> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  writeState(state);
  const reports = await staticFetchAdminReports(adminToken);
  return { excelSync: reports.excelSync, reports };
}

export async function staticDownloadExcelBlob(adminToken: string): Promise<Blob> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const headers = [
    'رقم الانخراط',
    'الاسم واللقب',
    'الولاية',
    'البلدية',
    'المؤسسة',
    'القطاع',
    'الصيغة',
    'السقف السنوي',
    'الوضعية',
  ];
  const rows = state.roster.map((m) =>
    [
      m.membershipNumber,
      m.fullName,
      m.city,
      m.municipality || '',
      m.institution || '',
      m.sector,
      m.coveragePlan,
      String(m.annualCeiling),
      m.status,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

export async function staticFetchPublicMemberStats(): Promise<PublicMemberStats> {
  const state = readState();
  const roster = state.roster;
  let maleCount = 0;
  let femaleCount = 0;
  let totalSeniority = 0;
  const seniorityBuckets = new Map<string, number>([
    ['أقل من 5 سنوات', 0],
    ['5 إلى 10 سنوات', 0],
    ['11 إلى 20 سنة', 0],
    ['أكثر من 20 سنة', 0],
  ]);
  const muniMap = new Map<string, number>();
  const instMap = new Map<string, number>();

  for (const m of roster) {
    if (m.gender === 'أنثى') femaleCount += 1;
    else maleCount += 1;
    const yrs = Math.max(0, Number(m.seniorityYears) || 0);
    totalSeniority += yrs;
    if (yrs < 5) seniorityBuckets.set('أقل من 5 سنوات', (seniorityBuckets.get('أقل من 5 سنوات') || 0) + 1);
    else if (yrs <= 10) seniorityBuckets.set('5 إلى 10 سنوات', (seniorityBuckets.get('5 إلى 10 سنوات') || 0) + 1);
    else if (yrs <= 20) seniorityBuckets.set('11 إلى 20 سنة', (seniorityBuckets.get('11 إلى 20 سنة') || 0) + 1);
    else seniorityBuckets.set('أكثر من 20 سنة', (seniorityBuckets.get('أكثر من 20 سنة') || 0) + 1);

    const muni = (m.municipality || m.city || 'غير محدد').trim();
    muniMap.set(muni, (muniMap.get(muni) || 0) + 1);
    const inst = (m.institution || m.sector || 'غير محدد').trim();
    instMap.set(inst, (instMap.get(inst) || 0) + 1);
  }

  return {
    totalMembers: roster.length,
    averageSeniorityYears:
      roster.length > 0 ? Math.round((totalSeniority / roster.length) * 10) / 10 : 0,
    municipalitiesCount: muniMap.size,
    institutionsCount: instMap.size,
    byGender: [
      { name: 'ذكور', count: maleCount },
      { name: 'إناث', count: femaleCount },
    ],
    bySeniority: Array.from(seniorityBuckets.entries()).map(([name, count]) => ({
      name,
      count,
    })),
    byMunicipality: Array.from(muniMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    byInstitution: Array.from(instMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}

export async function staticVerifyCardQr(
  membershipNumber: string,
  sig: string
): Promise<CardVerificationResult> {
  const cleanNum = membershipNumber.trim().toUpperCase();
  const cleanSig = sig.trim().toUpperCase();
  const state = readState();
  const matched = state.roster.find(
    (m) => m.membershipNumber.toUpperCase() === cleanNum
  );
  if (!matched) {
    throw new Error('بطاقة الانخراط غير مسجلة في السجل.');
  }
  const expected = await computeStaticCardSig(matched.membershipNumber);
  if (cleanSig !== expected) {
    throw new Error('التوقيع الرقمي لرمز QR غير مطابق.');
  }
  return {
    valid: matched.status === 'نشط',
    membershipNumber: matched.membershipNumber,
    fullName: matched.fullName,
    city: matched.city,
    municipality: matched.municipality || matched.city,
    institution: matched.institution || matched.sector,
    sector: matched.sector,
    coveragePlan: matched.coveragePlan,
    status: matched.status as MemberStatus,
    enrollmentYear: matched.enrollmentYear || '2026',
    accreditationNumber: '96 / 04',
    verifiedAt: new Date().toISOString(),
  };
}

export async function staticExportWilayaBackup(token: string): Promise<Blob> {
  const code = parseStaticWilayaHeadToken(token);
  if (!code) throw new Error('جلسة رئيس التعاضدية الولائية غير صالحة.');
  const state = readState();
  const office = state.wilayas.find((w) => w.code === code)!;
  const head = state.wilayaHeads.find((h) => h.wilayaCode === code)!;
  const scopedMembers = state.roster
    .filter((m) => isStaticCityInScope(m.city, office.code, office.wilayaName))
    .map(({ accessCode: _omit, ...rest }) => rest);
  const memberNums = new Set(scopedMembers.map((m) => m.membershipNumber));
  const payload = {
    format: 'mutnatec-wilaya-backup-v1',
    wilayaCode: code,
    wilayaName: office.wilayaName,
    exportedAt: new Date().toISOString(),
    office,
    headProfile: {
      fullName: head.fullName,
      title: head.title,
      phone: head.phone,
      email: head.email,
    },
    members: scopedMembers,
    dependents: state.dependents.filter((d) => memberNums.has(d.ownerId)),
    claims: state.claims.filter((c) => memberNums.has(c.ownerId)),
    authorizations: state.authorizations.filter((a) => memberNums.has(a.ownerId)),
    enrollments: state.enrollments.filter((e) =>
      isStaticCityInScope(e.city, office.code, office.wilayaName)
    ),
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}

export async function staticRestoreWilayaBackup(
  token: string,
  backup: unknown,
  mode: 'merge' | 'replace_wilaya' = 'merge'
): Promise<WilayaBackupRestoreResponse> {
  const code = parseStaticWilayaHeadToken(token);
  if (!code) throw new Error('جلسة رئيس التعاضدية الولائية غير صالحة.');
  if (!backup || typeof backup !== 'object') {
    throw new Error('ملف النسخة الاحتياطية غير صالح.');
  }
  const raw = backup as Record<string, unknown>;
  if (raw.format !== 'mutnatec-wilaya-backup-v1' || raw.wilayaCode !== code) {
    throw new Error('صيغة النسخة الاحتياطية لا تطابق حساب هذه الولاية.');
  }

  const state = readState();
  const office = state.wilayas.find((w) => w.code === code)!;
  const otherRoster = state.roster.filter(
    (m) => !isStaticCityInScope(m.city, office.code, office.wilayaName)
  );
  const existingByNum = new Map(
    state.roster.map((m) => [m.membershipNumber.toUpperCase(), m])
  );
  const incomingMembers = Array.isArray(raw.members)
    ? (raw.members as InternalRosterMember[])
    : [];
  const restoredMembers = incomingMembers.map((m) => ({
    ...m,
    city: office.wilayaName,
    accessCode: existingByNum.get(m.membershipNumber.toUpperCase())?.accessCode || '123456',
  }));

  if (mode === 'replace_wilaya') {
    state.roster = [...restoredMembers, ...otherRoster];
  } else {
    const map = new Map(state.roster.map((m) => [m.membershipNumber.toUpperCase(), m]));
    for (const m of restoredMembers) {
      map.set(m.membershipNumber.toUpperCase(), m);
    }
    state.roster = Array.from(map.values());
  }

  writeState(state);
  const workspace = await staticFetchWilayaHeadWorkspace(token);
  return {
    restored: {
      membersCount: restoredMembers.length,
      claimsCount: Array.isArray(raw.claims) ? raw.claims.length : 0,
      dependentsCount: Array.isArray(raw.dependents) ? raw.dependents.length : 0,
      authorizationsCount: Array.isArray(raw.authorizations)
        ? raw.authorizations.length
        : 0,
      enrollmentsCount: Array.isArray(raw.enrollments) ? raw.enrollments.length : 0,
    },
    workspace,
  };
}

export async function staticExportWilayaExcelBlob(token: string): Promise<Blob> {
  const workspace = await staticFetchWilayaHeadWorkspace(token);
  const headers = ['رمز الولاية', 'الولاية', 'رقم الانخراط', 'الاسم واللقب', 'الهاتف', 'الوضعية'];
  const rows = workspace.members.map((m) =>
    [workspace.office.code, m.city, m.membershipNumber, m.fullName, m.phone, m.status].join(',')
  );
  return new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
}

export async function staticFetchNationalWarehouseMeta(
  adminToken: string
): Promise<NationalWarehouseMeta> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const byWilaya = state.wilayas.map((w) => {
    const members = state.roster.filter((m) =>
      isStaticCityInScope(m.city, w.code, w.wilayaName)
    );
    const nums = new Set(members.map((m) => m.membershipNumber));
    const claims = state.claims.filter((c) => nums.has(c.ownerId));
    return {
      code: w.code,
      wilayaName: w.wilayaName,
      officeName: w.officeName,
      headName: w.representativeName,
      phone: w.phone,
      membersCount: members.length,
      activeMembersCount: members.filter((m) => m.status === 'نشط').length,
      claimsCount: claims.length,
      enrollmentsCount: state.enrollments.filter((e) =>
        isStaticCityInScope(e.city, w.code, w.wilayaName)
      ).length,
      totalAnnualCeiling: members.reduce((s, m) => s + (Number(m.annualCeiling) || 0), 0),
      totalApprovedAmount: claims.reduce((s, c) => s + (Number(c.approvedAmount) || 0), 0),
    };
  });
  return {
    fileName: 'national-members-warehouse.xlsx',
    lastSyncedAt: new Date().toISOString(),
    fileSizeBytes: 24576,
    totalMembers: state.roster.length,
    activeMembers: state.roster.filter((m) => m.status === 'نشط').length,
    totalWilayas: state.wilayas.length,
    populatedWilayas: byWilaya.filter((b) => b.membersCount > 0).length,
    byWilaya,
  };
}

export async function staticDownloadNationalWarehouseBlob(adminToken: string): Promise<Blob> {
  return staticDownloadExcelBlob(adminToken);
}

export async function staticDownloadAdminWilayaExcelBlob(
  adminToken: string,
  code: string
): Promise<Blob> {
  if (!parseStaticAdminToken(adminToken)) throw new Error('جلسة الإدارة غير صالحة.');
  const state = readState();
  const office = state.wilayas.find((w) => w.code === code.padStart(2, '0'));
  if (!office) throw new Error('الولاية غير موجودة.');
  const members = state.roster.filter((m) =>
    isStaticCityInScope(m.city, office.code, office.wilayaName)
  );
  const headers = ['رمز الولاية', 'الولاية', 'رقم الانخراط', 'الاسم واللقب', 'الوضعية'];
  const rows = members.map((m) =>
    [office.code, m.city, m.membershipNumber, m.fullName, m.status].join(',')
  );
  return new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
}
