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
  PublicMemberStats,
  WilayaOffice,
} from '../types/mutual';
import {
  isStaticSessionToken,
  staticAddAdminRosterMember,
  staticCheckEnrollment,
  staticClearAdminWilayaOffice,
  staticCreateAuthorization,
  staticCreateClaim,
  staticCreateDependent,
  staticDeleteAdminRosterMember,
  staticDeleteAuthorization,
  staticDeleteClaim,
  staticDeleteDependent,
  staticDownloadExcelBlob,
  staticFetchAdminEnrollments,
  staticFetchAdminRecords,
  staticFetchAdminReports,
  staticFetchAdminRoster,
  staticFetchMemberWorkspace,
  staticFetchPublicMemberStats,
  staticFetchWilayaOffices,
  staticImportAdminRoster,
  staticImportAdminWilayaOffices,
  staticLoginAdmin,
  staticLoginMember,
  staticReviewAdminAuth,
  staticReviewAdminClaim,
  staticReviewAdminEnrollment,
  staticSaveAdminWilayaOffice,
  staticSubmitEnrollment,
  staticSyncExcel,
  staticToggleDependent,
  staticUpdateAdminRosterMember,
  staticUpdateClaim,
  staticUpdateMemberProfile,
  staticVerifyCardQr,
} from './staticFallbackStore';

function getBearerToken(headers?: HeadersInit): string {
  if (!headers) return '';
  if (headers instanceof Headers) {
    const auth = headers.get('Authorization') || '';
    return auth.replace(/^Bearer\s+/i, '').trim();
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === 'authorization');
    return (found?.[1] || '').replace(/^Bearer\s+/i, '').trim();
  }
  const rec = headers as Record<string, string>;
  const auth = rec.Authorization || rec.authorization || '';
  return auth.replace(/^Bearer\s+/i, '').trim();
}

async function apiJson<T>(
  url: string,
  options: RequestInit = {},
  staticFallback?: () => Promise<T>
): Promise<T> {
  const token = getBearerToken(options.headers);
  if (token && isStaticSessionToken(token) && staticFallback) {
    return staticFallback();
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    if (staticFallback) {
      return staticFallback();
    }
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  const isBackendUnavailable =
    res.status === 404 || res.status === 405 || !contentType.includes('application/json');

  if (isBackendUnavailable && staticFallback) {
    return staticFallback();
  }

  const data = contentType.includes('application/json')
    ? ((await res.json().catch(() => ({}))) as { error?: string } & T)
    : ({} as { error?: string } & T);

  if (!res.ok) {
    throw new Error(data.error || 'تعذر تنفيذ الطلب على الخادم.');
  }
  return data;
}

export async function loginAdminAccount(
  username: string,
  password: string
): Promise<{ token: string; username: string }> {
  return apiJson(
    '/api/admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
    () => staticLoginAdmin(username, password)
  );
}

export async function loginInternalMember(
  membershipNumber: string,
  accessCode: string
): Promise<{ token: string; member: MemberProfile }> {
  return apiJson(
    '/api/internal/login',
    {
      method: 'POST',
      body: JSON.stringify({ membershipNumber, accessCode }),
    },
    () => staticLoginMember(membershipNumber, accessCode)
  );
}

export async function fetchInternalWorkspace(token: string): Promise<{
  member: MemberProfile;
  dependents: Dependent[];
  claims: MedicalClaim[];
  authorizations: AuthorizationRequest[];
}> {
  return apiJson(
    '/api/internal/me',
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    () => staticFetchMemberWorkspace(token)
  );
}

export async function updateInternalProfile(
  token: string,
  payload: Partial<MemberProfile>
): Promise<{ member: MemberProfile }> {
  return apiJson(
    '/api/internal/me',
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    () => staticUpdateMemberProfile(token, payload)
  );
}

export async function createInternalDependent(
  token: string,
  payload: { fullName: string; relationship: string; birthDate: string }
): Promise<{ dependent: Dependent }> {
  return apiJson(
    '/api/internal/dependents',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    () => staticCreateDependent(token, payload)
  );
}

export async function toggleInternalDependent(
  token: string,
  id: string,
  active: boolean
): Promise<{ dependent: Dependent }> {
  return apiJson(
    `/api/internal/dependents/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active }),
    },
    () => staticToggleDependent(token, id, active)
  );
}

export async function deleteInternalDependent(
  token: string,
  id: string
): Promise<void> {
  await apiJson(
    `/api/internal/dependents/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
    () => staticDeleteDependent(token, id)
  );
}

export async function createInternalClaim(
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
  return apiJson(
    '/api/internal/claims',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    () => staticCreateClaim(token, payload)
  );
}

export async function updateInternalClaim(
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
  return apiJson(
    `/api/internal/claims/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    () => staticUpdateClaim(token, id, payload)
  );
}

export async function deleteInternalClaim(token: string, id: string): Promise<void> {
  await apiJson(
    `/api/internal/claims/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
    () => staticDeleteClaim(token, id)
  );
}

export async function createInternalAuthorization(
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
  return apiJson(
    '/api/internal/authorizations',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    () => staticCreateAuthorization(token, payload)
  );
}

export async function deleteInternalAuthorization(
  token: string,
  id: string
): Promise<void> {
  await apiJson(
    `/api/internal/authorizations/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
    () => staticDeleteAuthorization(token, id)
  );
}

// --- Admin Roster & Records API ---
export async function fetchAdminRoster(
  adminToken: string
): Promise<{ roster: InternalRosterMember[] }> {
  return apiJson(
    '/api/admin/roster',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticFetchAdminRoster(adminToken)
  );
}

export async function addAdminRosterMember(
  adminToken: string,
  member: InternalRosterMember
): Promise<{ roster: InternalRosterMember[] }> {
  return apiJson(
    '/api/admin/roster',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(member),
    },
    () => staticAddAdminRosterMember(adminToken, member)
  );
}

export async function updateAdminRosterMember(
  adminToken: string,
  membershipNumber: string,
  patch: Partial<InternalRosterMember>
): Promise<{ roster: InternalRosterMember[] }> {
  return apiJson(
    `/api/admin/roster/${encodeURIComponent(membershipNumber)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(patch),
    },
    () => staticUpdateAdminRosterMember(adminToken, membershipNumber, patch)
  );
}

export async function deleteAdminRosterMember(
  adminToken: string,
  membershipNumber: string
): Promise<{ roster: InternalRosterMember[] }> {
  return apiJson(
    `/api/admin/roster/${encodeURIComponent(membershipNumber)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticDeleteAdminRosterMember(adminToken, membershipNumber)
  );
}

export async function importAdminRoster(
  adminToken: string,
  roster: InternalRosterMember[]
): Promise<{ roster: InternalRosterMember[]; count: number }> {
  return apiJson(
    '/api/admin/roster/import',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ roster }),
    },
    () => staticImportAdminRoster(adminToken, roster)
  );
}

export async function fetchAdminInternalRecords(
  adminToken: string
): Promise<{ claims: MedicalClaim[]; authorizations: AuthorizationRequest[] }> {
  return apiJson(
    '/api/admin/records',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticFetchAdminRecords(adminToken)
  );
}

export async function reviewAdminInternalClaim(
  adminToken: string,
  id: string,
  payload: { status: ClaimStatus; approvedAmount: number; reviewerNote: string }
): Promise<{ claim: MedicalClaim }> {
  return apiJson(
    `/api/admin/records/claims/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    },
    () => staticReviewAdminClaim(adminToken, id, payload)
  );
}

export async function reviewAdminInternalAuth(
  adminToken: string,
  id: string,
  payload: { status: AuthorizationStatus; reviewerNote: string }
): Promise<{ authorization: AuthorizationRequest }> {
  return apiJson(
    `/api/admin/records/authorizations/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    },
    () => staticReviewAdminAuth(adminToken, id, payload)
  );
}

// --- Wilaya Offices (96 Wilayas Directory) ---
export async function fetchWilayaOffices(): Promise<{ offices: WilayaOffice[] }> {
  return apiJson('/api/wilaya-offices', {}, () => staticFetchWilayaOffices());
}

export async function saveAdminWilayaOffice(
  adminToken: string,
  code: string,
  payload: Omit<WilayaOffice, 'code' | 'updatedAt'>
): Promise<{ office: WilayaOffice; offices: WilayaOffice[] }> {
  return apiJson(
    `/api/admin/wilaya-offices/${encodeURIComponent(code)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    },
    () => staticSaveAdminWilayaOffice(adminToken, code, payload)
  );
}

export async function clearAdminWilayaOffice(
  adminToken: string,
  code: string
): Promise<{ offices: WilayaOffice[] }> {
  return apiJson(
    `/api/admin/wilaya-offices/${encodeURIComponent(code)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticClearAdminWilayaOffice(adminToken, code)
  );
}

export async function importAdminWilayaOffices(
  adminToken: string,
  offices: Array<Partial<WilayaOffice> & { code: string }>
): Promise<{ offices: WilayaOffice[]; count: number }> {
  return apiJson(
    '/api/admin/wilaya-offices/import',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ offices }),
    },
    () => staticImportAdminWilayaOffices(adminToken, offices)
  );
}

// --- Individual Electronic Enrollment API ---
export async function submitIndividualEnrollment(payload: {
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
  return apiJson(
    '/api/enrollments',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => staticSubmitEnrollment(payload)
  );
}

export async function checkIndividualEnrollment(payload: {
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
  return apiJson(
    '/api/enrollments/check',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => staticCheckEnrollment(payload)
  );
}

export async function fetchAdminEnrollments(
  adminToken: string
): Promise<{ enrollments: IndividualEnrollment[] }> {
  return apiJson(
    '/api/admin/enrollments',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticFetchAdminEnrollments(adminToken)
  );
}

export async function reviewAdminEnrollment(
  adminToken: string,
  id: string,
  payload: {
    status: EnrollmentStatus;
    reviewerNote: string;
    assignedMembershipNumber?: string;
    assignedAccessCode?: string;
  }
): Promise<{ enrollment: IndividualEnrollment }> {
  return apiJson(
    `/api/admin/enrollments/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    },
    () => staticReviewAdminEnrollment(adminToken, id, payload)
  );
}

// --- Admin Financial/Admin Reports & Excel Database Sync ---
export async function fetchAdminReportsSummary(
  adminToken: string
): Promise<AdminReportsSummary> {
  return apiJson(
    '/api/admin/reports/summary',
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticFetchAdminReports(adminToken)
  );
}

export async function syncAdminExcelDatabase(
  adminToken: string
): Promise<{ excelSync: ExcelSyncMeta; reports: AdminReportsSummary }> {
  return apiJson(
    '/api/admin/excel/sync',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    },
    () => staticSyncExcel(adminToken)
  );
}

export async function downloadAdminExcelDatabase(adminToken: string): Promise<Blob> {
  if (isStaticSessionToken(adminToken)) {
    return staticDownloadExcelBlob(adminToken);
  }
  const res = await fetch('/api/admin/excel/export', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (res.status === 404 || res.status === 405) {
    return staticDownloadExcelBlob(adminToken);
  }
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'تعذر تحميل ملف قاعدة بيانات Excel.');
  }
  return res.blob();
}

export async function importAdminExcelDatabase(
  adminToken: string,
  payload: { fileBase64: string; mode: 'merge' | 'replace' }
): Promise<{
  importedRosterCount: number;
  importedWilayasCount: number;
  excelSync: ExcelSyncMeta;
  reports: AdminReportsSummary;
}> {
  return apiJson('/api/admin/excel/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(payload),
  });
}

export async function fetchPublicMemberStats(): Promise<PublicMemberStats> {
  return apiJson('/api/public/member-stats', {}, () => staticFetchPublicMemberStats());
}

export async function verifyElectronicCardQr(
  membershipNumber: string,
  sig: string
): Promise<CardVerificationResult> {
  const params = new URLSearchParams({
    m: membershipNumber,
    sig,
  });
  return apiJson(`/api/public/verify-card?${params.toString()}`, {}, () =>
    staticVerifyCardQr(membershipNumber, sig)
  );
}
