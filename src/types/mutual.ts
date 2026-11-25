export type AuthSessionMode = 'firebase' | 'internal';

export type CoveragePlan =
  | 'التغطية الأساسية الشاملة'
  | 'التغطية التكميلية+'
  | 'التغطية العائلية المميزة';

export type MemberStatus = 'نشط' | 'قيد المراجعة' | 'معلق';

export interface MemberProfile {
  uid: string;
  fullName: string;
  email: string;
  nationalId: string;
  socialSecurityNumber?: string;
  birthDate?: string;
  birthPlace?: string;
  jobTitle?: string;
  membershipNumber: string;
  sector: string;
  city: string;
  municipality?: string;
  institution?: string;
  memberRole?: string;
  enrollmentYear?: string;
  cardQrSig?: string;
  phone: string;
  rib: string;
  coveragePlan: CoveragePlan;
  annualCeiling: number;
  status: MemberStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type MemberGender = 'ذكر' | 'أنثى';

export interface InternalRosterMember {
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
  cardQrSig?: string;
  gender?: MemberGender;
  seniorityYears?: number;
  sector: string;
  city: string;
  municipality?: string;
  institution?: string;
  phone: string;
  rib: string;
  coveragePlan: CoveragePlan;
  annualCeiling: number;
  status: MemberStatus;
}

export type DependentRelationship = 'الزوج/الزوجة' | 'ابن/ابنة' | 'أحد الوالدين';

export interface Dependent {
  id: string;
  ownerId: string;
  fullName: string;
  relationship: DependentRelationship;
  birthDate: string;
  coverageCode: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CareType =
  | 'العطل المرضية'
  | 'منتجات صيدلانية وأجهزة اصطناعية'
  | 'الجراحة العامة'
  | 'جراحة وتقويم وزراعة الأسنان'
  | 'التحاليل الطبية والخزعات'
  | 'الأشعة الطبية الكبرى'
  | 'طب العيون والبصريات'
  | 'الأشعة والتحاليل التشخيصية'
  | 'إعادة التأهيل الوظيفي'
  | 'المنح العائلية (الزواج / الولادة / الختان)'
  | 'منحة الإحالة على التقاعد'
  | 'منح الأرامل والأيتام والتمدرس'
  | 'مساعدة مصاريف الجنازة'
  | 'الإعانات الاجتماعية (الأمراض المستعصية / الإعاقة)'
  | 'الطب العام والأدوية'
  | 'طب الأسنان'
  | 'البصريات والنظارات'
  | 'التحاليل والأشعة'
  | 'الاستشفاء والجراحة'
  | 'الولادة والأمومة';

export type ClaimStatus =
  | 'قيد الدراسة'
  | 'تمت الموافقة'
  | 'تم الصرف'
  | 'وثائق ناقصة'
  | 'مرفوض';

export interface MedicalClaim {
  id: string;
  ownerId: string;
  memberName: string;
  membershipNumber: string;
  referenceCode: string;
  beneficiaryName: string;
  beneficiaryRelation: string;
  careType: CareType;
  providerName: string;
  careDate: string;
  totalAmount: number;
  estimatedReimbursement: number;
  approvedAmount: number;
  status: ClaimStatus;
  notes: string;
  reviewerNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ProcedureType =
  | 'استشفاء وجراحة'
  | 'فحص بالرنين المغناطيسي / السكانير'
  | 'تركيبات وتقويم الأسنان'
  | 'علاج الأمراض المزمنة'
  | 'ترويض طبي متخصص';

export type AuthorizationStatus = 'قيد الدراسة' | 'موافق عليه' | 'مرفوض';

export interface AuthorizationRequest {
  id: string;
  ownerId: string;
  memberName: string;
  referenceCode: string;
  beneficiaryName: string;
  procedureType: ProcedureType;
  facilityName: string;
  expectedDate: string;
  estimatedCost: number;
  status: AuthorizationStatus;
  notes: string;
  reviewerNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CoverageRule {
  careType: CareType;
  mode: 'percent' | 'fixed';
  mutualRate: number;
  fixedAmount?: number;
  annualCap: number | null;
  validityPeriod: string;
  requiredDocs: string[];
}

export interface BenefitHighlightItem {
  label: string;
  value: string;
  detail: string;
}

export type BenefitCategoryFilter =
  | 'الكل'
  | 'القواعد والملف القاعدي'
  | 'الرعاية الصحية والجراحة'
  | 'الأشعة والعيون والتأهيل'
  | 'المنح العائلية والتقاعد'
  | 'الحماية الاجتماعية والجنازة';

export interface BenefitGuideSection {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<BenefitCategoryFilter, 'الكل'>;
  imagePath: string;
  iconKey:
    | 'book'
    | 'calendar'
    | 'folder'
    | 'pill'
    | 'scissors'
    | 'scan'
    | 'eye'
    | 'activity'
    | 'dumbbell'
    | 'heart'
    | 'award'
    | 'umbrella'
    | 'shield'
    | 'handHeart'
    | 'graduation';
  validityNote: string;
  extraDocsNote: string;
  items: BenefitHighlightItem[];
  associatedCareType?: CareType;
}

export interface ProviderItem {
  id: string;
  name: string;
  category:
    | 'مصحة متعاقدة'
    | 'مركز طب الأسنان'
    | 'مختبر التحاليل والأشعة'
    | 'بصريات معتمدة'
    | 'وكالة التعاضدية';
  city: string;
  address: string;
  phone: string;
  conventionCode: string;
  thirdPartyPay: boolean;
}

export interface WilayaOffice {
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

export type WilayaHeadStatus = 'نشط' | 'معلق';

export interface WilayaHeadAccount {
  wilayaCode: string;
  wilayaName: string;
  username: string;
  fullName: string;
  title: string;
  phone: string;
  email: string;
  officeName: string;
  accountInfo: string;
  socialUrl: string;
  address: string;
  googleMapsUrl: string;
  secondaryMapsUrl?: string;
  lat?: number;
  lng?: number;
  status: WilayaHeadStatus;
  hasPassword: boolean;
  updatedAt: string;
}

export interface WilayaHeadProvisionedCredential {
  wilayaCode: string;
  wilayaName: string;
  username: string;
  password: string;
  fullName: string;
}

export interface PublicWilayaMapEntry {
  code: string;
  wilayaName: string;
  officeName: string;
  representativeName: string;
  headTitle: string;
  headUsername: string;
  headStatus: WilayaHeadStatus;
  hasActiveAccount: boolean;
  phone: string;
  email: string;
  accountInfo: string;
  socialUrl: string;
  address: string;
  googleMapsUrl: string;
  secondaryMapsUrl?: string;
  lat?: number;
  lng?: number;
  updatedAt: string;
}

export interface WilayaHeadWorkspaceData {
  account: WilayaHeadAccount;
  office: WilayaOffice;
  stats: {
    membersCount: number;
    activeMembersCount: number;
    claimsCount: number;
    pendingClaimsCount: number;
    totalApprovedAmount: number;
    enrollmentsCount: number;
    pendingEnrollmentsCount: number;
  };
  warehouseSync?: {
    fileName: string;
    lastSyncedAt: string;
    nationalTotalMembers: number;
    wilayaSyncedMembers: number;
  };
  members: Array<Omit<InternalRosterMember, 'accessCode'>>;
  claims: MedicalClaim[];
  enrollments: IndividualEnrollment[];
}

export interface NationalWarehouseWilayaSummary {
  code: string;
  wilayaName: string;
  officeName: string;
  headName: string;
  phone: string;
  membersCount: number;
  activeMembersCount: number;
  claimsCount: number;
  enrollmentsCount: number;
  totalAnnualCeiling: number;
  totalApprovedAmount: number;
}

export interface NationalWarehouseMeta {
  fileName: string;
  lastSyncedAt: string;
  fileSizeBytes: number;
  totalMembers: number;
  activeMembers: number;
  totalWilayas: number;
  populatedWilayas: number;
  byWilaya: NationalWarehouseWilayaSummary[];
}

export interface WilayaBackupRestoreResponse {
  restored: {
    membersCount: number;
    claimsCount: number;
    dependentsCount: number;
    authorizationsCount: number;
    enrollmentsCount: number;
  };
  workspace: WilayaHeadWorkspaceData;
}

export type EnrollmentStatus =
  | 'جاري التدقيق والموافقة'
  | 'تمت الموافقة والتسجيل'
  | 'مرفوض / استكمال وثائق';

export interface IndividualEnrollment {
  id: string;
  trackingCode: string;
  fullName: string;
  socialSecurityNumber: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  sector: string;
  city: string;
  municipality?: string;
  workplace: string;
  gender?: MemberGender;
  seniorityYears?: number;
  rib: string;
  coveragePlan: CoveragePlan;
  notes: string;
  status: EnrollmentStatus;
  statusMessage: string;
  assignedMembershipNumber: string;
  assignedAccessCode: string;
  reviewerNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExcelSyncMeta {
  fileName: string;
  lastSyncedAt: string;
  fileSizeBytes: number;
  syncedCounts: {
    roster: number;
    claims: number;
    authorizations: number;
    enrollments: number;
    dependents: number;
    wilayasActive: number;
  };
}

export interface AdminReportsSummary {
  generatedAt: string;
  kpis: {
    totalMembers: number;
    activeMembers: number;
    pendingOrSuspendedMembers: number;
    totalAnnualCeiling: number;
    totalClaims: number;
    totalClaimedAmount: number;
    totalEstimatedAmount: number;
    totalApprovedAmount: number;
    paidClaimsCount: number;
    pendingClaimsCount: number;
    totalAuthorizations: number;
    pendingAuthorizationsCount: number;
    totalEnrollments: number;
    pendingEnrollmentsCount: number;
    approvedEnrollmentsCount: number;
    activeWilayaCenters: number;
  };
  byCareType: Array<{
    careType: string;
    claimsCount: number;
    totalClaimed: number;
    totalApproved: number;
  }>;
  byWilaya: Array<{
    city: string;
    membersCount: number;
    claimsCount: number;
    totalApproved: number;
  }>;
  byMonth: Array<{
    month: string;
    claimsCount: number;
    totalClaimed: number;
    totalApproved: number;
  }>;
  excelSync: ExcelSyncMeta;
}

export interface PublicMemberStats {
  totalMembers: number;
  activeMembers?: number;
  averageSeniorityYears: number;
  municipalitiesCount: number;
  institutionsCount: number;
  byGender: Array<{ name: string; count: number }>;
  bySeniority: Array<{ name: string; count: number }>;
  byMunicipality: Array<{ name: string; count: number }>;
  byInstitution: Array<{ name: string; count: number }>;
}

export interface CardVerificationResult {
  valid: boolean;
  membershipNumber: string;
  fullName: string;
  city: string;
  municipality: string;
  institution: string;
  sector: string;
  coveragePlan: CoveragePlan;
  status: MemberStatus;
  enrollmentYear: string;
  accreditationNumber: string;
  verifiedAt: string;
}
