import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  buildWilayaMembersWorkbookBuffer,
  computeReportsData,
  getExcelPaths,
  getNationalWarehousePaths,
  parseExcelImportWorkbook,
  parseWarehouseOrWilayaMembersExcel,
  readExcelSyncMeta,
  readNationalWarehouseMeta,
  syncExcelDatabaseWorkbook,
  type DatabaseSnapshot,
} from './server/excelDatabase.ts';

const PORT = 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const ROSTER_FILE = path.join(DATA_DIR, 'internal-members.json');
const RECORDS_FILE = path.join(DATA_DIR, 'internal-records.json');
const WILAYAS_FILE = path.join(DATA_DIR, 'wilaya-offices.json');
const WILAYA_HEADS_FILE = path.join(DATA_DIR, 'wilaya-heads.json');
const ENROLLMENTS_FILE = path.join(DATA_DIR, 'enrollments.json');

const DEFAULT_ADMIN_USER = 'habrinaas';
const DEFAULT_ADMIN_SALT = 'mutnatec_admin_2026_salt';
const DEFAULT_ADMIN_SCRYPT_HEX =
  '30d8121ddf8ec245a7850566d5f42d9b7e6198c94a4ae954282e55a0f9851227d35a9a27b2006e753c4722c3ab4912bbafa7a8aff3ec49f64b3834d497cdc15a';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_PLANS = new Set([
  'التغطية الأساسية الشاملة',
  'التغطية التكميلية+',
  'التغطية العائلية المميزة',
]);

const VALID_MEMBER_STATUSES = new Set(['نشط', 'قيد المراجعة', 'معلق']);
const VALID_RELATIONSHIPS = new Set(['الزوج/الزوجة', 'ابن/ابنة', 'أحد الوالدين']);
const VALID_CARE_TYPES = new Set([
  'الطب العام والأدوية',
  'طب الأسنان',
  'البصريات والنظارات',
  'التحاليل والأشعة',
  'الاستشفاء والجراحة',
  'الولادة والأمومة',
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
]);

const VALID_CLAIM_STATUSES = new Set([
  'قيد الدراسة',
  'تمت الموافقة',
  'تم الصرف',
  'وثائق ناقصة',
  'مرفوض',
]);

const VALID_PROCEDURE_TYPES = new Set([
  'استشفاء وجراحة',
  'فحص بالرنين المغناطيسي / السكانير',
  'تركيبات وتقويم الأسنان',
  'علاج الأمراض المزمنة',
  'ترويض طبي متخصص',
]);

const VALID_AUTH_STATUSES = new Set(['قيد الدراسة', 'موافق عليه', 'مرفوض']);

interface InternalRosterRecord {
  membershipNumber: string;
  accessCode: string;
  fullName: string;
  email: string;
  nationalId: string;
  socialSecurityNumber?: string;
  birthDate?: string;
  birthPlace?: string;
  jobTitle?: string;
  memberRole?: string;
  enrollmentYear?: string;
  gender?: 'ذكر' | 'أنثى';
  seniorityYears?: number;
  sector: string;
  city: string;
  municipality?: string;
  institution?: string;
  phone: string;
  rib: string;
  coveragePlan: string;
  annualCeiling: number;
  status: string;
  notes?: string;
}

interface InternalDependentRecord {
  id: string;
  ownerId: string;
  fullName: string;
  relationship: string;
  birthDate: string;
  coverageCode: string;
  active: boolean;
}

interface InternalClaimRecord {
  id: string;
  ownerId: string;
  memberName: string;
  membershipNumber: string;
  referenceCode: string;
  beneficiaryName: string;
  beneficiaryRelation: string;
  careType: string;
  providerName: string;
  careDate: string;
  totalAmount: number;
  estimatedReimbursement: number;
  approvedAmount: number;
  status: string;
  notes: string;
  reviewerNote: string;
}

interface InternalAuthRecord {
  id: string;
  ownerId: string;
  memberName: string;
  referenceCode: string;
  beneficiaryName: string;
  procedureType: string;
  facilityName: string;
  expectedDate: string;
  estimatedCost: number;
  status: string;
  notes: string;
  reviewerNote: string;
}

interface InternalRecordsStore {
  dependents: InternalDependentRecord[];
  claims: InternalClaimRecord[];
  authorizations: InternalAuthRecord[];
}

interface WilayaOfficeRecord {
  code: string;
  wilayaName: string;
  officeName: string;
  representativeName: string;
  headTitle?: string;
  phone: string;
  accountInfo: string;
  socialUrl: string;
  address: string;
  googleMapsUrl: string;
  secondaryMapsUrl?: string;
  lat?: number;
  lng?: number;
  updatedAt: string;
}

interface WilayaHeadRecord {
  wilayaCode: string;
  username: string;
  fullName: string;
  title: string;
  phone: string;
  email: string;
  status: 'نشط' | 'معلق';
  passwordSalt: string;
  passwordHash: string;
  updatedAt: string;
}

interface IndividualEnrollmentRecord {
  id: string;
  trackingCode: string;
  fullName: string;
  socialSecurityNumber?: string;
  nationalId: string;
  gender?: 'ذكر' | 'أنثى';
  seniorityYears?: number;
  birthDate: string;
  phone: string;
  email: string;
  sector: string;
  city: string;
  municipality?: string;
  workplace: string;
  rib: string;
  coveragePlan: string;
  notes: string;
  status: 'جاري التدقيق والموافقة' | 'تمت الموافقة والتسجيل' | 'مرفوض / استكمال وثائق';
  statusMessage: string;
  assignedMembershipNumber: string;
  assignedAccessCode: string;
  reviewerNote: string;
  createdAt: string;
  updatedAt: string;
}

const VALID_ENROLLMENT_STATUSES = new Set([
  'جاري التدقيق والموافقة',
  'تمت الموافقة والتسجيل',
  'مرفوض / استكمال وثائق',
]);

const DEFAULT_ENROLLMENT_AUDIT_MSG =
  'جاري ميزة التدقيق في الانخراط والموافقة من طرف الإدارة';

const SEEDED_PAYMENT_CENTERS: Record<
  string,
  { phone?: string; address?: string; googleMapsUrl: string; secondaryMapsUrl?: string }
> = {
  '01': {
    phone: '040 00 09 34',
    address: 'شارع الدين محمد بجانب مدرسة عائشة أم المؤمنين - ص.ب 378',
    googleMapsUrl: 'https://maps.app.goo.gl/AjoakCnfpXPyakQx5',
  },
  '02': {
    phone: '020 67 27 98',
    address: 'حي 38 مسكناً عدل، ص.ب رقم 36 - الشلف',
    googleMapsUrl: 'https://maps.app.goo.gl/9fhz1cZ2V84Yj4wH8',
  },
  '03': {
    phone: '028 74 99 53',
    address: 'محبوبي الحاج، ص.ب 515 وسط المدينة - الأغواط',
    googleMapsUrl: 'https://maps.app.goo.gl/vRy2H7J57R89Q9cw6',
  },
  '04': {
    phone: '039 44 56 89',
    address: 'حي الأضواء - أم البواقي',
    googleMapsUrl: 'https://maps.app.goo.gl/XhY1em12Sc4pBPHYA',
  },
  '05': {
    phone: '033 28 14 02',
    address: 'عمارة رقم 19، حي 1000 مسكن (عدل بوزوران) - باتنة',
    googleMapsUrl: 'https://share.google/6gCrLvUBil3qZeZYb',
  },
  '06': {
    phone: '044 22 23 30',
    address: 'متوسطة شهداء الإخوة بزتوت، حي أدرار - بجاية',
    googleMapsUrl: 'https://maps.app.goo.gl/FfpZAtsVb584s59Q7',
  },
  '07': {
    phone: '039 19 99 48',
    address: 'نهج الإخوة جزار، ص.ب 450 - بسكرة',
    googleMapsUrl: 'https://maps.app.goo.gl/64iGDjfSTU6ZFab79',
  },
  '08': {
    phone: '040 15 87 69',
    address: 'حي الجيباني رقم 234، البرقة - بشار',
    googleMapsUrl: 'https://maps.app.goo.gl/K2c2LMSVWWioB7aM6',
  },
  '09': {
    phone: '020 52 19 97',
    address: 'شارع الأخوة سالم زعبانة، ص/ب 15، مكتب بريد باب السبت',
    googleMapsUrl: 'https://maps.app.goo.gl/BkUC4UhkSNB3JvpL6',
  },
  '10': {
    phone: '026 72 43 13',
    address: 'حي عيقون علي، 132 مسكناً، عمارة (G)، عدل - البويرة',
    googleMapsUrl: 'https://maps.app.goo.gl/CEVEw9BdMY4ZqW8p7',
  },
  '11': {
    address: 'أمال مديرية التكوين المهني سرسوف، ص.ب 265 - تمنراست',
    googleMapsUrl: 'https://maps.app.goo.gl/FCxKXhzeE6Gunwk28',
  },
  '12': {
    phone: '030 21 40 83',
    address: 'حي 500 مسكن عدل، العمارة L، الطابق الأول - تبسة',
    googleMapsUrl: 'https://maps.app.goo.gl/9CRH4FFpZw9aamCx8',
  },
  '13': { googleMapsUrl: 'https://maps.app.goo.gl/LudMfLqy4Q3miiuV9' },
  '14': { googleMapsUrl: 'https://maps.app.goo.gl/fjv18uVbZdiYDQza9' },
  '15': { googleMapsUrl: 'https://maps.app.goo.gl/PvBdqCTJZ4HpXQ3F8' },
  '16': {
    googleMapsUrl: 'https://maps.app.goo.gl/RTR3VjVAz3JTSwgT6',
    secondaryMapsUrl: 'https://maps.app.goo.gl/fHYGzeiFkSjawSLL8',
  },
  '17': { googleMapsUrl: 'https://goo.gl/maps/qLtHXGtd1noNEr4n9' },
  '18': { googleMapsUrl: 'https://maps.app.goo.gl/tnR3QX7dyhQxtdCe6' },
  '19': { googleMapsUrl: 'https://maps.app.goo.gl/7NzogR8Gkn1sW4gU6' },
  '20': { googleMapsUrl: 'https://maps.app.goo.gl/LnEFjG8qx8dqV9tP9' },
  '21': { googleMapsUrl: 'https://maps.app.goo.gl/a8cYQQBL1X6Q5UfLA' },
  '22': { googleMapsUrl: 'https://maps.app.goo.gl/JH77rq43YjgKy4su8' },
  '23': { googleMapsUrl: 'https://maps.app.goo.gl/ZJULXPRWnXNn5Zzh6' },
  '24': { googleMapsUrl: 'https://goo.gl/maps/6m6zoQ9XkHgFWm4H6' },
  '25': {
    phone: '039 38 71 23',
    address: 'حي جواد الطاهر رقم 09 المنظر الجميل ص ب رقم 473',
    googleMapsUrl: 'https://maps.app.goo.gl/vqWbpqn3Hti83wkd8',
  },
  '26': {
    phone: '025 80 40 89',
    address: 'نهج الإخوة باشن مدرسة الشهيد طهراوي محمود (بلجباس سابقاً)',
    googleMapsUrl: 'https://maps.app.goo.gl/AWtHRoMMXHLpEi6r5',
  },
  '27': {
    phone: '045 41 31 39',
    address: '19 نهج بن عياد بن ذهيبة مستغانم ص ب 106',
    googleMapsUrl: 'https://maps.app.goo.gl/j2ea9DSzPPJfNjYe9',
  },
  '28': {
    phone: '035 33 65 22',
    address: 'حي 206 مسكن مقابل موقف الحافلات الحضرية، المسيلة',
    googleMapsUrl: 'https://maps.app.goo.gl/EBAkwH2Qaixz99mY7',
  },
  '29': {
    phone: '045 70 37 88',
    address: '400 مسكن، المنطقة 08، معسكر',
    googleMapsUrl: 'https://maps.app.goo.gl/9A1UGCki5jL1wetM7',
  },
  '30': {
    address: 'شارع لحراش بشير، ورقلة',
    googleMapsUrl: 'https://maps.app.goo.gl/ot52mCoECa2GGHxs9',
  },
  '31': {
    phone: '042 06 73 98',
    address: '10 شارع عبان رمضان، مقابل نادي مولودية وهران القديم (فيلق الصيادين)، وسط وهران',
    googleMapsUrl: 'https://maps.app.goo.gl/eqCYwMtDfJiuWtqi7',
  },
  '32': {
    phone: '049 61 36 71',
    address: 'مركز الدفع لولاية البيض بالقرب من المدرسة الابتدائية النجاح وسط المدينة شارع الشهيد بالهواري برهيم',
    googleMapsUrl: 'https://maps.app.goo.gl/1hVNJNeXTeaG6Wa86?g_st=am',
  },
  '34': {
    phone: '039 68 07 84',
    address: 'مركز الدفع نهج هواري بومدين - برج بوعريريج',
    googleMapsUrl: 'https://maps.app.goo.gl/ZTF7SRSxbTKHugcQ9',
  },
  '35': {
    phone: '044 32 06 96',
    address: 'حي 93 مسكن عدل فرانتز فانون بومرداس',
    googleMapsUrl: 'https://maps.app.goo.gl/nV315fEUPdhQG2uJA',
  },
  '36': {
    phone: '030 38 64 32',
    address: 'مركز الدفع بالطارف حي 300 مسكن تساهمي عمارة 01 مدخل 04',
    googleMapsUrl: 'https://maps.app.goo.gl/7rYTCMq5xWXyGTVt5',
  },
  '37': {
    address: 'حي 32 قصابي تندوف',
    googleMapsUrl: 'https://maps.app.goo.gl/23o9mqRdweGnJtGA9',
  },
  '38': {
    phone: '040 87 30 12',
    address: 'مديرية التربية القديمة شارع 1 نوفمبر تيسمسيلت',
    googleMapsUrl: 'https://maps.app.goo.gl/iJ2ZeesjdTLB8ynQ9',
  },
  '39': {
    phone: '039 07 14 90',
    address: 'حي 17 أكتوبر بجانب ثانوية بوشوشة المختلطة',
    googleMapsUrl: 'https://maps.app.goo.gl/ias8XB6V8VpzKC3p8',
  },
  '40': {
    address: 'ص.ب رقم 265 النصر حي 90 سكن عمارة 8 طريق باتنة - ولاية خنشلة',
    googleMapsUrl: 'https://goo.gl/maps/zNNuosPQUtWiNWfu6',
  },
  '41': {
    phone: '039 55 73 98',
    address: 'حي أحمد لولو عمارة 55 سوق أهراس ص.ب 330',
    googleMapsUrl: 'https://maps.app.goo.gl/oy3VBDE9ZzVv5A52A',
  },
  '42': {
    phone: '044 90 68 48',
    address: 'حي 1700 مسكن عدل، القطعة 02، العمارة 16، الحديقة، تيبازة',
    googleMapsUrl: 'https://maps.app.goo.gl/MqmphLV89BDFsGGp8',
  },
  '43': {
    phone: '039 12 55 58',
    address: 'حي 500 مسكن، العمارة رقم 74، ميلة',
    googleMapsUrl: 'https://maps.app.goo.gl/gwWDPUpuiYPZpUDo8',
  },
  '44': {
    phone: '027 50 00 62',
    address: 'شارع قلواز محمد رقم 12 عين الدفلى',
    googleMapsUrl: 'https://maps.app.goo.gl/tVZqucTbXkaXuamAA',
  },
  '45': {
    phone: '049 56 10 25',
    address: 'شارع جبار قادة حي الإداري وسط المدينة العين الصفراء، النعامة',
    googleMapsUrl: 'https://maps.app.goo.gl/skSo2tvh38ncMNFW6',
  },
  '46': {
    phone: '040 11 28 14',
    address: 'مدرسة مولود فرعون، عين تموشنت، شارع أول نوفمبر',
    googleMapsUrl: 'https://maps.app.goo.gl/gpTK7c7nhGbRPU5v8',
  },
  '47': {
    phone: '029 28 68 31',
    address: 'شارع أول ماي - المركز متعدد الخدمات (وسط المدينة) وبالقرب من CNAS ص.ب رقم 453',
    googleMapsUrl: 'https://maps.app.goo.gl/rLdj2PKJDPnPxyXW7',
  },
  '48': {
    phone: '046 76 03 13',
    address: 'مركز الدفع غليزان حي ديار الورد',
    googleMapsUrl: 'https://maps.app.goo.gl/RYwtq5P4WrYvoPvr5',
  },
};

const OFFICIAL_58_WILAYAS = [
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

const ALGIERS_SECTOR_OFFICES: Record<string, string> = {
  '70': 'الجزائر وسط',
  '71': 'الجزائر غرب',
  '72': 'الجزائر شرق',
};

function buildDefaultWilayaOffices(): WilayaOfficeRecord[] {
  return Array.from({ length: 96 }, (_, index) => {
    const code = String(index + 1).padStart(2, '0');
    const wilayaName =
      OFFICIAL_58_WILAYAS[index] ??
      ALGIERS_SECTOR_OFFICES[code] ??
      `المقاطعة / الفرع الولائي ${code}`;
    const seeded = SEEDED_PAYMENT_CENTERS[code];
    return {
      code,
      wilayaName,
      officeName: seeded ? `مركز الدفع الولائي — ${wilayaName}` : '',
      representativeName: '',
      phone: seeded?.phone ?? '',
      accountInfo: '',
      socialUrl: '',
      address: seeded?.address ?? '',
      googleMapsUrl: seeded?.googleMapsUrl ?? '',
      secondaryMapsUrl: seeded?.secondaryMapsUrl ?? '',
      updatedAt: seeded ? '2026-01-01T00:00:00.000Z' : '',
    };
  });
}

function isValidWilayaCode(code: string): boolean {
  if (!/^\d{2}$/.test(code)) return false;
  const n = Number(code);
  return n >= 1 && n <= 96;
}

function sanitizeWebUrl(raw: unknown): { ok: boolean; value: string } {
  if (typeof raw !== 'string') return { ok: true, value: '' };
  const trimmed = raw.trim().slice(0, 500);
  if (!trimmed) return { ok: true, value: '' };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, value: '' };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, value: '' };
  }
}

function parseOptionalCoord(val: unknown, min: number, max: number): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  if (!Number.isFinite(num) || num < min || num > max) return undefined;
  return Math.round(num * 1000000) / 1000000;
}

function extractCoordsFromText(text: string): { lat: number; lng: number } | undefined {
  const patterns = [
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = parseOptionalCoord(m[1], -90, 90);
      const lng = parseOptionalCoord(m[2], -180, 180);
      if (lat !== undefined && lng !== undefined) return { lat, lng };
    }
  }
  return undefined;
}

const ALLOWED_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'www.google.com',
  'maps.google.com',
  'google.com',
  'share.google',
]);

async function resolveMapsRedirectCoords(
  rawUrl: string
): Promise<{ lat: number; lng: number } | undefined> {
  if (!rawUrl) return undefined;
  const direct = extractCoordsFromText(rawUrl);
  if (direct) return direct;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || !ALLOWED_MAPS_HOSTS.has(parsed.hostname.toLowerCase())) {
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const fromFinalUrl = extractCoordsFromText(resp.url || '');
    if (fromFinalUrl) return fromFinalUrl;
    const html = await resp.text().catch(() => '');
    return extractCoordsFromText(html.slice(0, 12000));
  } catch {
    return undefined;
  }
}

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ROSTER_FILE)) {
    fs.writeFileSync(ROSTER_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(
      RECORDS_FILE,
      JSON.stringify({ dependents: [], claims: [], authorizations: [] }, null, 2),
      'utf8'
    );
  }
  if (!fs.existsSync(WILAYAS_FILE)) {
    fs.writeFileSync(WILAYAS_FILE, JSON.stringify(buildDefaultWilayaOffices(), null, 2), 'utf8');
  }
  if (!fs.existsSync(WILAYA_HEADS_FILE)) {
    fs.writeFileSync(WILAYA_HEADS_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(ENROLLMENTS_FILE)) {
    fs.writeFileSync(ENROLLMENTS_FILE, '[]', 'utf8');
  }
}

function readRoster(): InternalRosterRecord[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(ROSTER_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InternalRosterRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRoster(roster: InternalRosterRecord[]) {
  ensureDataFiles();
  fs.writeFileSync(ROSTER_FILE, JSON.stringify(roster, null, 2), 'utf8');
  void triggerExcelSync();
}

function readRecords(): InternalRecordsStore {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(RECORDS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<InternalRecordsStore>;
    return {
      dependents: Array.isArray(parsed.dependents) ? parsed.dependents : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      authorizations: Array.isArray(parsed.authorizations) ? parsed.authorizations : [],
    };
  } catch {
    return { dependents: [], claims: [], authorizations: [] };
  }
}

function writeRecords(store: InternalRecordsStore) {
  ensureDataFiles();
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(store, null, 2), 'utf8');
  void triggerExcelSync();
}

function readWilayaOffices(): WilayaOfficeRecord[] {
  ensureDataFiles();
  const defaults = buildDefaultWilayaOffices();
  try {
    const raw = fs.readFileSync(WILAYAS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    const byCode = new Map<string, Partial<WilayaOfficeRecord>>();
    for (const entry of parsed) {
      if (entry && typeof entry === 'object' && typeof entry.code === 'string' && isValidWilayaCode(entry.code)) {
        byCode.set(entry.code, entry as Partial<WilayaOfficeRecord>);
      }
    }
    return defaults.map((base) => {
      const saved = byCode.get(base.code);
      if (!saved) return base;
      const hasUserEdits = Boolean(saved.updatedAt && saved.updatedAt !== '');
      const savedLat = parseOptionalCoord(saved.lat, -90, 90);
      const savedLng = parseOptionalCoord(saved.lng, -180, 180);
      return {
        code: base.code,
        wilayaName:
          typeof saved.wilayaName === 'string' &&
          saved.wilayaName.trim() &&
          (!saved.wilayaName.startsWith('المقاطعة / الفرع الولائي') ||
            base.wilayaName.startsWith('المقاطعة / الفرع الولائي'))
            ? saved.wilayaName.trim().slice(0, 80)
            : base.wilayaName,
        officeName:
          typeof saved.officeName === 'string' && saved.officeName.trim()
            ? saved.officeName.slice(0, 140)
            : hasUserEdits
            ? ''
            : base.officeName,
        representativeName:
          typeof saved.representativeName === 'string' ? saved.representativeName.slice(0, 120) : '',
        headTitle:
          typeof saved.headTitle === 'string' ? saved.headTitle.slice(0, 120) : undefined,
        phone:
          typeof saved.phone === 'string' && saved.phone.trim()
            ? saved.phone.slice(0, 60)
            : hasUserEdits
            ? ''
            : base.phone,
        accountInfo: typeof saved.accountInfo === 'string' ? saved.accountInfo.slice(0, 180) : '',
        socialUrl: sanitizeWebUrl(saved.socialUrl).value,
        address:
          typeof saved.address === 'string' && saved.address.trim()
            ? saved.address.slice(0, 220)
            : hasUserEdits
            ? ''
            : base.address,
        googleMapsUrl:
          sanitizeWebUrl(saved.googleMapsUrl).value ||
          (hasUserEdits ? '' : base.googleMapsUrl),
        secondaryMapsUrl:
          sanitizeWebUrl(saved.secondaryMapsUrl).value ||
          (hasUserEdits ? '' : base.secondaryMapsUrl || ''),
        ...(savedLat !== undefined && savedLng !== undefined ? { lat: savedLat, lng: savedLng } : {}),
        updatedAt: typeof saved.updatedAt === 'string' && saved.updatedAt ? saved.updatedAt : base.updatedAt,
      };
    });
  } catch {
    return defaults;
  }
}

function writeWilayaOffices(offices: WilayaOfficeRecord[]) {
  ensureDataFiles();
  fs.writeFileSync(WILAYAS_FILE, JSON.stringify(offices, null, 2), 'utf8');
  void triggerExcelSync();
}

function hashWilayaHeadPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyWilayaHeadPassword(password: string, salt: string, hashHex: string): boolean {
  if (!password || !salt || !hashHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(hashHex, 'hex');
    if (derived.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

function readWilayaHeads(): WilayaHeadRecord[] {
  ensureDataFiles();
  const offices = readWilayaOffices();
  let parsedList: Partial<WilayaHeadRecord>[] = [];
  try {
    const raw = fs.readFileSync(WILAYA_HEADS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) parsedList = parsed as Partial<WilayaHeadRecord>[];
  } catch {
    parsedList = [];
  }
  const byCode = new Map<string, Partial<WilayaHeadRecord>>();
  for (const row of parsedList) {
    if (row && typeof row.wilayaCode === 'string' && isValidWilayaCode(row.wilayaCode)) {
      byCode.set(row.wilayaCode, row);
    }
  }
  return offices.map((office) => {
    const saved = byCode.get(office.code);
    return {
      wilayaCode: office.code,
      username:
        typeof saved?.username === 'string' && saved.username.trim().length >= 3
          ? saved.username.trim().toLowerCase()
          : `head${office.code}`,
      fullName:
        typeof saved?.fullName === 'string'
          ? saved.fullName.trim().slice(0, 120)
          : office.representativeName || '',
      title:
        typeof saved?.title === 'string' && saved.title.trim()
          ? saved.title.trim().slice(0, 120)
          : office.headTitle || `رئيس التعاضدية الولائية — ${office.wilayaName}`,
      phone:
        typeof saved?.phone === 'string' && saved.phone.trim()
          ? saved.phone.trim().slice(0, 60)
          : office.phone || '',
      email:
        typeof saved?.email === 'string' ? saved.email.trim().slice(0, 160) : '',
      status: saved?.status === 'معلق' ? 'معلق' : 'نشط',
      passwordSalt: typeof saved?.passwordSalt === 'string' ? saved.passwordSalt : '',
      passwordHash: typeof saved?.passwordHash === 'string' ? saved.passwordHash : '',
      updatedAt: typeof saved?.updatedAt === 'string' ? saved.updatedAt : office.updatedAt || '',
    };
  });
}

function writeWilayaHeads(heads: WilayaHeadRecord[]) {
  ensureDataFiles();
  fs.writeFileSync(WILAYA_HEADS_FILE, JSON.stringify(heads, null, 2), 'utf8');
}

function sanitizeWilayaHeadForClient(head: WilayaHeadRecord, office: WilayaOfficeRecord) {
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
    hasPassword: Boolean(head.passwordHash && head.passwordSalt),
    updatedAt: head.updatedAt || office.updatedAt || '',
  };
}

function buildPublicWilayaMapEntries() {
  const offices = readWilayaOffices();
  const heads = readWilayaHeads();
  const headByCode = new Map(heads.map((h) => [h.wilayaCode, h]));
  return offices.map((office) => {
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
  });
}

function isCityInWilayaScope(city: string, wilayaCode: string, wilayaName: string): boolean {
  const cleanCity = city.trim();
  if (!cleanCity) return false;
  if (cleanCity === wilayaName) return true;
  if (wilayaCode === '16' && cleanCity.startsWith('الجزائر')) return true;
  if (
    (wilayaCode === '70' || wilayaCode === '71' || wilayaCode === '72') &&
    (cleanCity === wilayaName || cleanCity === 'الجزائر' || cleanCity === 'الجزائر العاصمة')
  ) {
    return true;
  }
  return cleanCity.includes(wilayaName);
}

function readEnrollments(): IndividualEnrollmentRecord[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(ENROLLMENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IndividualEnrollmentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeEnrollments(list: IndividualEnrollmentRecord[]) {
  ensureDataFiles();
  fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(list, null, 2), 'utf8');
  void triggerExcelSync();
}

function isMemberOwnedByWilayaStrict(
  city: string,
  wilayaCode: string,
  wilayaName: string,
  offices: WilayaOfficeRecord[]
): boolean {
  const clean = (city || '').trim();
  if (!clean) return false;
  if (clean === wilayaName) return true;
  if (clean === 'الجزائر العاصمة') return wilayaCode === '16';
  const exactOther = offices.find((o) => o.wilayaName === clean);
  if (exactOther) return exactOther.code === wilayaCode;
  return isCityInWilayaScope(clean, wilayaCode, wilayaName);
}

function buildWilayaHeadWorkspacePayload(code: string) {
  const offices = readWilayaOffices();
  const heads = readWilayaHeads();
  const office = offices.find((o) => o.code === code)!;
  const head = heads.find((h) => h.wilayaCode === code)!;

  const roster = readRoster();
  const scopedMembers = roster.filter((m) =>
    isCityInWilayaScope(m.city, office.code, office.wilayaName)
  );
  const memberNums = new Set(scopedMembers.map((m) => m.membershipNumber));
  const store = readRecords();
  const scopedClaims = store.claims.filter((c) => memberNums.has(c.ownerId));
  const scopedEnrollments = readEnrollments().filter((e) =>
    isCityInWilayaScope(e.city, office.code, office.wilayaName)
  );
  const warehouseMeta = readNationalWarehouseMeta(DATA_DIR);

  const safeMembers = scopedMembers.map(({ accessCode: _omit, ...rest }) => rest);

  return {
    account: sanitizeWilayaHeadForClient(head, office),
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
      fileName: warehouseMeta.fileName,
      lastSyncedAt: warehouseMeta.lastSyncedAt,
      nationalTotalMembers: warehouseMeta.totalMembers || roster.length,
      wilayaSyncedMembers:
        warehouseMeta.byWilaya.find((b) => b.code === code)?.membersCount ??
        safeMembers.length,
    },
    members: safeMembers,
    claims: scopedClaims,
    enrollments: scopedEnrollments,
  };
}

function getDatabaseSnapshot(): DatabaseSnapshot {
  const records = readRecords();
  return {
    roster: readRoster(),
    dependents: records.dependents,
    claims: records.claims,
    authorizations: records.authorizations,
    enrollments: readEnrollments(),
    wilayas: readWilayaOffices(),
    wilayaHeads: readWilayaHeads().map((h) => ({
      wilayaCode: h.wilayaCode,
      username: h.username,
      fullName: h.fullName,
      title: h.title,
      phone: h.phone,
      email: h.email,
      status: h.status,
    })),
  };
}

function triggerExcelSync() {
  return syncExcelDatabaseWorkbook(DATA_DIR, getDatabaseSnapshot);
}

function signToken(payloadObj: {
  role: 'member' | 'admin' | 'wilaya_head';
  sub: string;
  exp: number;
}): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(
  token: string,
  expectedRole: 'member' | 'admin' | 'wilaya_head'
): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as { role?: string; sub?: string; exp?: number };
    if (
      decoded.role !== expectedRole ||
      !decoded.sub ||
      !decoded.exp ||
      decoded.exp < Date.now()
    ) {
      return null;
    }
    return decoded.sub;
  } catch {
    return null;
  }
}

function safeCompareSecret(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUser =
    process.env.ADMIN_USERNAME && process.env.ADMIN_USERNAME.trim().length > 0
      ? process.env.ADMIN_USERNAME.trim()
      : DEFAULT_ADMIN_USER;

  if (!safeCompareSecret(username.trim().toLowerCase(), expectedUser.toLowerCase())) {
    return false;
  }

  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length > 0) {
    return safeCompareSecret(password, process.env.ADMIN_PASSWORD);
  }

  const derived = crypto.scryptSync(password, DEFAULT_ADMIN_SALT, 64);
  const expectedBuf = Buffer.from(DEFAULT_ADMIN_SCRYPT_HEX, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

let cachedCardVerifyKey = '';

function getCardVerifyKey(): string {
  if (process.env.CARD_VERIFY_SECRET && process.env.CARD_VERIFY_SECRET.length >= 16) {
    return process.env.CARD_VERIFY_SECRET;
  }
  if (cachedCardVerifyKey) return cachedCardVerifyKey;
  ensureDataFiles();
  const keyFile = path.join(DATA_DIR, 'card-verify.key');
  try {
    if (fs.existsSync(keyFile)) {
      const saved = fs.readFileSync(keyFile, 'utf8').trim();
      if (saved.length >= 32) {
        cachedCardVerifyKey = saved;
        return saved;
      }
    }
  } catch {
    // generate fallback below
  }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(keyFile, generated, 'utf8');
  } catch {
    // ignore write failures in restricted filesystems
  }
  cachedCardVerifyKey = generated;
  return generated;
}

function computeCardQrSig(membershipNumber: string): string {
  return crypto
    .createHmac('sha256', getCardVerifyKey())
    .update(`MUTNATEC-CARD:${membershipNumber.toUpperCase()}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

function sanitizeMemberForClient(record: InternalRosterRecord) {
  return {
    uid: record.membershipNumber,
    fullName: record.fullName,
    email: record.email,
    nationalId: record.nationalId,
    socialSecurityNumber: record.socialSecurityNumber || record.nationalId,
    birthDate: record.birthDate || '',
    birthPlace: record.birthPlace || record.city,
    jobTitle: record.jobTitle || record.sector,
    membershipNumber: record.membershipNumber,
    sector: record.sector,
    city: record.city,
    municipality: record.municipality || record.city,
    institution: record.institution || record.sector,
    memberRole: record.memberRole || (record.status === 'نشط' ? 'منخرط نشط' : record.status),
    enrollmentYear: record.enrollmentYear || '2026',
    cardQrSig: computeCardQrSig(record.membershipNumber),
    phone: record.phone,
    rib: record.rib,
    coveragePlan: record.coveragePlan,
    annualCeiling: record.annualCeiling,
    status: record.status,
  };
}

function extractBearer(req: Request): string {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

interface AuthedInternalRequest extends Request {
  internalMembershipNumber?: string;
}

interface AuthedAdminRequest extends Request {
  adminUsername?: string;
}

interface AuthedWilayaHeadRequest extends Request {
  wilayaCode?: string;
}

function requireInternalMember(
  req: AuthedInternalRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractBearer(req);
  const membershipNumber = verifyToken(token, 'member');
  if (!membershipNumber) {
    res.status(401).json({ error: 'جلسة الدخول الداخلي غير صالحة أو منتهية.' });
    return;
  }
  const roster = readRoster();
  const member = roster.find((m) => m.membershipNumber === membershipNumber);
  if (!member) {
    res.status(401).json({ error: 'المنخرط غير موجود في الملف الداخلي.' });
    return;
  }
  if (member.status !== 'نشط') {
    res.status(403).json({ error: 'حساب المنخرط معلق أو قيد المراجعة من طرف الإدارة.' });
    return;
  }
  req.internalMembershipNumber = membershipNumber;
  next();
}

function requireAdminSession(
  req: AuthedAdminRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractBearer(req);
  const adminUser = verifyToken(token, 'admin');
  if (!adminUser) {
    res.status(401).json({ error: 'جلسة مدير الموقع غير صالحة أو منتهية.' });
    return;
  }
  req.adminUsername = adminUser;
  next();
}

function requireWilayaHeadSession(
  req: AuthedWilayaHeadRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractBearer(req);
  const wilayaCode = verifyToken(token, 'wilaya_head');
  if (!wilayaCode || !isValidWilayaCode(wilayaCode)) {
    res.status(401).json({ error: 'جلسة رئيس التعاضدية الولائية غير صالحة أو منتهية.' });
    return;
  }
  const heads = readWilayaHeads();
  const head = heads.find((h) => h.wilayaCode === wilayaCode);
  if (!head || head.status !== 'نشط') {
    res.status(403).json({ error: 'حساب رئيس التعاضدية الولائية معلق أو غير نشط.' });
    return;
  }
  req.wilayaCode = wilayaCode;
  next();
}

function generateServerId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;
}

async function startServer() {
  ensureDataFiles();
  void triggerExcelSync();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // --- Admin Username & Password Login (Separated from Google) ---
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const body = req.body as { username?: unknown; password?: unknown };
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم والرقم السري.' });
      return;
    }

    if (!verifyAdminCredentials(username, password)) {
      res.status(401).json({ error: 'اسم المستخدم أو الرقم السري غير صحيح.' });
      return;
    }

    const token = signToken({
      role: 'admin',
      sub: username,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });

    res.json({ token, username });
  });

  // --- Public Internal-File Member Login ---
  app.post('/api/internal/login', (req: Request, res: Response) => {
    const body = req.body as { membershipNumber?: unknown; accessCode?: unknown };
    const membershipNumber =
      typeof body.membershipNumber === 'string' ? body.membershipNumber.trim() : '';
    const accessCode =
      typeof body.accessCode === 'string' ? body.accessCode.trim() : '';

    if (!membershipNumber || !accessCode) {
      res.status(400).json({ error: 'يرجى إدخال رقم الانخراط ورمز الدخول.' });
      return;
    }

    const roster = readRoster();
    const matched = roster.find(
      (m) => m.membershipNumber.toUpperCase() === membershipNumber.toUpperCase()
    );

    if (!matched || !safeCompareSecret(matched.accessCode, accessCode)) {
      res.status(401).json({ error: 'رقم الانخراط أو رمز الدخول غير صحيح.' });
      return;
    }

    if (matched.status !== 'نشط') {
      res.status(403).json({
        error: `حساب الانخراط في وضعية (${matched.status}). يرجى مراجعة مدير الموقع.`,
      });
      return;
    }

    const token = signToken({
      role: 'member',
      sub: matched.membershipNumber,
      exp: Date.now() + 1000 * 60 * 60 * 24,
    });
    res.json({
      token,
      member: sanitizeMemberForClient(matched),
    });
  });

  // --- Authenticated Internal Member Routes ---
  app.get(
    '/api/internal/me',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const roster = readRoster();
      const member = roster.find((m) => m.membershipNumber === membershipNumber)!;
      const store = readRecords();

      res.json({
        member: sanitizeMemberForClient(member),
        dependents: store.dependents.filter((d) => d.ownerId === membershipNumber),
        claims: store.claims.filter((c) => c.ownerId === membershipNumber),
        authorizations: store.authorizations.filter(
          (a) => a.ownerId === membershipNumber
        ),
      });
    }
  );

  app.put(
    '/api/internal/me',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const body = req.body as Record<string, unknown>;
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
      const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim().slice(0, 32) : '';
      const sector = typeof body.sector === 'string' ? body.sector.trim().slice(0, 100) : '';
      const city = typeof body.city === 'string' ? body.city.trim().slice(0, 80) : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
      const rib = typeof body.rib === 'string' ? body.rib.replace(/\s+/g, '').slice(0, 34) : '';
      const coveragePlan = typeof body.coveragePlan === 'string' ? body.coveragePlan : '';

      if (
        fullName.length < 2 ||
        !SAFE_ID_REGEX.test(nationalId) ||
        nationalId.length < 3 ||
        sector.length < 2 ||
        city.length < 2 ||
        phone.length < 6 ||
        rib.length < 10 ||
        !VALID_PLANS.has(coveragePlan)
      ) {
        res.status(400).json({ error: 'يرجى التحقق من صحة المعطيات المدخلة.' });
        return;
      }

      const roster = readRoster();
      const idx = roster.findIndex((m) => m.membershipNumber === membershipNumber);
      if (idx === -1) {
        res.status(404).json({ error: 'الملف غير موجود.' });
        return;
      }

      roster[idx] = {
        ...roster[idx],
        fullName,
        nationalId,
        sector,
        city,
        phone,
        rib,
        coveragePlan,
      };
      writeRoster(roster);
      res.json({ member: sanitizeMemberForClient(roster[idx]) });
    }
  );

  app.post(
    '/api/internal/dependents',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const body = req.body as Record<string, unknown>;
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
      const relationship = typeof body.relationship === 'string' ? body.relationship : '';
      const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : '';

      if (
        fullName.length < 2 ||
        !VALID_RELATIONSHIPS.has(relationship) ||
        !ISO_DATE_REGEX.test(birthDate)
      ) {
        res.status(400).json({ error: 'معطيات المستفيد غير صالحة.' });
        return;
      }

      const store = readRecords();
      const created: InternalDependentRecord = {
        id: generateServerId('DEP'),
        ownerId: membershipNumber,
        fullName,
        relationship,
        birthDate,
        coverageCode: generateServerId('COV').slice(0, 20),
        active: true,
      };
      store.dependents.push(created);
      writeRecords(store);
      res.status(201).json({ dependent: created });
    }
  );

  app.patch(
    '/api/internal/dependents/:id',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const store = readRecords();
      const idx = store.dependents.findIndex(
        (d) => d.id === req.params.id && d.ownerId === membershipNumber
      );
      if (idx === -1) {
        res.status(404).json({ error: 'المستفيد غير موجود.' });
        return;
      }
      const active =
        typeof (req.body as { active?: unknown }).active === 'boolean'
          ? (req.body as { active: boolean }).active
          : store.dependents[idx].active;
      store.dependents[idx] = { ...store.dependents[idx], active };
      writeRecords(store);
      res.json({ dependent: store.dependents[idx] });
    }
  );

  app.delete(
    '/api/internal/dependents/:id',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const store = readRecords();
      const nextDeps = store.dependents.filter(
        (d) => !(d.id === req.params.id && d.ownerId === membershipNumber)
      );
      if (nextDeps.length === store.dependents.length) {
        res.status(404).json({ error: 'المستفيد غير موجود.' });
        return;
      }
      store.dependents = nextDeps;
      writeRecords(store);
      res.json({ ok: true });
    }
  );

  app.post(
    '/api/internal/claims',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const roster = readRoster();
      const member = roster.find((m) => m.membershipNumber === membershipNumber)!;
      const body = req.body as Record<string, unknown>;

      const beneficiaryName =
        typeof body.beneficiaryName === 'string'
          ? body.beneficiaryName.trim().slice(0, 120)
          : member.fullName;
      const beneficiaryRelation =
        typeof body.beneficiaryRelation === 'string'
          ? body.beneficiaryRelation.trim().slice(0, 40)
          : 'المنخرط الرئيسي';
      const careType = typeof body.careType === 'string' ? body.careType : '';
      const providerName =
        typeof body.providerName === 'string' ? body.providerName.trim().slice(0, 140) : '';
      const careDate = typeof body.careDate === 'string' ? body.careDate.trim() : '';
      const totalAmount = Number(body.totalAmount);
      const estimatedReimbursement = Math.max(0, Number(body.estimatedReimbursement) || 0);
      const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 600) : '';

      if (
        !VALID_CARE_TYPES.has(careType) ||
        providerName.length < 2 ||
        !ISO_DATE_REGEX.test(careDate) ||
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0 ||
        totalAmount > 5000000
      ) {
        res.status(400).json({ error: 'بيانات ملف المرض غير صالحة.' });
        return;
      }

      const store = readRecords();
      const created: InternalClaimRecord = {
        id: generateServerId('CLM'),
        ownerId: membershipNumber,
        memberName: member.fullName,
        membershipNumber,
        referenceCode: generateServerId('CLM').slice(0, 22),
        beneficiaryName,
        beneficiaryRelation,
        careType,
        providerName,
        careDate,
        totalAmount,
        estimatedReimbursement: Math.min(5000000, estimatedReimbursement),
        approvedAmount: 0,
        status: 'قيد الدراسة',
        notes,
        reviewerNote: '',
      };
      store.claims.unshift(created);
      writeRecords(store);
      res.status(201).json({ claim: created });
    }
  );

  app.patch(
    '/api/internal/claims/:id',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const store = readRecords();
      const idx = store.claims.findIndex(
        (c) => c.id === req.params.id && c.ownerId === membershipNumber
      );
      if (idx === -1) {
        res.status(404).json({ error: 'ملف المرض غير موجود.' });
        return;
      }
      const existing = store.claims[idx];
      if (existing.status !== 'قيد الدراسة' && existing.status !== 'وثائق ناقصة') {
        res.status(403).json({ error: 'لا يمكن تعديل ملف في وضعيته الحالية.' });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const providerName =
        typeof body.providerName === 'string' ? body.providerName.trim().slice(0, 140) : existing.providerName;
      const careDate =
        typeof body.careDate === 'string' && ISO_DATE_REGEX.test(body.careDate)
          ? body.careDate
          : existing.careDate;
      const totalAmount = Number(body.totalAmount);
      const estimatedReimbursement = Math.max(0, Number(body.estimatedReimbursement) || 0);
      const notes =
        typeof body.notes === 'string' ? body.notes.trim().slice(0, 600) : existing.notes;

      if (providerName.length < 2 || !Number.isFinite(totalAmount) || totalAmount <= 0 || totalAmount > 5000000) {
        res.status(400).json({ error: 'بيانات التعديل غير صالحة.' });
        return;
      }

      store.claims[idx] = {
        ...existing,
        providerName,
        careDate,
        totalAmount,
        estimatedReimbursement: Math.min(5000000, estimatedReimbursement),
        notes,
        status: 'قيد الدراسة',
      };
      writeRecords(store);
      res.json({ claim: store.claims[idx] });
    }
  );

  app.delete(
    '/api/internal/claims/:id',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const store = readRecords();
      const existing = store.claims.find(
        (c) => c.id === req.params.id && c.ownerId === membershipNumber
      );
      if (!existing) {
        res.status(404).json({ error: 'الملف غير موجود.' });
        return;
      }
      if (existing.status !== 'قيد الدراسة') {
        res.status(403).json({ error: 'يمكن سحب الملفات قيد الدراسة فقط.' });
        return;
      }
      store.claims = store.claims.filter((c) => c.id !== existing.id);
      writeRecords(store);
      res.json({ ok: true });
    }
  );

  app.post(
    '/api/internal/authorizations',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const roster = readRoster();
      const member = roster.find((m) => m.membershipNumber === membershipNumber)!;
      const body = req.body as Record<string, unknown>;

      const beneficiaryName =
        typeof body.beneficiaryName === 'string'
          ? body.beneficiaryName.trim().slice(0, 120)
          : member.fullName;
      const procedureType = typeof body.procedureType === 'string' ? body.procedureType : '';
      const facilityName =
        typeof body.facilityName === 'string' ? body.facilityName.trim().slice(0, 140) : '';
      const expectedDate = typeof body.expectedDate === 'string' ? body.expectedDate.trim() : '';
      const estimatedCost = Number(body.estimatedCost);
      const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 600) : '';

      if (
        !VALID_PROCEDURE_TYPES.has(procedureType) ||
        facilityName.length < 2 ||
        !ISO_DATE_REGEX.test(expectedDate) ||
        !Number.isFinite(estimatedCost) ||
        estimatedCost <= 0 ||
        estimatedCost > 5000000
      ) {
        res.status(400).json({ error: 'معطيات طلب التكفل غير صالحة.' });
        return;
      }

      const store = readRecords();
      const created: InternalAuthRecord = {
        id: generateServerId('PEC'),
        ownerId: membershipNumber,
        memberName: member.fullName,
        referenceCode: generateServerId('PEC').slice(0, 22),
        beneficiaryName,
        procedureType,
        facilityName,
        expectedDate,
        estimatedCost,
        status: 'قيد الدراسة',
        notes,
        reviewerNote: '',
      };
      store.authorizations.unshift(created);
      writeRecords(store);
      res.status(201).json({ authorization: created });
    }
  );

  app.delete(
    '/api/internal/authorizations/:id',
    requireInternalMember,
    (req: AuthedInternalRequest, res: Response) => {
      const membershipNumber = req.internalMembershipNumber!;
      const store = readRecords();
      const existing = store.authorizations.find(
        (a) => a.id === req.params.id && a.ownerId === membershipNumber
      );
      if (!existing) {
        res.status(404).json({ error: 'الطلب غير موجود.' });
        return;
      }
      if (existing.status !== 'قيد الدراسة') {
        res.status(403).json({ error: 'يمكن إلغاء الطلبات قيد الدراسة فقط.' });
        return;
      }
      store.authorizations = store.authorizations.filter((a) => a.id !== existing.id);
      writeRecords(store);
      res.json({ ok: true });
    }
  );

  // --- Public Aggregate Member Statistics (Zero PII) ---
  app.get('/api/public/member-stats', (_req: Request, res: Response) => {
    const roster = readRoster();
    let maleCount = 0;
    let femaleCount = 0;
    let totalSeniority = 0;
    const seniorityBuckets = new Map<string, number>([
      ['أقل من 5 سنوات', 0],
      ['5 إلى 10 سنوات', 0],
      ['11 إلى 20 سنة', 0],
      ['أكثر من 20 سنة', 0],
    ]);
    const municipalityCounts = new Map<string, number>();
    const institutionCounts = new Map<string, number>();

    for (const m of roster) {

      if (m.gender === 'أنثى') {
        femaleCount += 1;
      } else {
        maleCount += 1;
      }

      const years =
        typeof m.seniorityYears === 'number' && Number.isFinite(m.seniorityYears)
          ? Math.max(0, Math.min(50, m.seniorityYears))
          : 5;
      totalSeniority += years;

      if (years < 5) {
        seniorityBuckets.set(
          'أقل من 5 سنوات',
          (seniorityBuckets.get('أقل من 5 سنوات') || 0) + 1
        );
      } else if (years <= 10) {
        seniorityBuckets.set(
          '5 إلى 10 سنوات',
          (seniorityBuckets.get('5 إلى 10 سنوات') || 0) + 1
        );
      } else if (years <= 20) {
        seniorityBuckets.set(
          '11 إلى 20 سنة',
          (seniorityBuckets.get('11 إلى 20 سنة') || 0) + 1
        );
      } else {
        seniorityBuckets.set(
          'أكثر من 20 سنة',
          (seniorityBuckets.get('أكثر من 20 سنة') || 0) + 1
        );
      }

      const muni = (m.municipality || m.city || 'غير محدد').trim();
      if (muni) {
        municipalityCounts.set(muni, (municipalityCounts.get(muni) || 0) + 1);
      }

      const inst = (m.institution || m.sector || 'غير محدد').trim();
      if (inst) {
        institutionCounts.set(inst, (institutionCounts.get(inst) || 0) + 1);
      }
    }

    const byGender = [
      { name: 'ذكور', count: maleCount },
      { name: 'إناث', count: femaleCount },
    ];

    const bySeniority = Array.from(seniorityBuckets.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    const byMunicipality = Array.from(municipalityCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const byInstitution = Array.from(institutionCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    res.json({
      totalMembers: roster.length,
      averageSeniorityYears:
        roster.length > 0 ? Math.round((totalSeniority / roster.length) * 10) / 10 : 0,
      municipalitiesCount: municipalityCounts.size,
      institutionsCount: institutionCounts.size,
      byGender,
      bySeniority,
      byMunicipality,
      byInstitution,
    });
  });

  // --- Public Electronic QR Card Verification (Zero sensitive PII) ---
  app.get('/api/public/verify-card', (req: Request, res: Response) => {
    const m = typeof req.query.m === 'string' ? req.query.m.trim() : '';
    const sig = typeof req.query.sig === 'string' ? req.query.sig.trim().toUpperCase() : '';

    if (!m || !SAFE_ID_REGEX.test(m) || !/^[A-F0-9]{16}$/.test(sig)) {
      res.status(400).json({ error: 'بيانات رمز التحقق الإلكتروني QR غير صالحة.' });
      return;
    }

    const roster = readRoster();
    const matched = roster.find(
      (item) => item.membershipNumber.toUpperCase() === m.toUpperCase()
    );
    if (!matched) {
      res.status(404).json({ error: 'بطاقة الانخراط غير مسجلة في قاعدة البيانات المركزية.' });
      return;
    }

    const expectedSig = computeCardQrSig(matched.membershipNumber);
    if (!safeCompareSecret(sig, expectedSig)) {
      res.status(403).json({ error: 'التوقيع الرقمي لرمز QR غير مطابق.' });
      return;
    }

    res.json({
      valid: matched.status === 'نشط',
      membershipNumber: matched.membershipNumber,
      fullName: matched.fullName,
      city: matched.city,
      municipality: matched.municipality || matched.city,
      institution: matched.institution || matched.sector,
      sector: matched.sector,
      coveragePlan: matched.coveragePlan,
      status: matched.status,
      enrollmentYear: matched.enrollmentYear || '2026',
      accreditationNumber: '96 / 04',
      verifiedAt: new Date().toISOString(),
    });
  });

  // --- Admin Internal Roster & Records Routes ---
  const attachRosterQrSig = (list: InternalRosterRecord[]) =>
    list.map((item) => ({
      ...item,
      cardQrSig: computeCardQrSig(item.membershipNumber),
    }));

  app.get('/api/admin/roster', requireAdminSession, (_req: Request, res: Response) => {
    res.json({ roster: attachRosterQrSig(readRoster()) });
  });

  app.post('/api/admin/roster', requireAdminSession, (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const membershipNumber =
      typeof body.membershipNumber === 'string' ? body.membershipNumber.trim() : '';
    const accessCode = typeof body.accessCode === 'string' ? body.accessCode.trim() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 160) : 'member@mutnatec.dz';
    const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim().slice(0, 32) : '';
    const socialSecurityNumber =
      typeof body.socialSecurityNumber === 'string' ? body.socialSecurityNumber.trim().slice(0, 32) : '';
    const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim().slice(0, 20) : '';
    const birthPlace = typeof body.birthPlace === 'string' ? body.birthPlace.trim().slice(0, 80) : '';
    const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim().slice(0, 100) : '';
    const memberRole = typeof body.memberRole === 'string' ? body.memberRole.trim().slice(0, 60) : '';
    const enrollmentYear =
      typeof body.enrollmentYear === 'string' && /^\d{4}$/.test(body.enrollmentYear.trim())
        ? body.enrollmentYear.trim()
        : String(new Date().getFullYear());
    const gender: 'ذكر' | 'أنثى' = body.gender === 'أنثى' ? 'أنثى' : 'ذكر';
    const seniorityYears = Math.max(0, Math.min(50, Math.round(Number(body.seniorityYears) || 0)));
    const sector = typeof body.sector === 'string' ? body.sector.trim().slice(0, 100) : '';
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 80) : '';
    const municipality =
      typeof body.municipality === 'string' ? body.municipality.trim().slice(0, 80) : '';
    const institution =
      typeof body.institution === 'string' ? body.institution.trim().slice(0, 140) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const rib = typeof body.rib === 'string' ? body.rib.replace(/\s+/g, '').slice(0, 34) : '';
    const coveragePlan = typeof body.coveragePlan === 'string' ? body.coveragePlan : 'التغطية التكميلية+';
    const annualCeiling = Math.max(10000, Math.min(2000000, Number(body.annualCeiling) || 250000));
    const status = typeof body.status === 'string' && VALID_MEMBER_STATUSES.has(body.status) ? body.status : 'نشط';

    if (
      !SAFE_ID_REGEX.test(membershipNumber) ||
      membershipNumber.length < 4 ||
      accessCode.length < 4 ||
      fullName.length < 2 ||
      !SAFE_ID_REGEX.test(nationalId) ||
      nationalId.length < 3 ||
      !VALID_PLANS.has(coveragePlan)
    ) {
      res.status(400).json({ error: 'بيانات المنخرط في الملف الداخلي غير مكتملة أو غير صالحة.' });
      return;
    }

    const roster = readRoster();
    if (roster.some((m) => m.membershipNumber.toUpperCase() === membershipNumber.toUpperCase())) {
      res.status(409).json({ error: 'رقم الانخراط مسجل مسبقاً في الملف الداخلي.' });
      return;
    }

    const finalCity = city || 'الجزائر العاصمة';
    const finalSector = sector || 'التربية الوطنية — التعليم الثانوي';
    const newRecord: InternalRosterRecord = {
      membershipNumber,
      accessCode,
      fullName,
      email,
      nationalId,
      socialSecurityNumber: socialSecurityNumber || undefined,
      birthDate: birthDate || undefined,
      birthPlace: birthPlace || undefined,
      jobTitle: jobTitle || undefined,
      memberRole: memberRole || undefined,
      enrollmentYear,
      gender,
      seniorityYears,
      sector: finalSector,
      city: finalCity,
      municipality: municipality || finalCity,
      institution: institution || finalSector,
      phone: phone || '0550000000',
      rib: rib || '00799999000000000000',
      coveragePlan,
      annualCeiling,
      status,
    };

    roster.unshift(newRecord);
    writeRoster(roster);
    res.status(201).json({
      member: { ...newRecord, cardQrSig: computeCardQrSig(newRecord.membershipNumber) },
      roster: attachRosterQrSig(roster),
    });
  });

  app.patch(
    '/api/admin/roster/:membershipNumber',
    requireAdminSession,
    (req: Request, res: Response) => {
      const roster = readRoster();
      const idx = roster.findIndex(
        (m) => m.membershipNumber === req.params.membershipNumber
      );
      if (idx === -1) {
        res.status(404).json({ error: 'المنخرط غير موجود في الملف الداخلي.' });
        return;
      }
      const existing = roster[idx];
      const body = req.body as Record<string, unknown>;

      const nextStatus =
        typeof body.status === 'string' && VALID_MEMBER_STATUSES.has(body.status)
          ? body.status
          : existing.status;
      const nextPlan =
        typeof body.coveragePlan === 'string' && VALID_PLANS.has(body.coveragePlan)
          ? body.coveragePlan
          : existing.coveragePlan;

      roster[idx] = {
        ...existing,
        fullName:
          typeof body.fullName === 'string' && body.fullName.trim().length >= 2
            ? body.fullName.trim().slice(0, 120)
            : existing.fullName,
        accessCode:
          typeof body.accessCode === 'string' && body.accessCode.trim().length >= 4
            ? body.accessCode.trim().slice(0, 64)
            : existing.accessCode,
        socialSecurityNumber:
          typeof body.socialSecurityNumber === 'string' && body.socialSecurityNumber.trim().length >= 3
            ? body.socialSecurityNumber.trim().slice(0, 32)
            : existing.socialSecurityNumber,
        birthDate:
          typeof body.birthDate === 'string' && body.birthDate.trim().length >= 4
            ? body.birthDate.trim().slice(0, 20)
            : existing.birthDate,
        birthPlace:
          typeof body.birthPlace === 'string' && body.birthPlace.trim().length >= 2
            ? body.birthPlace.trim().slice(0, 80)
            : existing.birthPlace,
        jobTitle:
          typeof body.jobTitle === 'string' && body.jobTitle.trim().length >= 2
            ? body.jobTitle.trim().slice(0, 100)
            : existing.jobTitle,
        memberRole:
          typeof body.memberRole === 'string' && body.memberRole.trim().length >= 2
            ? body.memberRole.trim().slice(0, 60)
            : existing.memberRole,
        enrollmentYear:
          typeof body.enrollmentYear === 'string' && /^\d{4}$/.test(body.enrollmentYear.trim())
            ? body.enrollmentYear.trim()
            : existing.enrollmentYear,
        gender:
          body.gender === 'أنثى' || body.gender === 'ذكر'
            ? body.gender
            : existing.gender,
        seniorityYears:
          body.seniorityYears !== undefined
            ? Math.max(0, Math.min(50, Math.round(Number(body.seniorityYears) || 0)))
            : existing.seniorityYears,
        sector:
          typeof body.sector === 'string' && body.sector.trim().length >= 2
            ? body.sector.trim().slice(0, 100)
            : existing.sector,
        city:
          typeof body.city === 'string' && body.city.trim().length >= 2
            ? body.city.trim().slice(0, 80)
            : existing.city,
        municipality:
          typeof body.municipality === 'string' && body.municipality.trim().length >= 2
            ? body.municipality.trim().slice(0, 80)
            : existing.municipality,
        institution:
          typeof body.institution === 'string' && body.institution.trim().length >= 2
            ? body.institution.trim().slice(0, 140)
            : existing.institution,
        phone:
          typeof body.phone === 'string' && body.phone.trim().length >= 6
            ? body.phone.trim().slice(0, 30)
            : existing.phone,
        rib:
          typeof body.rib === 'string' && body.rib.trim().length >= 10
            ? body.rib.replace(/\s+/g, '').slice(0, 34)
            : existing.rib,
        coveragePlan: nextPlan,
        annualCeiling:
          body.annualCeiling !== undefined
            ? Math.max(10000, Math.min(2000000, Number(body.annualCeiling) || existing.annualCeiling))
            : existing.annualCeiling,
        status: nextStatus,
      };
      writeRoster(roster);
      res.json({
        member: { ...roster[idx], cardQrSig: computeCardQrSig(roster[idx].membershipNumber) },
        roster: attachRosterQrSig(roster),
      });
    }
  );

  app.delete(
    '/api/admin/roster/:membershipNumber',
    requireAdminSession,
    (req: Request, res: Response) => {
      const roster = readRoster();
      const filtered = roster.filter(
        (m) => m.membershipNumber !== req.params.membershipNumber
      );
      if (filtered.length === roster.length) {
        res.status(404).json({ error: 'المنخرط غير موجود.' });
        return;
      }
      writeRoster(filtered);
      res.json({ roster: filtered });
    }
  );

  app.post(
    '/api/admin/roster/import',
    requireAdminSession,
    (req: Request, res: Response) => {
      const body = req.body as { roster?: unknown };
      if (!Array.isArray(body.roster)) {
        res.status(400).json({ error: 'صيغة الملف المستورد غير صالحة (مطلوب مصفوفة JSON).' });
        return;
      }

      const sanitized: InternalRosterRecord[] = [];
      for (const item of body.roster) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const membershipNumber =
          typeof r.membershipNumber === 'string' ? r.membershipNumber.trim() : '';
        const accessCode =
          typeof r.accessCode === 'string' ? r.accessCode.trim() : '';
        const fullName =
          typeof r.fullName === 'string' ? r.fullName.trim().slice(0, 120) : '';
        const nationalId =
          typeof r.nationalId === 'string' ? r.nationalId.trim().slice(0, 32) : '';
        if (
          !SAFE_ID_REGEX.test(membershipNumber) ||
          membershipNumber.length < 4 ||
          accessCode.length < 4 ||
          fullName.length < 2 ||
          !SAFE_ID_REGEX.test(nationalId)
        ) {
          continue;
        }
        const impCity =
          typeof r.city === 'string' ? r.city.trim().slice(0, 80) : 'الجزائر العاصمة';
        const impSector =
          typeof r.sector === 'string'
            ? r.sector.trim().slice(0, 100)
            : 'التربية الوطنية — التعليم الثانوي';
        sanitized.push({
          membershipNumber,
          accessCode,
          fullName,
          email:
            typeof r.email === 'string' ? r.email.trim().slice(0, 160) : 'member@mutnatec.dz',
          nationalId,
          gender: r.gender === 'أنثى' ? 'أنثى' : 'ذكر',
          seniorityYears: Math.max(0, Math.min(50, Math.round(Number(r.seniorityYears) || 5))),
          sector: impSector,
          city: impCity,
          municipality:
            typeof r.municipality === 'string' && r.municipality.trim()
              ? r.municipality.trim().slice(0, 80)
              : impCity,
          institution:
            typeof r.institution === 'string' && r.institution.trim()
              ? r.institution.trim().slice(0, 140)
              : impSector,
          phone:
            typeof r.phone === 'string' ? r.phone.trim().slice(0, 30) : '0550000000',
          rib:
            typeof r.rib === 'string'
              ? r.rib.replace(/\s+/g, '').slice(0, 34)
              : '00799999000000000000',
          coveragePlan:
            typeof r.coveragePlan === 'string' && VALID_PLANS.has(r.coveragePlan)
              ? r.coveragePlan
              : 'التغطية التكميلية+',
          annualCeiling: Math.max(
            10000,
            Math.min(2000000, Number(r.annualCeiling) || 250000)
          ),
          status:
            typeof r.status === 'string' && VALID_MEMBER_STATUSES.has(r.status)
              ? r.status
              : 'نشط',
        });
      }

      if (sanitized.length === 0) {
        res.status(400).json({ error: 'لم يتم العثور على أي سجل صالح داخل الملف المستورد.' });
        return;
      }

      writeRoster(sanitized);
      res.json({ roster: sanitized, count: sanitized.length });
    }
  );

  app.get('/api/admin/records', requireAdminSession, (_req: Request, res: Response) => {
    const store = readRecords();
    res.json({
      claims: store.claims,
      authorizations: store.authorizations,
    });
  });

  app.patch(
    '/api/admin/records/claims/:id',
    requireAdminSession,
    (req: Request, res: Response) => {
      const store = readRecords();
      const idx = store.claims.findIndex((c) => c.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'الملف غير موجود.' });
        return;
      }
      const body = req.body as {
        status?: unknown;
        approvedAmount?: unknown;
        reviewerNote?: unknown;
      };
      const status =
        typeof body.status === 'string' && VALID_CLAIM_STATUSES.has(body.status)
          ? body.status
          : store.claims[idx].status;
      const approvedAmount =
        status === 'مرفوض'
          ? 0
          : Math.max(0, Math.min(5000000, Number(body.approvedAmount) || 0));
      const reviewerNote =
        typeof body.reviewerNote === 'string'
          ? body.reviewerNote.trim().slice(0, 400)
          : store.claims[idx].reviewerNote;

      store.claims[idx] = {
        ...store.claims[idx],
        status,
        approvedAmount,
        reviewerNote,
      };
      writeRecords(store);
      res.json({ claim: store.claims[idx] });
    }
  );

  app.patch(
    '/api/admin/records/authorizations/:id',
    requireAdminSession,
    (req: Request, res: Response) => {
      const store = readRecords();
      const idx = store.authorizations.findIndex((a) => a.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'الطلب غير موجود.' });
        return;
      }
      const body = req.body as { status?: unknown; reviewerNote?: unknown };
      const status =
        typeof body.status === 'string' && VALID_AUTH_STATUSES.has(body.status)
          ? body.status
          : store.authorizations[idx].status;
      const reviewerNote =
        typeof body.reviewerNote === 'string'
          ? body.reviewerNote.trim().slice(0, 400)
          : store.authorizations[idx].reviewerNote;

      store.authorizations[idx] = {
        ...store.authorizations[idx],
        status,
        reviewerNote,
      };
      writeRecords(store);
      res.json({ authorization: store.authorizations[idx] });
    }
  );

  // --- Public Interactive Wilaya Heads Map ---
  app.get('/api/public/wilaya-heads-map', (_req: Request, res: Response) => {
    res.json({ entries: buildPublicWilayaMapEntries() });
  });

  // --- Wilaya Head Login & Scoped Self-Service Workspace ---
  app.post('/api/wilaya-head/login', (req: Request, res: Response) => {
    const body = req.body as { username?: unknown; password?: unknown };
    const username =
      typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!username || !password) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم والرقم السري للرئيس الولائي.' });
      return;
    }

    const heads = readWilayaHeads();
    const offices = readWilayaOffices();
    const matched = heads.find(
      (h) =>
        h.username.toLowerCase() === username ||
        h.wilayaCode === username.padStart(2, '0')
    );

    if (!matched || !matched.passwordHash || !matched.passwordSalt) {
      res.status(401).json({
        error: 'بيانات الدخول غير صحيحة أو لم يتم تفعيل كلمة المرور لهذا الحساب بعد.',
      });
      return;
    }

    if (!verifyWilayaHeadPassword(password, matched.passwordSalt, matched.passwordHash)) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
      return;
    }

    if (matched.status !== 'نشط') {
      res.status(403).json({
        error: 'تم تعليق حساب رئيس التعاضدية الولائية. يرجى مراجعة الإدارة المركزية.',
      });
      return;
    }

    const office = offices.find((o) => o.code === matched.wilayaCode)!;
    const token = signToken({
      role: 'wilaya_head',
      sub: matched.wilayaCode,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });

    res.json({
      token,
      account: sanitizeWilayaHeadForClient(matched, office),
    });
  });

  app.get(
    '/api/wilaya-head/me',
    requireWilayaHeadSession,
    (req: AuthedWilayaHeadRequest, res: Response) => {
      res.json(buildWilayaHeadWorkspacePayload(req.wilayaCode!));
    }
  );

  app.put(
    '/api/wilaya-head/me',
    requireWilayaHeadSession,
    async (req: AuthedWilayaHeadRequest, res: Response) => {
      const code = req.wilayaCode!;
      const body = req.body as Record<string, unknown>;

      const safeMaps = sanitizeWebUrl(body.googleMapsUrl);
      if (!safeMaps.ok) {
        res.status(400).json({
          error: 'رابط خرائط قوقل غير صالح. يجب أن يبدأ بـ https:// أو http://',
        });
        return;
      }
      const safeSecMaps = sanitizeWebUrl(body.secondaryMapsUrl);
      if (!safeSecMaps.ok) {
        res.status(400).json({ error: 'رابط المقر الثاني غير صالح.' });
        return;
      }
      const safeSocial = sanitizeWebUrl(body.socialUrl);
      if (!safeSocial.ok) {
        res.status(400).json({ error: 'رابط الحساب الرسمي غير صالح.' });
        return;
      }

      const offices = readWilayaOffices();
      const heads = readWilayaHeads();
      const officeIdx = offices.findIndex((o) => o.code === code);
      const headIdx = heads.findIndex((h) => h.wilayaCode === code);
      if (officeIdx === -1 || headIdx === -1) {
        res.status(404).json({ error: 'الحساب الولائي غير موجود.' });
        return;
      }

      let lat = parseOptionalCoord(body.lat, -90, 90);
      let lng = parseOptionalCoord(body.lng, -180, 180);
      if ((lat === undefined || lng === undefined) && safeMaps.value) {
        const resolved = await resolveMapsRedirectCoords(safeMaps.value);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
        }
      }

      const fullName =
        typeof body.fullName === 'string'
          ? body.fullName.trim().slice(0, 120)
          : heads[headIdx].fullName;
      const title =
        typeof body.title === 'string' && body.title.trim()
          ? body.title.trim().slice(0, 120)
          : heads[headIdx].title;
      const phone =
        typeof body.phone === 'string'
          ? body.phone.trim().slice(0, 60)
          : heads[headIdx].phone;
      const email =
        typeof body.email === 'string'
          ? body.email.trim().slice(0, 160)
          : heads[headIdx].email;

      const now = new Date().toISOString();
      heads[headIdx] = {
        ...heads[headIdx],
        fullName,
        title,
        phone,
        email,
        updatedAt: now,
      };
      writeWilayaHeads(heads);

      offices[officeIdx] = {
        ...offices[officeIdx],
        officeName:
          typeof body.officeName === 'string'
            ? body.officeName.trim().slice(0, 140)
            : offices[officeIdx].officeName,
        representativeName: fullName,
        headTitle: title,
        phone,
        accountInfo:
          typeof body.accountInfo === 'string'
            ? body.accountInfo.trim().slice(0, 180)
            : offices[officeIdx].accountInfo,
        socialUrl: safeSocial.value,
        address:
          typeof body.address === 'string'
            ? body.address.trim().slice(0, 220)
            : offices[officeIdx].address,
        googleMapsUrl: safeMaps.value,
        secondaryMapsUrl: safeSecMaps.value,
        ...(lat !== undefined && lng !== undefined
          ? { lat, lng }
          : { lat: offices[officeIdx].lat, lng: offices[officeIdx].lng }),
        updatedAt: now,
      };
      writeWilayaOffices(offices);

      res.json({
        account: sanitizeWilayaHeadForClient(heads[headIdx], offices[officeIdx]),
        office: offices[officeIdx],
      });
    }
  );

  app.patch(
    '/api/wilaya-head/me/password',
    requireWilayaHeadSession,
    (req: AuthedWilayaHeadRequest, res: Response) => {
      const code = req.wilayaCode!;
      const body = req.body as { currentPassword?: unknown; newPassword?: unknown };
      const currentPassword =
        typeof body.currentPassword === 'string' ? body.currentPassword.trim() : '';
      const newPassword =
        typeof body.newPassword === 'string' ? body.newPassword.trim() : '';

      if (!currentPassword || newPassword.length < 6 || newPassword.length > 72) {
        res.status(400).json({
          error: 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.',
        });
        return;
      }

      const heads = readWilayaHeads();
      const idx = heads.findIndex((h) => h.wilayaCode === code);
      if (idx === -1) {
        res.status(404).json({ error: 'الحساب غير موجود.' });
        return;
      }
      if (
        !verifyWilayaHeadPassword(
          currentPassword,
          heads[idx].passwordSalt,
          heads[idx].passwordHash
        )
      ) {
        res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
        return;
      }

      const { salt, hash } = hashWilayaHeadPassword(newPassword);
      heads[idx] = {
        ...heads[idx],
        passwordSalt: salt,
        passwordHash: hash,
        updatedAt: new Date().toISOString(),
      };
      writeWilayaHeads(heads);
      res.json({ ok: true });
    }
  );

  // --- Wilaya Head Scoped Backup, Restore & Per-Wilaya Excel ---
  app.get(
    '/api/wilaya-head/backup/export',
    requireWilayaHeadSession,
    (req: AuthedWilayaHeadRequest, res: Response) => {
      const code = req.wilayaCode!;
      const offices = readWilayaOffices();
      const heads = readWilayaHeads();
      const office = offices.find((o) => o.code === code)!;
      const head = heads.find((h) => h.wilayaCode === code)!;

      const roster = readRoster();
      const scopedMembers = roster
        .filter((m) => isCityInWilayaScope(m.city, office.code, office.wilayaName))
        .map(({ accessCode: _omit, ...rest }) => rest);
      const memberNums = new Set(scopedMembers.map((m) => m.membershipNumber));

      const store = readRecords();
      const scopedDependents = store.dependents.filter((d) => memberNums.has(d.ownerId));
      const scopedClaims = store.claims.filter((c) => memberNums.has(c.ownerId));
      const scopedAuthorizations = store.authorizations.filter((a) =>
        memberNums.has(a.ownerId)
      );
      const scopedEnrollments = readEnrollments().filter((e) =>
        isCityInWilayaScope(e.city, office.code, office.wilayaName)
      );

      const backupPayload = {
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
        dependents: scopedDependents,
        claims: scopedClaims,
        authorizations: scopedAuthorizations,
        enrollments: scopedEnrollments,
      };

      const dateTag = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="MUTNATEC-Wilaya-${code}-Backup-${dateTag}.json"`
      );
      res.send(JSON.stringify(backupPayload, null, 2));
    }
  );

  app.post(
    '/api/wilaya-head/backup/restore',
    express.json({ limit: '6mb' }),
    requireWilayaHeadSession,
    async (req: AuthedWilayaHeadRequest, res: Response) => {
      const code = req.wilayaCode!;
      const body = req.body as {
        backup?: unknown;
        mode?: unknown;
      };
      const mode = body.mode === 'replace_wilaya' ? 'replace_wilaya' : 'merge';

      if (!body.backup || typeof body.backup !== 'object') {
        res.status(400).json({ error: 'ملف النسخة الاحتياطية غير صالح.' });
        return;
      }

      const rawBackup = body.backup as Record<string, unknown>;
      if (rawBackup.format !== 'mutnatec-wilaya-backup-v1') {
        res.status(400).json({
          error: 'صيغة الملف غير معتمدة. يرجى رفع ملف نسخة احتياطية صادر من بوابة التعاضدية.',
        });
        return;
      }

      const backupCode =
        typeof rawBackup.wilayaCode === 'string'
          ? rawBackup.wilayaCode.trim().padStart(2, '0')
          : '';
      if (backupCode !== code) {
        res.status(403).json({
          error: `هذا الملف تابع للولاية رقم (${backupCode || 'غير معروف'}) ولا يمكن استعادته داخل حساب الولاية رقم (${code}).`,
        });
        return;
      }

      const offices = readWilayaOffices();
      const heads = readWilayaHeads();
      const officeIdx = offices.findIndex((o) => o.code === code);
      const headIdx = heads.findIndex((h) => h.wilayaCode === code);
      if (officeIdx === -1 || headIdx === -1) {
        res.status(404).json({ error: 'بيانات المركز الولائي غير موجودة.' });
        return;
      }
      const targetOffice = offices[officeIdx];

      // 1. Restore Wilaya Office & Head Profile (never modify password/status/username/code)
      if (rawBackup.office && typeof rawBackup.office === 'object') {
        const bOff = rawBackup.office as Record<string, unknown>;
        const safeMaps = sanitizeWebUrl(bOff.googleMapsUrl);
        const safeSecMaps = sanitizeWebUrl(bOff.secondaryMapsUrl);
        const safeSocial = sanitizeWebUrl(bOff.socialUrl);
        const lat = parseOptionalCoord(bOff.lat, 18, 38);
        const lng = parseOptionalCoord(bOff.lng, -9.5, 12.5);

        offices[officeIdx] = {
          ...targetOffice,
          officeName:
            typeof bOff.officeName === 'string'
              ? bOff.officeName.trim().slice(0, 140)
              : targetOffice.officeName,
          representativeName:
            typeof bOff.representativeName === 'string'
              ? bOff.representativeName.trim().slice(0, 120)
              : targetOffice.representativeName,
          headTitle:
            typeof bOff.headTitle === 'string' && bOff.headTitle.trim()
              ? bOff.headTitle.trim().slice(0, 120)
              : targetOffice.headTitle,
          phone:
            typeof bOff.phone === 'string'
              ? bOff.phone.trim().slice(0, 60)
              : targetOffice.phone,
          accountInfo:
            typeof bOff.accountInfo === 'string'
              ? bOff.accountInfo.trim().slice(0, 180)
              : targetOffice.accountInfo,
          address:
            typeof bOff.address === 'string'
              ? bOff.address.trim().slice(0, 220)
              : targetOffice.address,
          googleMapsUrl: safeMaps.ok ? safeMaps.value : targetOffice.googleMapsUrl,
          secondaryMapsUrl: safeSecMaps.ok
            ? safeSecMaps.value
            : targetOffice.secondaryMapsUrl,
          socialUrl: safeSocial.ok ? safeSocial.value : targetOffice.socialUrl,
          lat: lat ?? targetOffice.lat,
          lng: lng ?? targetOffice.lng,
          updatedAt: new Date().toISOString(),
        };
      }

      if (rawBackup.headProfile && typeof rawBackup.headProfile === 'object') {
        const bHead = rawBackup.headProfile as Record<string, unknown>;
        heads[headIdx] = {
          ...heads[headIdx],
          fullName:
            typeof bHead.fullName === 'string'
              ? bHead.fullName.trim().slice(0, 120)
              : heads[headIdx].fullName,
          title:
            typeof bHead.title === 'string' && bHead.title.trim()
              ? bHead.title.trim().slice(0, 120)
              : heads[headIdx].title,
          phone:
            typeof bHead.phone === 'string'
              ? bHead.phone.trim().slice(0, 60)
              : heads[headIdx].phone,
          email:
            typeof bHead.email === 'string'
              ? bHead.email.trim().slice(0, 160)
              : heads[headIdx].email,
          updatedAt: new Date().toISOString(),
        };
      }

      // 2. Restore Wilaya Members strictly within wilaya scope
      const existingRoster = readRoster();
      const otherWilayaRoster = existingRoster.filter(
        (m) => !isMemberOwnedByWilayaStrict(m.city, code, targetOffice.wilayaName, offices)
      );
      const otherWilayaNums = new Set(
        otherWilayaRoster.map((m) => m.membershipNumber.toUpperCase())
      );
      const existingByNum = new Map(
        existingRoster.map((m) => [m.membershipNumber.toUpperCase(), m])
      );

      const incomingMembersRaw = Array.isArray(rawBackup.members) ? rawBackup.members : [];
      const sanitizedWilayaMembers: InternalRosterRecord[] = [];
      for (const item of incomingMembersRaw) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const membershipNumber =
          typeof r.membershipNumber === 'string' ? r.membershipNumber.trim() : '';
        const fullName =
          typeof r.fullName === 'string' ? r.fullName.trim().slice(0, 120) : '';
        const nationalId =
          typeof r.nationalId === 'string' ? r.nationalId.trim().slice(0, 32) : '';
        if (
          !SAFE_ID_REGEX.test(membershipNumber) ||
          membershipNumber.length < 4 ||
          fullName.length < 2 ||
          !SAFE_ID_REGEX.test(nationalId)
        ) {
          continue;
        }
        const key = membershipNumber.toUpperCase();
        // Never overwrite a member belonging to a different wilaya
        if (otherWilayaNums.has(key)) continue;

        const existing = existingByNum.get(key);
        const rawCity = typeof r.city === 'string' ? r.city.trim().slice(0, 80) : '';
        const scopedCity = isMemberOwnedByWilayaStrict(
          rawCity,
          code,
          targetOffice.wilayaName,
          offices
        )
          ? rawCity
          : targetOffice.wilayaName;
        const plan =
          typeof r.coveragePlan === 'string' && VALID_PLANS.has(r.coveragePlan)
            ? r.coveragePlan
            : 'التغطية التكميلية+';
        const status =
          typeof r.status === 'string' && VALID_MEMBER_STATUSES.has(r.status)
            ? r.status
            : 'نشط';
        const rawCeiling = Number(r.annualCeiling);
        const rawSeniority = Number(r.seniorityYears);

        sanitizedWilayaMembers.push({
          membershipNumber,
          accessCode:
            existing?.accessCode ||
            crypto.randomBytes(4).toString('hex').toUpperCase(),
          fullName,
          email:
            typeof r.email === 'string' && r.email.trim()
              ? r.email.trim().slice(0, 160)
              : 'member@mutnatec.dz',
          nationalId,
          gender: r.gender === 'أنثى' ? 'أنثى' : 'ذكر',
          seniorityYears:
            Number.isFinite(rawSeniority) && rawSeniority >= 0 && rawSeniority <= 60
              ? Math.round(rawSeniority)
              : 5,
          enrollmentYear:
            typeof r.enrollmentYear === 'string' && /^\d{4}$/.test(r.enrollmentYear)
              ? r.enrollmentYear
              : '2026',
          sector:
            typeof r.sector === 'string' && r.sector.trim()
              ? r.sector.trim().slice(0, 100)
              : 'التربية الوطنية — التعليم الثانوي',
          city: scopedCity,
          municipality:
            typeof r.municipality === 'string' && r.municipality.trim()
              ? r.municipality.trim().slice(0, 80)
              : scopedCity,
          institution:
            typeof r.institution === 'string' && r.institution.trim()
              ? r.institution.trim().slice(0, 140)
              : 'مؤسسة تربوية',
          phone:
            typeof r.phone === 'string' && r.phone.trim()
              ? r.phone.trim().slice(0, 30)
              : '0550000000',
          rib:
            typeof r.rib === 'string' && r.rib.trim()
              ? r.rib.replace(/\s+/g, '').slice(0, 34)
              : '00799999000000000000',
          coveragePlan: plan,
          annualCeiling:
            Number.isFinite(rawCeiling) && rawCeiling >= 10000 && rawCeiling <= 2000000
              ? rawCeiling
              : 250000,
          status,
          notes:
            typeof r.notes === 'string' ? r.notes.trim().slice(0, 240) : '',
        });
      }

      let finalRoster: InternalRosterRecord[];
      if (mode === 'replace_wilaya') {
        finalRoster = [...sanitizedWilayaMembers, ...otherWilayaRoster];
      } else {
        const mergedMap = new Map(
          existingRoster.map((m) => [m.membershipNumber.toUpperCase(), m])
        );
        for (const m of sanitizedWilayaMembers) {
          mergedMap.set(m.membershipNumber.toUpperCase(), m);
        }
        finalRoster = Array.from(mergedMap.values());
      }

      const finalWilayaMemberNums = new Set(
        finalRoster
          .filter((m) =>
            isMemberOwnedByWilayaStrict(m.city, code, targetOffice.wilayaName, offices)
          )
          .map((m) => m.membershipNumber)
      );

      // 3. Restore Dependents, Claims & Authorizations strictly for this wilaya's members
      const store = readRecords();
      const incomingDeps = Array.isArray(rawBackup.dependents) ? rawBackup.dependents : [];
      const incomingClaims = Array.isArray(rawBackup.claims) ? rawBackup.claims : [];
      const incomingAuths = Array.isArray(rawBackup.authorizations)
        ? rawBackup.authorizations
        : [];

      const safeDeps = incomingDeps.filter(
        (d): d is InternalDependentRecord =>
          Boolean(d && typeof d === 'object') &&
          typeof (d as InternalDependentRecord).id === 'string' &&
          SAFE_ID_REGEX.test((d as InternalDependentRecord).id) &&
          finalWilayaMemberNums.has((d as InternalDependentRecord).ownerId)
      );

      const safeClaims = incomingClaims.filter(
        (c): c is InternalClaimRecord =>
          Boolean(c && typeof c === 'object') &&
          typeof (c as InternalClaimRecord).id === 'string' &&
          SAFE_ID_REGEX.test((c as InternalClaimRecord).id) &&
          finalWilayaMemberNums.has((c as InternalClaimRecord).ownerId) &&
          VALID_CLAIM_STATUSES.has((c as InternalClaimRecord).status)
      );

      const safeAuths = incomingAuths.filter(
        (a): a is InternalAuthRecord =>
          Boolean(a && typeof a === 'object') &&
          typeof (a as InternalAuthRecord).id === 'string' &&
          SAFE_ID_REGEX.test((a as InternalAuthRecord).id) &&
          finalWilayaMemberNums.has((a as InternalAuthRecord).ownerId) &&
          VALID_AUTH_STATUSES.has((a as InternalAuthRecord).status)
      );

      const mergeById = <T extends { id: string; ownerId: string }>(
        existingList: T[],
        incomingList: T[]
      ): T[] => {
        const otherRecords = existingList.filter(
          (item) => !finalWilayaMemberNums.has(item.ownerId)
        );
        if (mode === 'replace_wilaya') {
          return [...incomingList, ...otherRecords];
        }
        const map = new Map(existingList.map((item) => [item.id, item]));
        for (const item of incomingList) {
          map.set(item.id, item);
        }
        return Array.from(map.values());
      };

      const nextRecords: InternalRecordsStore = {
        dependents: mergeById(store.dependents, safeDeps),
        claims: mergeById(store.claims, safeClaims),
        authorizations: mergeById(store.authorizations, safeAuths),
      };

      // 4. Restore Enrollments strictly scoped to this wilaya
      const existingEnrollments = readEnrollments();
      const incomingEnrollments = Array.isArray(rawBackup.enrollments)
        ? rawBackup.enrollments
        : [];
      const safeEnrollments = incomingEnrollments
        .filter(
          (e): e is IndividualEnrollmentRecord =>
            Boolean(e && typeof e === 'object') &&
            typeof (e as IndividualEnrollmentRecord).id === 'string' &&
            SAFE_ID_REGEX.test((e as IndividualEnrollmentRecord).id) &&
            VALID_ENROLLMENT_STATUSES.has((e as IndividualEnrollmentRecord).status)
        )
        .map((e) => ({
          ...e,
          city: isMemberOwnedByWilayaStrict(
            e.city || '',
            code,
            targetOffice.wilayaName,
            offices
          )
            ? e.city
            : targetOffice.wilayaName,
        }));

      const otherEnrollments = existingEnrollments.filter(
        (e) => !isMemberOwnedByWilayaStrict(e.city, code, targetOffice.wilayaName, offices)
      );
      let finalEnrollments: IndividualEnrollmentRecord[];
      if (mode === 'replace_wilaya') {
        finalEnrollments = [...safeEnrollments, ...otherEnrollments];
      } else {
        const enrMap = new Map(existingEnrollments.map((e) => [e.id, e]));
        for (const e of safeEnrollments) {
          enrMap.set(e.id, e);
        }
        finalEnrollments = Array.from(enrMap.values());
      }

      writeWilayaOffices(offices);
      writeWilayaHeads(heads);
      writeRoster(finalRoster);
      writeRecords(nextRecords);
      writeEnrollments(finalEnrollments);
      await triggerExcelSync();

      res.json({
        restored: {
          membersCount: sanitizedWilayaMembers.length,
          claimsCount: safeClaims.length,
          dependentsCount: safeDeps.length,
          authorizationsCount: safeAuths.length,
          enrollmentsCount: safeEnrollments.length,
        },
        workspace: buildWilayaHeadWorkspacePayload(code),
      });
    }
  );

  app.get(
    '/api/wilaya-head/excel/export',
    requireWilayaHeadSession,
    async (req: AuthedWilayaHeadRequest, res: Response) => {
      try {
        const code = req.wilayaCode!;
        const offices = readWilayaOffices();
        const heads = readWilayaHeads();
        const office = offices.find((o) => o.code === code)!;
        const head = heads.find((h) => h.wilayaCode === code);

        const scopedMembers = readRoster().filter((m) =>
          isCityInWilayaScope(m.city, office.code, office.wilayaName)
        );
        const memberNums = new Set(scopedMembers.map((m) => m.membershipNumber));
        const scopedClaims = readRecords().claims.filter((c) =>
          memberNums.has(c.ownerId)
        );
        const scopedEnrollments = readEnrollments().filter((e) =>
          isCityInWilayaScope(e.city, office.code, office.wilayaName)
        );

        const buffer = await buildWilayaMembersWorkbookBuffer({
          wilaya: office,
          head: head
            ? {
                wilayaCode: head.wilayaCode,
                username: head.username,
                fullName: head.fullName,
                title: head.title,
                phone: head.phone,
                email: head.email,
                status: head.status,
              }
            : undefined,
          members: scopedMembers,
          claims: scopedClaims,
          enrollments: scopedEnrollments,
        });

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="MUTNATEC-Wilaya-${code}-Members.xlsx"`
        );
        res.send(buffer);
      } catch {
        res.status(500).json({ error: 'تعذر تصدير قاعدة بيانات Excel للولاية.' });
      }
    }
  );

  app.post(
    '/api/wilaya-head/excel/import',
    express.json({ limit: '6mb' }),
    requireWilayaHeadSession,
    async (req: AuthedWilayaHeadRequest, res: Response) => {
      try {
        const code = req.wilayaCode!;
        const body = req.body as { fileBase64?: unknown; mode?: unknown };
        const rawB64 = typeof body.fileBase64 === 'string' ? body.fileBase64.trim() : '';
        const mode = body.mode === 'replace_wilaya' ? 'replace_wilaya' : 'merge';

        if (!rawB64 || rawB64.length > 6 * 1024 * 1024) {
          res.status(400).json({
            error: 'ملف Excel غير صالح أو يتجاوز الحجم المسموح (4 ميغابايت).',
          });
          return;
        }

        const cleanB64 = rawB64.includes(',') ? rawB64.split(',').pop() || '' : rawB64;
        const buffer = Buffer.from(cleanB64, 'base64');
        if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024) {
          res.status(400).json({ error: 'حجم ملف Excel غير مقبول.' });
          return;
        }

        const parsedRows = await parseWarehouseOrWilayaMembersExcel(
          buffer,
          {
            safeIdRegex: SAFE_ID_REGEX,
            validPlans: VALID_PLANS,
            validStatuses: VALID_MEMBER_STATUSES,
          },
          code
        );

        const offices = readWilayaOffices();
        const targetOffice = offices.find((o) => o.code === code)!;
        const existingRoster = readRoster();
        const otherWilayaRoster = existingRoster.filter(
          (m) => !isMemberOwnedByWilayaStrict(m.city, code, targetOffice.wilayaName, offices)
        );
        const otherWilayaNums = new Set(
          otherWilayaRoster.map((m) => m.membershipNumber.toUpperCase())
        );
        const existingByNum = new Map(
          existingRoster.map((m) => [m.membershipNumber.toUpperCase(), m])
        );

        // Keep only rows that match this wilaya (or have blank/matching hint) and don't collide with other wilayas
        const scopedIncoming: InternalRosterRecord[] = [];
        for (const row of parsedRows) {
          if (row.wilayaCodeHint && row.wilayaCodeHint !== code) continue;
          if (
            row.city &&
            row.city !== 'الجزائر' &&
            !isMemberOwnedByWilayaStrict(row.city, code, targetOffice.wilayaName, offices)
          ) {
            continue;
          }
          const key = row.membershipNumber.toUpperCase();
          if (otherWilayaNums.has(key)) continue;

          const prev = existingByNum.get(key);
          scopedIncoming.push({
            membershipNumber: row.membershipNumber,
            accessCode:
              row.accessCode && row.accessCode.length >= 4
                ? row.accessCode
                : prev?.accessCode || crypto.randomBytes(4).toString('hex').toUpperCase(),
            fullName: row.fullName,
            email: row.email,
            nationalId: row.nationalId,
            gender: row.gender,
            seniorityYears: row.seniorityYears,
            enrollmentYear: row.enrollmentYear || prev?.enrollmentYear || '2026',
            sector: row.sector,
            city: isMemberOwnedByWilayaStrict(
              row.city,
              code,
              targetOffice.wilayaName,
              offices
            )
              ? row.city
              : targetOffice.wilayaName,
            municipality: row.municipality || targetOffice.wilayaName,
            institution: row.institution,
            phone: row.phone,
            rib: row.rib,
            coveragePlan: row.coveragePlan,
            annualCeiling: row.annualCeiling,
            status: row.status,
            notes: row.notes || prev?.notes || '',
          });
        }

        if (scopedIncoming.length === 0) {
          res.status(400).json({
            error: `لم يتم العثور على سجلات منخرطين خاصة بالولاية (${targetOffice.wilayaName}) داخل ملف Excel المرفوع.`,
          });
          return;
        }

        let nextRoster: InternalRosterRecord[];
        if (mode === 'replace_wilaya') {
          nextRoster = [...scopedIncoming, ...otherWilayaRoster];
        } else {
          const merged = new Map(
            existingRoster.map((m) => [m.membershipNumber.toUpperCase(), m])
          );
          for (const m of scopedIncoming) {
            merged.set(m.membershipNumber.toUpperCase(), m);
          }
          nextRoster = Array.from(merged.values());
        }

        writeRoster(nextRoster);
        await triggerExcelSync();

        res.json({
          importedCount: scopedIncoming.length,
          workspace: buildWilayaHeadWorkspacePayload(code),
        });
      } catch {
        res.status(400).json({
          error: 'تعذر قراءة ملف Excel (.xlsx) أو استعادة البيانات منه.',
        });
      }
    }
  );

  // --- Admin Wilaya Head Account Management ---
  app.get('/api/admin/wilaya-heads', requireAdminSession, (_req: Request, res: Response) => {
    const offices = readWilayaOffices();
    const heads = readWilayaHeads();
    const officeByCode = new Map(offices.map((o) => [o.code, o]));
    const accounts = heads.map((h) => sanitizeWilayaHeadForClient(h, officeByCode.get(h.wilayaCode)!));
    res.json({ accounts });
  });

  app.put(
    '/api/admin/wilaya-heads/:code',
    requireAdminSession,
    async (req: Request, res: Response) => {
      const code = String(req.params.code || '').trim().padStart(2, '0');
      if (!isValidWilayaCode(code)) {
        res.status(400).json({ error: 'رمز الولاية غير صالح (01 إلى 96).' });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const safeMaps = sanitizeWebUrl(body.googleMapsUrl);
      if (!safeMaps.ok) {
        res.status(400).json({ error: 'رابط خرائط قوقل غير صالح.' });
        return;
      }
      const safeSecMaps = sanitizeWebUrl(body.secondaryMapsUrl);
      if (!safeSecMaps.ok) {
        res.status(400).json({ error: 'رابط المقر الثاني غير صالح.' });
        return;
      }
      const safeSocial = sanitizeWebUrl(body.socialUrl);
      if (!safeSocial.ok) {
        res.status(400).json({ error: 'رابط الحساب الرسمي غير صالح.' });
        return;
      }

      const offices = readWilayaOffices();
      const heads = readWilayaHeads();
      const officeIdx = offices.findIndex((o) => o.code === code);
      const headIdx = heads.findIndex((h) => h.wilayaCode === code);
      if (officeIdx === -1 || headIdx === -1) {
        res.status(404).json({ error: 'السجل الولائي غير موجود.' });
        return;
      }

      const requestedUsername =
        typeof body.username === 'string' && body.username.trim().length >= 3
          ? body.username.trim().toLowerCase().slice(0, 48)
          : heads[headIdx].username;
      if (!/^[a-z0-9_.-]+$/.test(requestedUsername)) {
        res.status(400).json({
          error: 'اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام فقط (مثال: head16).',
        });
        return;
      }
      if (
        heads.some(
          (h) => h.wilayaCode !== code && h.username.toLowerCase() === requestedUsername
        )
      ) {
        res.status(409).json({ error: 'اسم المستخدم مستخدم من قبل ولاية أخرى.' });
        return;
      }

      const newPassword =
        typeof body.password === 'string' ? body.password.trim() : '';
      let passwordSalt = heads[headIdx].passwordSalt;
      let passwordHash = heads[headIdx].passwordHash;
      if (newPassword) {
        if (newPassword.length < 6 || newPassword.length > 72) {
          res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
          return;
        }
        const hashed = hashWilayaHeadPassword(newPassword);
        passwordSalt = hashed.salt;
        passwordHash = hashed.hash;
      }

      let lat = parseOptionalCoord(body.lat, -90, 90);
      let lng = parseOptionalCoord(body.lng, -180, 180);
      if ((lat === undefined || lng === undefined) && safeMaps.value) {
        const resolved = await resolveMapsRedirectCoords(safeMaps.value);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
        }
      }

      const fullName =
        typeof body.fullName === 'string'
          ? body.fullName.trim().slice(0, 120)
          : heads[headIdx].fullName;
      const title =
        typeof body.title === 'string' && body.title.trim()
          ? body.title.trim().slice(0, 120)
          : heads[headIdx].title;
      const phone =
        typeof body.phone === 'string' ? body.phone.trim().slice(0, 60) : heads[headIdx].phone;
      const email =
        typeof body.email === 'string' ? body.email.trim().slice(0, 160) : heads[headIdx].email;
      const status: 'نشط' | 'معلق' = body.status === 'معلق' ? 'معلق' : 'نشط';
      const now = new Date().toISOString();

      heads[headIdx] = {
        ...heads[headIdx],
        username: requestedUsername,
        fullName,
        title,
        phone,
        email,
        status,
        passwordSalt,
        passwordHash,
        updatedAt: now,
      };
      writeWilayaHeads(heads);

      offices[officeIdx] = {
        ...offices[officeIdx],
        officeName:
          typeof body.officeName === 'string'
            ? body.officeName.trim().slice(0, 140)
            : offices[officeIdx].officeName,
        representativeName: fullName,
        headTitle: title,
        phone,
        accountInfo:
          typeof body.accountInfo === 'string'
            ? body.accountInfo.trim().slice(0, 180)
            : offices[officeIdx].accountInfo,
        socialUrl: safeSocial.value,
        address:
          typeof body.address === 'string'
            ? body.address.trim().slice(0, 220)
            : offices[officeIdx].address,
        googleMapsUrl: safeMaps.value,
        secondaryMapsUrl: safeSecMaps.value,
        ...(lat !== undefined && lng !== undefined
          ? { lat, lng }
          : { lat: offices[officeIdx].lat, lng: offices[officeIdx].lng }),
        updatedAt: now,
      };
      writeWilayaOffices(offices);

      const officeByCode = new Map(offices.map((o) => [o.code, o]));
      res.json({
        account: sanitizeWilayaHeadForClient(heads[headIdx], offices[officeIdx]),
        accounts: heads.map((h) => sanitizeWilayaHeadForClient(h, officeByCode.get(h.wilayaCode)!)),
      });
    }
  );

  app.post(
    '/api/admin/wilaya-heads/bulk-provision',
    requireAdminSession,
    (req: Request, res: Response) => {
      const body = req.body as { mode?: unknown };
      const resetExisting = body.mode === 'reset_all';
      const offices = readWilayaOffices();
      const heads = readWilayaHeads();
      const officeByCode = new Map(offices.map((o) => [o.code, o]));
      const now = new Date().toISOString();
      const generatedCredentials: Array<{
        wilayaCode: string;
        wilayaName: string;
        username: string;
        password: string;
        fullName: string;
      }> = [];

      for (let i = 0; i < heads.length; i += 1) {
        const current = heads[i];
        if (!resetExisting && current.passwordHash && current.passwordSalt) {
          continue;
        }
        const plainPassword = `MT-${current.wilayaCode}-${crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase()}`;
        const { salt, hash } = hashWilayaHeadPassword(plainPassword);
        const office = officeByCode.get(current.wilayaCode)!;
        heads[i] = {
          ...current,
          status: 'نشط',
          passwordSalt: salt,
          passwordHash: hash,
          updatedAt: now,
        };
        generatedCredentials.push({
          wilayaCode: current.wilayaCode,
          wilayaName: office.wilayaName,
          username: heads[i].username,
          password: plainPassword,
          fullName: heads[i].fullName || office.representativeName || '',
        });
      }

      writeWilayaHeads(heads);
      res.json({
        provisionedCount: generatedCredentials.length,
        credentials: generatedCredentials,
        accounts: heads.map((h) =>
          sanitizeWilayaHeadForClient(h, officeByCode.get(h.wilayaCode)!)
        ),
      });
    }
  );

  // --- Wilaya Offices (96 Wilayas Public Read & Admin Management) ---
  app.get('/api/wilaya-offices', (_req: Request, res: Response) => {
    const offices = readWilayaOffices();
    res.json({ offices });
  });

  app.put(
    '/api/admin/wilaya-offices/:code',
    requireAdminSession,
    async (req: Request, res: Response) => {
      const code = String(req.params.code || '').trim();
      if (!isValidWilayaCode(code)) {
        res.status(400).json({ error: 'رمز الولاية غير صالح (يجب أن يكون من 01 إلى 96).' });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const safeMaps = sanitizeWebUrl(body.googleMapsUrl);
      if (!safeMaps.ok) {
        res.status(400).json({
          error: 'رابط خرائط قوقل غير صالح. يجب أن يبدأ بـ https:// أو http://',
        });
        return;
      }
      const safeSocial = sanitizeWebUrl(body.socialUrl);
      if (!safeSocial.ok) {
        res.status(400).json({
          error: 'رابط الحساب الإلكتروني غير صالح. يجب أن يبدأ بـ https:// أو http://',
        });
        return;
      }

      const offices = readWilayaOffices();
      const idx = offices.findIndex((o) => o.code === code);
      if (idx === -1) {
        res.status(404).json({ error: 'السجل غير موجود.' });
        return;
      }

      const existing = offices[idx];
      const nextWilayaName =
        typeof body.wilayaName === 'string' && body.wilayaName.trim().length >= 2
          ? body.wilayaName.trim().slice(0, 80)
          : existing.wilayaName;

      let lat = parseOptionalCoord(body.lat, -90, 90);
      let lng = parseOptionalCoord(body.lng, -180, 180);
      if ((lat === undefined || lng === undefined) && safeMaps.value) {
        const resolved = await resolveMapsRedirectCoords(safeMaps.value);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
        }
      }

      const repName =
        typeof body.representativeName === 'string'
          ? body.representativeName.trim().slice(0, 120)
          : '';
      const phoneVal = typeof body.phone === 'string' ? body.phone.trim().slice(0, 60) : '';

      const updated: WilayaOfficeRecord = {
        code,
        wilayaName: nextWilayaName,
        officeName:
          typeof body.officeName === 'string' ? body.officeName.trim().slice(0, 140) : '',
        representativeName: repName,
        headTitle: existing.headTitle,
        phone: phoneVal,
        accountInfo:
          typeof body.accountInfo === 'string' ? body.accountInfo.trim().slice(0, 180) : '',
        socialUrl: safeSocial.value,
        address: typeof body.address === 'string' ? body.address.trim().slice(0, 220) : '',
        googleMapsUrl: safeMaps.value,
        secondaryMapsUrl: sanitizeWebUrl(body.secondaryMapsUrl).value,
        ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
        updatedAt: new Date().toISOString(),
      };

      offices[idx] = updated;
      writeWilayaOffices(offices);

      const heads = readWilayaHeads();
      const hIdx = heads.findIndex((h) => h.wilayaCode === code);
      if (hIdx !== -1) {
        heads[hIdx] = {
          ...heads[hIdx],
          fullName: repName || heads[hIdx].fullName,
          phone: phoneVal || heads[hIdx].phone,
          updatedAt: updated.updatedAt,
        };
        writeWilayaHeads(heads);
      }

      res.json({ office: updated, offices });
    }
  );

  app.delete(
    '/api/admin/wilaya-offices/:code',
    requireAdminSession,
    (req: Request, res: Response) => {
      const code = String(req.params.code || '').trim();
      if (!isValidWilayaCode(code)) {
        res.status(400).json({ error: 'رمز الولاية غير صالح.' });
        return;
      }
      const offices = readWilayaOffices();
      const idx = offices.findIndex((o) => o.code === code);
      if (idx === -1) {
        res.status(404).json({ error: 'السجل غير موجود.' });
        return;
      }
      offices[idx] = {
        ...offices[idx],
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
      writeWilayaOffices(offices);
      res.json({ offices });
    }
  );

  app.post(
    '/api/admin/wilaya-offices/import',
    requireAdminSession,
    (req: Request, res: Response) => {
      const body = req.body as { offices?: unknown };
      if (!Array.isArray(body.offices)) {
        res.status(400).json({ error: 'صيغة الملف غير صالحة (مطلوب مصفوفة JSON).' });
        return;
      }

      const offices = readWilayaOffices();
      const byCode = new Map(offices.map((o, i) => [o.code, i]));
      let updatedCount = 0;

      for (const item of body.offices) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const rawCode =
          typeof r.code === 'string' || typeof r.code === 'number'
            ? String(r.code).trim().padStart(2, '0')
            : '';
        if (!isValidWilayaCode(rawCode)) continue;
        const idx = byCode.get(rawCode);
        if (idx === undefined) continue;

        const safeMaps = sanitizeWebUrl(r.googleMapsUrl);
        const safeSocial = sanitizeWebUrl(r.socialUrl);
        const safeSecMaps = sanitizeWebUrl(r.secondaryMapsUrl);
        const impLat = parseOptionalCoord(r.lat, -90, 90);
        const impLng = parseOptionalCoord(r.lng, -180, 180);
        offices[idx] = {
          code: rawCode,
          wilayaName:
            typeof r.wilayaName === 'string' && r.wilayaName.trim().length >= 2
              ? r.wilayaName.trim().slice(0, 80)
              : offices[idx].wilayaName,
          officeName:
            typeof r.officeName === 'string' ? r.officeName.trim().slice(0, 140) : '',
          representativeName:
            typeof r.representativeName === 'string'
              ? r.representativeName.trim().slice(0, 120)
              : '',
          headTitle:
            typeof r.headTitle === 'string' ? r.headTitle.trim().slice(0, 120) : offices[idx].headTitle,
          phone: typeof r.phone === 'string' ? r.phone.trim().slice(0, 60) : '',
          accountInfo:
            typeof r.accountInfo === 'string' ? r.accountInfo.trim().slice(0, 180) : '',
          socialUrl: safeSocial.ok ? safeSocial.value : '',
          address: typeof r.address === 'string' ? r.address.trim().slice(0, 220) : '',
          googleMapsUrl: safeMaps.ok ? safeMaps.value : '',
          secondaryMapsUrl: safeSecMaps.ok ? safeSecMaps.value : '',
          ...(impLat !== undefined && impLng !== undefined ? { lat: impLat, lng: impLng } : {}),
          updatedAt: new Date().toISOString(),
        };
        updatedCount += 1;
      }

      if (updatedCount === 0) {
        res.status(400).json({ error: 'لم يتم العثور على سجلات ولائية صالحة (01 إلى 96).' });
        return;
      }

      writeWilayaOffices(offices);
      res.json({ offices, count: updatedCount });
    }
  );

  // --- Individual Electronic Enrollment API ---
  app.post('/api/enrollments', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
    const socialSecurityNumber =
      typeof body.socialSecurityNumber === 'string'
        ? body.socialSecurityNumber.replace(/\s+/g, '').slice(0, 32)
        : '';
    const nationalId =
      typeof body.nationalId === 'string'
        ? body.nationalId.replace(/\s+/g, '').slice(0, 32)
        : '';
    const gender: 'ذكر' | 'أنثى' = body.gender === 'أنثى' ? 'أنثى' : 'ذكر';
    const seniorityYears = Math.max(0, Math.min(50, Math.round(Number(body.seniorityYears) || 0)));
    const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 160) : '';
    const sector =
      typeof body.sector === 'string' && body.sector.trim().length >= 2
        ? body.sector.trim().slice(0, 100)
        : 'التربية الوطنية — التعليم الثانوي';
    const city =
      typeof body.city === 'string' && body.city.trim().length >= 2
        ? body.city.trim().slice(0, 80)
        : 'الجزائر';
    const municipality =
      typeof body.municipality === 'string' && body.municipality.trim().length >= 2
        ? body.municipality.trim().slice(0, 80)
        : city;
    const workplace =
      typeof body.workplace === 'string' ? body.workplace.trim().slice(0, 140) : '';
    const rib =
      typeof body.rib === 'string' ? body.rib.replace(/\s+/g, '').slice(0, 34) : '';
    const coveragePlan =
      typeof body.coveragePlan === 'string' && VALID_PLANS.has(body.coveragePlan)
        ? body.coveragePlan
        : 'التغطية التكميلية+';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : '';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'يرجى إدخال الاسم واللقب الكاملين.' });
      return;
    }
    if (!SAFE_ID_REGEX.test(socialSecurityNumber) || socialSecurityNumber.length < 4) {
      res.status(400).json({ error: 'رقم الضمان الاجتماعي (NSS) غير صالح.' });
      return;
    }
    if (!SAFE_ID_REGEX.test(nationalId) || nationalId.length < 4) {
      res.status(400).json({ error: 'رقم التعريف الوطني (NIN) غير صالح.' });
      return;
    }
    if (!ISO_DATE_REGEX.test(birthDate)) {
      res.status(400).json({ error: 'تاريخ الميلاد غير صالح.' });
      return;
    }
    if (phone.length < 6) {
      res.status(400).json({ error: 'يرجى إدخال رقم هاتف صحيح.' });
      return;
    }
    if (rib.length < 10) {
      res.status(400).json({ error: 'رقم الحساب البريدي (CCP/RIP) أو البنكي (RIB) غير مكتمل.' });
      return;
    }

    const enrollments = readEnrollments();
    const duplicate = enrollments.find(
      (e) =>
        e.status !== 'مرفوض / استكمال وثائق' &&
        (e.nationalId === nationalId ||
          (e.socialSecurityNumber && e.socialSecurityNumber === socialSecurityNumber))
    );
    if (duplicate) {
      res.status(409).json({
        error:
          'يوجد طلب انخراط مسجل مسبقاً بنفس رقم التعريف الوطني أو الضمان الاجتماعي. يرجى متابعة طلبكم عبر تبويب المتابعة.',
      });
      return;
    }

    const now = new Date().toISOString();
    const randomNum = crypto.randomInt(1000, 9999);
    const trackingCode = `REQ-2026-${randomNum}`;
    const record: IndividualEnrollmentRecord = {
      id: `ENR-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      trackingCode,
      fullName,
      socialSecurityNumber,
      nationalId,
      gender,
      seniorityYears,
      birthDate,
      phone,
      email: email || 'member@mutnatec.dz',
      sector,
      city,
      municipality,
      workplace,
      rib,
      coveragePlan,
      notes,
      status: 'جاري التدقيق والموافقة',
      statusMessage: DEFAULT_ENROLLMENT_AUDIT_MSG,
      assignedMembershipNumber: '',
      assignedAccessCode: '',
      reviewerNote: '',
      createdAt: now,
      updatedAt: now,
    };

    enrollments.push(record);
    writeEnrollments(enrollments);
    res.status(201).json({
      enrollment: {
        id: record.id,
        trackingCode: record.trackingCode,
        fullName: record.fullName,
        status: record.status,
        statusMessage: record.statusMessage,
        createdAt: record.createdAt,
      },
    });
  });

  app.post('/api/enrollments/check', (req: Request, res: Response) => {
    const body = req.body as { trackingCode?: unknown; nationalId?: unknown };
    const trackingCode =
      typeof body.trackingCode === 'string' ? body.trackingCode.trim().toUpperCase() : '';
    const nationalId =
      typeof body.nationalId === 'string' ? body.nationalId.replace(/\s+/g, '') : '';

    if (!trackingCode || !nationalId) {
      res.status(400).json({ error: 'يرجى إدخال رقم المتابعة ورقم التعريف الوطني (NIN).' });
      return;
    }

    const enrollments = readEnrollments();
    const found = enrollments.find(
      (e) =>
        e.trackingCode.toUpperCase() === trackingCode &&
        (e.nationalId === nationalId ||
          (e.socialSecurityNumber && e.socialSecurityNumber === nationalId))
    );
    if (!found) {
      res.status(404).json({ error: 'لم يتم العثور على طلب انخراط مطابق لهذه المعطيات.' });
      return;
    }

    res.json({
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
    });
  });

  app.get('/api/admin/enrollments', requireAdminSession, (_req: Request, res: Response) => {
    const enrollments = readEnrollments().sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    res.json({ enrollments });
  });

  app.patch(
    '/api/admin/enrollments/:id',
    requireAdminSession,
    (req: Request, res: Response) => {
      const enrollments = readEnrollments();
      const idx = enrollments.findIndex((e) => e.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'طلب الانخراط غير موجود.' });
        return;
      }

      const body = req.body as {
        status?: unknown;
        reviewerNote?: unknown;
        assignedMembershipNumber?: unknown;
        assignedAccessCode?: unknown;
      };
      const existing = enrollments[idx];
      const nextStatus =
        typeof body.status === 'string' && VALID_ENROLLMENT_STATUSES.has(body.status)
          ? (body.status as IndividualEnrollmentRecord['status'])
          : existing.status;
      const reviewerNote =
        typeof body.reviewerNote === 'string'
          ? body.reviewerNote.trim().slice(0, 400)
          : existing.reviewerNote;

      let assignedMembershipNumber = existing.assignedMembershipNumber;
      let assignedAccessCode = existing.assignedAccessCode;
      let statusMessage = DEFAULT_ENROLLMENT_AUDIT_MSG;

      if (nextStatus === 'تمت الموافقة والتسجيل') {
        const reqMem =
          typeof body.assignedMembershipNumber === 'string'
            ? body.assignedMembershipNumber.trim()
            : '';
        const reqCode =
          typeof body.assignedAccessCode === 'string'
            ? body.assignedAccessCode.trim()
            : '';

        assignedMembershipNumber =
          reqMem && SAFE_ID_REGEX.test(reqMem) && reqMem.length >= 4
            ? reqMem
            : assignedMembershipNumber || `MUT-2026-${crypto.randomInt(2000, 9999)}`;
        assignedAccessCode =
          reqCode && reqCode.length >= 4
            ? reqCode.slice(0, 64)
            : assignedAccessCode || String(crypto.randomInt(100000, 999999));

        statusMessage =
          'تمت الموافقة على الانخراط من طرف الإدارة وتفعيل الحساب في الملف الداخلي.';

        // Enroll into internal-members.json roster automatically
        const roster = readRoster();
        const existingMemberIdx = roster.findIndex(
          (m) => m.membershipNumber === assignedMembershipNumber
        );
        const annualCeiling =
          existing.coveragePlan === 'التغطية العائلية المميزة'
            ? 350000
            : existing.coveragePlan === 'التغطية التكميلية+'
            ? 250000
            : 180000;

        const rosterEntry: InternalRosterRecord = {
          membershipNumber: assignedMembershipNumber,
          accessCode: assignedAccessCode,
          fullName: existing.fullName,
          email: existing.email,
          nationalId: existing.nationalId,
          socialSecurityNumber: existing.socialSecurityNumber || existing.nationalId,
          birthDate: existing.birthDate,
          birthPlace: existing.city,
          jobTitle: existing.sector,
          memberRole: 'منخرط نشط',
          enrollmentYear: existing.createdAt.slice(0, 4) || '2026',
          gender: existing.gender || 'ذكر',
          seniorityYears: existing.seniorityYears ?? 1,
          sector: existing.sector,
          city: existing.city,
          municipality: existing.municipality || existing.city,
          institution: existing.workplace || existing.sector,
          phone: existing.phone,
          rib: existing.rib,
          coveragePlan: existing.coveragePlan,
          annualCeiling,
          status: 'نشط',
        };
        if (existingMemberIdx === -1) {
          roster.push(rosterEntry);
        } else {
          roster[existingMemberIdx] = rosterEntry;
        }
        writeRoster(roster);
      } else if (nextStatus === 'مرفوض / استكمال وثائق') {
        statusMessage = 'يتطلب استكمال الوثائق أو مراجعة الإدارة.';
      } else {
        statusMessage = DEFAULT_ENROLLMENT_AUDIT_MSG;
      }

      enrollments[idx] = {
        ...existing,
        status: nextStatus,
        statusMessage,
        reviewerNote,
        assignedMembershipNumber,
        assignedAccessCode,
        updatedAt: new Date().toISOString(),
      };
      writeEnrollments(enrollments);
      res.json({ enrollment: enrollments[idx] });
    }
  );

  // --- Admin Reports & Excel Database Sync / Export / Import ---
  app.get('/api/admin/reports/summary', requireAdminSession, async (_req: Request, res: Response) => {
    try {
      const { excelFile } = getExcelPaths(DATA_DIR);
      let syncMeta = readExcelSyncMeta(DATA_DIR);
      if (!fs.existsSync(excelFile) || !syncMeta.lastSyncedAt) {
        syncMeta = await triggerExcelSync();
      }
      const reports = computeReportsData(getDatabaseSnapshot(), syncMeta);
      res.json(reports);
    } catch {
      res.status(500).json({ error: 'تعذر إعداد التقارير الإدارية والمالية.' });
    }
  });

  app.post('/api/admin/excel/sync', requireAdminSession, async (_req: Request, res: Response) => {
    try {
      const syncMeta = await triggerExcelSync();
      const reports = computeReportsData(getDatabaseSnapshot(), syncMeta);
      res.json({ excelSync: syncMeta, reports });
    } catch {
      res.status(500).json({ error: 'تعذر مزامنة قاعدة بيانات Excel في الوقت الحالي.' });
    }
  });

  app.get('/api/admin/excel/export', requireAdminSession, async (_req: Request, res: Response) => {
    try {
      await triggerExcelSync();
      const { excelFile } = getExcelPaths(DATA_DIR);
      const buffer = fs.readFileSync(excelFile);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="MUTNATEC-Database-Reports.xlsx"'
      );
      res.send(buffer);
    } catch {
      res.status(500).json({ error: 'تعذر تصدير ملف قاعدة بيانات Excel.' });
    }
  });

  app.post(
    '/api/admin/excel/import',
    express.json({ limit: '6mb' }),
    requireAdminSession,
    async (req: Request, res: Response) => {
      try {
        const body = req.body as { fileBase64?: unknown; mode?: unknown };
        const rawB64 = typeof body.fileBase64 === 'string' ? body.fileBase64.trim() : '';
        const mode = body.mode === 'replace' ? 'replace' : 'merge';

        if (!rawB64 || rawB64.length > 6 * 1024 * 1024) {
          res.status(400).json({ error: 'ملف Excel غير صالح أو يتجاوز الحجم المسموح (4 ميغابايت).' });
          return;
        }

        const cleanB64 = rawB64.includes(',') ? rawB64.split(',').pop() || '' : rawB64;
        const buffer = Buffer.from(cleanB64, 'base64');
        if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024) {
          res.status(400).json({ error: 'حجم ملف Excel غير مقبول.' });
          return;
        }

        const parsed = await parseExcelImportWorkbook(buffer, {
          safeIdRegex: SAFE_ID_REGEX,
          validPlans: VALID_PLANS,
          validStatuses: VALID_MEMBER_STATUSES,
          isValidWilayaCode,
          sanitizeWebUrl,
        });

        if (parsed.roster.length === 0 && parsed.wilayas.length === 0) {
          res.status(400).json({
            error:
              'لم يتم العثور على أوراق عمل أو سجلات صالحة داخل ملف Excel (تأكد من استخدام نموذج قاعدة بيانات التعاضدية).',
          });
          return;
        }

        let importedRosterCount = 0;
        if (parsed.roster.length > 0) {
          if (mode === 'replace') {
            writeRoster(parsed.roster);
            importedRosterCount = parsed.roster.length;
          } else {
            const current = readRoster();
            const byNum = new Map(current.map((m, i) => [m.membershipNumber.toUpperCase(), i]));
            for (const row of parsed.roster) {
              const idx = byNum.get(row.membershipNumber.toUpperCase());
              if (idx === undefined) {
                current.push(row);
                byNum.set(row.membershipNumber.toUpperCase(), current.length - 1);
              } else {
                current[idx] = row;
              }
              importedRosterCount += 1;
            }
            writeRoster(current);
          }
        }

        let importedWilayasCount = 0;
        if (parsed.wilayas.length > 0) {
          const offices = readWilayaOffices();
          const byCode = new Map(offices.map((o, i) => [o.code, i]));
          for (const w of parsed.wilayas) {
            const idx = byCode.get(w.code);
            if (idx === undefined) continue;
            offices[idx] = {
              ...offices[idx],
              wilayaName: w.wilayaName || offices[idx].wilayaName,
              officeName: w.officeName ?? offices[idx].officeName,
              representativeName: w.representativeName ?? offices[idx].representativeName,
              phone: w.phone ?? offices[idx].phone,
              accountInfo: w.accountInfo ?? offices[idx].accountInfo,
              address: w.address ?? offices[idx].address,
              googleMapsUrl: w.googleMapsUrl ?? offices[idx].googleMapsUrl,
              secondaryMapsUrl: w.secondaryMapsUrl ?? offices[idx].secondaryMapsUrl,
              socialUrl: w.socialUrl ?? offices[idx].socialUrl,
              updatedAt: new Date().toISOString(),
            };
            importedWilayasCount += 1;
          }
          if (importedWilayasCount > 0) {
            writeWilayaOffices(offices);
          }
        }

        const syncMeta = await triggerExcelSync();
        const reports = computeReportsData(getDatabaseSnapshot(), syncMeta);
        res.json({
          importedRosterCount,
          importedWilayasCount,
          excelSync: syncMeta,
          reports,
        });
      } catch {
        res.status(400).json({ error: 'تعذر قراءة ملف Excel (.xlsx). يرجى التحقق من سلامة الملف.' });
      }
    }
  );

  // --- National Members Excel Warehouse (96 Wilayas Database) ---
  app.get(
    '/api/admin/national-warehouse/meta',
    requireAdminSession,
    async (_req: Request, res: Response) => {
      try {
        const { warehouseFile } = getNationalWarehousePaths(DATA_DIR);
        let meta = readNationalWarehouseMeta(DATA_DIR);
        if (!fs.existsSync(warehouseFile) || !meta.lastSyncedAt) {
          await triggerExcelSync();
          meta = readNationalWarehouseMeta(DATA_DIR);
        }
        res.json(meta);
      } catch {
        res.status(500).json({ error: 'تعذر قراءة بيانات المخزن الوطني لملفات المنخرطين.' });
      }
    }
  );

  app.post(
    '/api/admin/national-warehouse/sync',
    requireAdminSession,
    async (_req: Request, res: Response) => {
      try {
        await triggerExcelSync();
        const meta = readNationalWarehouseMeta(DATA_DIR);
        res.json(meta);
      } catch {
        res.status(500).json({ error: 'تعذر تحديث ومزامنة المخزن الوطني Excel.' });
      }
    }
  );

  app.get(
    '/api/admin/national-warehouse/export',
    requireAdminSession,
    async (_req: Request, res: Response) => {
      try {
        await triggerExcelSync();
        const { warehouseFile } = getNationalWarehousePaths(DATA_DIR);
        const buffer = fs.readFileSync(warehouseFile);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="MUTNATEC-National-Members-Warehouse-96Wilayas.xlsx"'
        );
        res.send(buffer);
      } catch {
        res.status(500).json({ error: 'تعذر تصدير ملف المخزن الوطني Excel.' });
      }
    }
  );

  app.get(
    '/api/admin/national-warehouse/wilaya/:code/export',
    requireAdminSession,
    async (req: Request, res: Response) => {
      try {
        const code = String(req.params.code || '').trim().padStart(2, '0');
        if (!isValidWilayaCode(code)) {
          res.status(400).json({ error: 'رمز الولاية غير صالح (01 إلى 96).' });
          return;
        }
        const offices = readWilayaOffices();
        const heads = readWilayaHeads();
        const office = offices.find((o) => o.code === code)!;
        const head = heads.find((h) => h.wilayaCode === code);

        const scopedMembers = readRoster().filter((m) =>
          isCityInWilayaScope(m.city, office.code, office.wilayaName)
        );
        const memberNums = new Set(scopedMembers.map((m) => m.membershipNumber));
        const scopedClaims = readRecords().claims.filter((c) =>
          memberNums.has(c.ownerId)
        );
        const scopedEnrollments = readEnrollments().filter((e) =>
          isCityInWilayaScope(e.city, office.code, office.wilayaName)
        );

        const buffer = await buildWilayaMembersWorkbookBuffer({
          wilaya: office,
          head: head
            ? {
                wilayaCode: head.wilayaCode,
                username: head.username,
                fullName: head.fullName,
                title: head.title,
                phone: head.phone,
                email: head.email,
                status: head.status,
              }
            : undefined,
          members: scopedMembers,
          claims: scopedClaims,
          enrollments: scopedEnrollments,
        });

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="MUTNATEC-Wilaya-${code}-Members.xlsx"`
        );
        res.send(buffer);
      } catch {
        res.status(500).json({ error: 'تعذر تصدير ملف Excel للولاية المطلوبة.' });
      }
    }
  );

  app.post(
    '/api/admin/national-warehouse/import',
    express.json({ limit: '6mb' }),
    requireAdminSession,
    async (req: Request, res: Response) => {
      try {
        const body = req.body as { fileBase64?: unknown; mode?: unknown };
        const rawB64 = typeof body.fileBase64 === 'string' ? body.fileBase64.trim() : '';
        const mode = body.mode === 'replace' ? 'replace' : 'merge';

        if (!rawB64 || rawB64.length > 6 * 1024 * 1024) {
          res.status(400).json({
            error: 'ملف Excel غير صالح أو يتجاوز الحجم المسموح (4 ميغابايت).',
          });
          return;
        }

        const cleanB64 = rawB64.includes(',') ? rawB64.split(',').pop() || '' : rawB64;
        const buffer = Buffer.from(cleanB64, 'base64');
        if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024) {
          res.status(400).json({ error: 'حجم ملف Excel غير مقبول.' });
          return;
        }

        const parsedRows = await parseWarehouseOrWilayaMembersExcel(buffer, {
          safeIdRegex: SAFE_ID_REGEX,
          validPlans: VALID_PLANS,
          validStatuses: VALID_MEMBER_STATUSES,
        });

        if (parsedRows.length === 0) {
          res.status(400).json({
            error:
              'لم يتم العثور على سجلات منخرطين صالحة داخل ملف المخزن الوطني Excel.',
          });
          return;
        }

        const existingRoster = readRoster();
        const existingByNum = new Map(
          existingRoster.map((m) => [m.membershipNumber.toUpperCase(), m])
        );

        const normalizedRows: InternalRosterRecord[] = parsedRows.map((row) => {
          const prev = existingByNum.get(row.membershipNumber.toUpperCase());
          return {
            membershipNumber: row.membershipNumber,
            accessCode:
              row.accessCode && row.accessCode.length >= 4
                ? row.accessCode
                : prev?.accessCode || crypto.randomBytes(4).toString('hex').toUpperCase(),
            fullName: row.fullName,
            email: row.email,
            nationalId: row.nationalId,
            gender: row.gender,
            seniorityYears: row.seniorityYears,
            enrollmentYear: row.enrollmentYear || prev?.enrollmentYear || '2026',
            sector: row.sector,
            city: row.city,
            municipality: row.municipality,
            institution: row.institution,
            phone: row.phone,
            rib: row.rib,
            coveragePlan: row.coveragePlan,
            annualCeiling: row.annualCeiling,
            status: row.status,
            notes: row.notes || prev?.notes || '',
          };
        });

        if (mode === 'replace') {
          writeRoster(normalizedRows);
        } else {
          const merged = new Map(
            existingRoster.map((m) => [m.membershipNumber.toUpperCase(), m])
          );
          for (const m of normalizedRows) {
            merged.set(m.membershipNumber.toUpperCase(), m);
          }
          writeRoster(Array.from(merged.values()));
        }

        await triggerExcelSync();
        const meta = readNationalWarehouseMeta(DATA_DIR);
        res.json({
          importedCount: normalizedRows.length,
          meta,
        });
      } catch {
        res.status(400).json({
          error: 'تعذر قراءة ملف المخزن الوطني Excel (.xlsx).',
        });
      }
    }
  );

  // --- Vite / Static Frontend Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MUTNATEC server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
