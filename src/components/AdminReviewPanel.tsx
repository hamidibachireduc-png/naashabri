import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldAlert, UserCheck, X } from 'lucide-react';
import { formatCurrency } from '../data/mutualCatalog';
import {
  fetchAdminEnrollments,
  fetchAdminInternalRecords,
  reviewAdminEnrollment,
  reviewAdminInternalAuth,
  reviewAdminInternalClaim,
} from '../lib/internalApi';
import type {
  AuthorizationRequest,
  AuthorizationStatus,
  ClaimStatus,
  EnrollmentStatus,
  IndividualEnrollment,
  MedicalClaim,
} from '../types/mutual';
import { AdminClaimsStatusChart } from './AdminClaimsStatusChart';
import { AdminReportsAndExcel } from './AdminReportsAndExcel';
import { InternalRosterAdmin } from './InternalRosterAdmin';
import { StatusLabel } from './StatusLabel';
import { WilayaOfficesAdmin } from './WilayaOfficesAdmin';

interface AdminReviewPanelProps {
  adminToken: string;
  adminUsername: string;
}

const CLAIM_STATUSES: ClaimStatus[] = [
  'قيد الدراسة',
  'تمت الموافقة',
  'تم الصرف',
  'وثائق ناقصة',
  'مرفوض',
];

const AUTH_STATUSES: AuthorizationStatus[] = ['قيد الدراسة', 'موافق عليه', 'مرفوض'];

const ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  'جاري التدقيق والموافقة',
  'تمت الموافقة والتسجيل',
  'مرفوض / استكمال وثائق',
];

export function AdminReviewPanel({
  adminToken,
  adminUsername,
}: AdminReviewPanelProps) {
  const [tab, setTab] = useState<
    'claims' | 'authorizations' | 'enrollments' | 'roster' | 'wilayas' | 'reports'
  >('claims');
  const [internalClaims, setInternalClaims] = useState<MedicalClaim[]>([]);
  const [internalAuths, setInternalAuths] = useState<AuthorizationRequest[]>([]);
  const [enrollments, setEnrollments] = useState<IndividualEnrollment[]>([]);
  const [internalError, setInternalError] = useState('');

  const [reviewClaim, setReviewClaim] = useState<MedicalClaim | null>(null);
  const [reviewAuth, setReviewAuth] = useState<AuthorizationRequest | null>(null);
  const [reviewEnroll, setReviewEnroll] = useState<IndividualEnrollment | null>(null);

  const [newStatus, setNewStatus] = useState<ClaimStatus>('تمت الموافقة');
  const [approvedAmount, setApprovedAmount] = useState('0');
  const [reviewerNote, setReviewerNote] = useState('');

  const [newAuthStatus, setNewAuthStatus] = useState<AuthorizationStatus>('موافق عليه');
  const [authNote, setAuthNote] = useState('');

  const [newEnrollStatus, setNewEnrollStatus] = useState<EnrollmentStatus>(
    'تمت الموافقة والتسجيل'
  );
  const [enrollMembershipNumber, setEnrollMembershipNumber] = useState('');
  const [enrollAccessCode, setEnrollAccessCode] = useState('');
  const [enrollNote, setEnrollNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadInternalRecords = useCallback(async () => {
    if (!adminToken) return;
    setInternalError('');
    try {
      const [recordsRes, enrollmentsRes] = await Promise.all([
        fetchAdminInternalRecords(adminToken),
        fetchAdminEnrollments(adminToken),
      ]);
      setInternalClaims(recordsRes.claims);
      setInternalAuths(recordsRes.authorizations);
      setEnrollments(enrollmentsRes.enrollments);
    } catch (err) {
      setInternalError(
        err instanceof Error ? err.message : 'تعذر تحميل سجلات الملف الداخلي.'
      );
    }
  }, [adminToken]);

  useEffect(() => {
    void loadInternalRecords();
  }, [loadInternalRecords]);

  const sortedClaims = useMemo(() => {
    return [...internalClaims].sort((a, b) => b.careDate.localeCompare(a.careDate));
  }, [internalClaims]);

  const sortedAuths = useMemo(() => {
    return [...internalAuths].sort((a, b) =>
      b.expectedDate.localeCompare(a.expectedDate)
    );
  }, [internalAuths]);

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [enrollments]);

  const pendingEnrollmentsCount = useMemo(
    () => enrollments.filter((e) => e.status === 'جاري التدقيق والموافقة').length,
    [enrollments]
  );

  const openClaimReview = (claim: MedicalClaim) => {
    setReviewClaim(claim);
    setNewStatus(claim.status);
    setApprovedAmount(
      String(
        claim.approvedAmount > 0 ? claim.approvedAmount : claim.estimatedReimbursement
      )
    );
    setReviewerNote(claim.reviewerNote);
  };

  const openAuthReview = (authReq: AuthorizationRequest) => {
    setReviewAuth(authReq);
    setNewAuthStatus(authReq.status);
    setAuthNote(authReq.reviewerNote);
  };

  const openEnrollmentReview = (item: IndividualEnrollment) => {
    setReviewEnroll(item);
    setNewEnrollStatus(
      item.status === 'جاري التدقيق والموافقة' ? 'تمت الموافقة والتسجيل' : item.status
    );
    setEnrollMembershipNumber(item.assignedMembershipNumber || '');
    setEnrollAccessCode(item.assignedAccessCode || '');
    setEnrollNote(item.reviewerNote || '');
  };

  const handleSaveClaimReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewClaim || !adminToken) return;
    const amt = Math.max(0, Math.min(5000000, Number(approvedAmount) || 0));
    setSaving(true);
    try {
      await reviewAdminInternalClaim(adminToken, reviewClaim.id, {
        status: newStatus,
        approvedAmount: newStatus === 'مرفوض' ? 0 : amt,
        reviewerNote: reviewerNote.trim().slice(0, 400),
      });
      await loadInternalRecords();
      setReviewClaim(null);
    } catch (error) {
      setInternalError(
        error instanceof Error ? error.message : 'تعذر تحديث قرار الملف.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuthReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuth || !adminToken) return;
    setSaving(true);
    try {
      await reviewAdminInternalAuth(adminToken, reviewAuth.id, {
        status: newAuthStatus,
        reviewerNote: authNote.trim().slice(0, 400),
      });
      await loadInternalRecords();
      setReviewAuth(null);
    } catch (error) {
      setInternalError(
        error instanceof Error ? error.message : 'تعذر تحديث قرار التكفل.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEnrollmentReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEnroll || !adminToken) return;
    setSaving(true);
    setInternalError('');
    try {
      await reviewAdminEnrollment(adminToken, reviewEnroll.id, {
        status: newEnrollStatus,
        reviewerNote: enrollNote.trim().slice(0, 400),
        assignedMembershipNumber: enrollMembershipNumber.trim() || undefined,
        assignedAccessCode: enrollAccessCode.trim() || undefined,
      });
      await loadInternalRecords();
      setReviewEnroll(null);
    } catch (error) {
      setInternalError(
        error instanceof Error ? error.message : 'تعذر حفظ قرار طلب الانخراط.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-800" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-900">
              مراقبة الملفات وإدارة الملف الداخلي (فضاء الإدارة)
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            المصادقة على ملفات المرض وطلبات الانخراط الفردي والتكفل المسبق والتحكم في حسابات المنخرطين · المدير:{' '}
            <span className="font-mono-tabular font-semibold text-slate-700">
              {adminUsername}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto self-start max-w-full">
          <button
            type="button"
            onClick={() => setTab('claims')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'claims'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ملفات المرض ({sortedClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('authorizations')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'authorizations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            طلبات التكفل ({sortedAuths.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('enrollments')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'enrollments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            طلبات الانخراط الفردي ({sortedEnrollments.length}
            {pendingEnrollmentsCount > 0 ? ` · ${pendingEnrollmentsCount} قيد التدقيق` : ''})
          </button>
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'roster'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الملف الداخلي للمنخرطين
          </button>
          <button
            type="button"
            onClick={() => setTab('wilayas')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'wilayas'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المقرات الولائية (96)
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'reports'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            التقارير وقاعدة Excel
          </button>
        </div>
      </div>

      {internalError && (
        <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {internalError}
        </div>
      )}

      {tab === 'reports' ? (
        <AdminReportsAndExcel adminToken={adminToken} />
      ) : tab === 'roster' ? (
        <InternalRosterAdmin adminToken={adminToken} />
      ) : tab === 'wilayas' ? (
        <WilayaOfficesAdmin adminToken={adminToken} />
      ) : tab === 'enrollments' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {sortedEnrollments.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              لا توجد طلبات انخراط فردي إلكتروني مسجلة حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">رقم التتبع والتاريخ</th>
                    <th className="py-3 px-4">المترشح للانخراط</th>
                    <th className="py-3 px-4">الولاية والقطاع</th>
                    <th className="py-3 px-4">الصيغة والحساب (CCP)</th>
                    <th className="py-3 px-4">الحالة والاعتماد</th>
                    <th className="py-3 px-4">معالجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedEnrollments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-mono-tabular text-xs font-bold text-slate-900">
                          {item.trackingCode}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500">
                          {item.createdAt.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.fullName}</div>
                        <div className="text-xs font-mono-tabular text-slate-500">
                          NIN: {item.nationalId} · NSS: {item.socialSecurityNumber || '—'}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500">
                          {item.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900">{item.city}</div>
                        <div className="text-xs text-slate-500">
                          {item.sector} — {item.workplace}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-slate-800">
                          {item.coveragePlan}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500">
                          {item.rib || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={item.status} />
                        {item.assignedMembershipNumber && (
                          <div className="mt-1 text-[11px] font-mono-tabular text-emerald-700 font-semibold">
                            عضوية: {item.assignedMembershipNumber} · رمز: {item.assignedAccessCode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openEnrollmentReview(item)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          مراجعة واعتماد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'claims' ? (
        <div className="space-y-6">
          <AdminClaimsStatusChart claims={sortedClaims} />
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {sortedClaims.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                لا توجد ملفات مرض مودعة في السجل الداخلي بعد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">المرجع</th>
                      <th className="py-3 px-4">المنخرط</th>
                      <th className="py-3 px-4">المستفيد والأداء</th>
                      <th className="py-3 px-4 text-left">المبلغ</th>
                      <th className="py-3 px-4 text-left">المعتمد</th>
                      <th className="py-3 px-4">الوضعية</th>
                      <th className="py-3 px-4">معالجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedClaims.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-slate-800">
                          {c.referenceCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{c.memberName}</div>
                          <div className="text-xs font-mono-tabular text-slate-500">
                            {c.membershipNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-900">{c.beneficiaryName}</div>
                          <div className="text-xs text-slate-500">{c.careType}</div>
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-left">
                          {formatCurrency(c.totalAmount)}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-emerald-700 font-semibold text-left">
                          {formatCurrency(c.approvedAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusLabel status={c.status} />
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => openClaimReview(c)}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            تحديث القرار
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {sortedAuths.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              لا توجد طلبات تكفل مسبق في السجل الداخلي بعد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">المرجع</th>
                    <th className="py-3 px-4">المنخرط / المستفيد</th>
                    <th className="py-3 px-4">الإجراء والمصحة</th>
                    <th className="py-3 px-4 text-left">الكلفة</th>
                    <th className="py-3 px-4">الوضعية</th>
                    <th className="py-3 px-4">معالجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedAuths.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-slate-800">
                        {a.referenceCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{a.memberName}</div>
                        <div className="text-xs text-slate-500">{a.beneficiaryName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900">{a.procedureType}</div>
                        <div className="text-xs text-slate-500">{a.facilityName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-left">
                        {formatCurrency(a.estimatedCost)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={a.status} />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openAuthReview(a)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          اتخاذ قرار
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {reviewClaim && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                قرار المراقبة — {reviewClaim.referenceCode}
              </h3>
              <button
                type="button"
                onClick={() => setReviewClaim(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveClaimReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  وضعية الملف
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ClaimStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {CLAIM_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  مبلغ التعويض المصادق عليه (د.ج)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5000000"
                  step="0.01"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ملاحظة المراقب الطبي أو الإداري
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewClaim(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
                >
                  {saving ? 'جاري الحفظ...' : 'اعتماد القرار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewAuth && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                قرار التكفل المسبق — {reviewAuth.referenceCode}
              </h3>
              <button
                type="button"
                onClick={() => setReviewAuth(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAuthReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  القرار
                </label>
                <select
                  value={newAuthStatus}
                  onChange={(e) =>
                    setNewAuthStatus(e.target.value as AuthorizationStatus)
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {AUTH_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ملاحظة القرار
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={authNote}
                  onChange={(e) => setAuthNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAuth(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ القرار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewEnroll && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900">
                  تدقيق واعتماد طلب الانخراط — {reviewEnroll.trackingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewEnroll(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEnrollmentReview} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">الاسم الكامل:</span>
                  <span className="font-bold text-slate-900">{reviewEnroll.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الضمان الاجتماعي (NSS):</span>
                  <span className="font-mono-tabular text-slate-800">
                    {reviewEnroll.socialSecurityNumber || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم التعريف الوطني (NIN):</span>
                  <span className="font-mono-tabular text-slate-800">
                    {reviewEnroll.nationalId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الولاية ومقر العمل:</span>
                  <span className="text-slate-800">
                    {reviewEnroll.city} — {reviewEnroll.workplace}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الهاتف / البريدي (CCP):</span>
                  <span className="font-mono-tabular text-slate-800">
                    {reviewEnroll.phone} · {reviewEnroll.rib || '—'}
                  </span>
                </div>
                {reviewEnroll.notes && (
                  <p className="pt-1 border-t border-slate-200 text-slate-600">
                    ملاحظات المترشح: {reviewEnroll.notes}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  قرار الإدارة
                </label>
                <select
                  value={newEnrollStatus}
                  onChange={(e) =>
                    setNewEnrollStatus(e.target.value as EnrollmentStatus)
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {ENROLLMENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {newEnrollStatus === 'تمت الموافقة والتسجيل' && (
                  <p className="text-[11px] text-emerald-700 mt-1">
                    عند الاعتماد سيتم تسجيل المنخرط تلقائياً في الملف الداخلي للمنخرطين وتفعيل بطاقته الرقمية.
                  </p>
                )}
              </div>

              {newEnrollStatus === 'تمت الموافقة والتسجيل' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      رقم الانخراط الممنوح (اختياري)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={enrollMembershipNumber}
                      onChange={(e) => setEnrollMembershipNumber(e.target.value)}
                      placeholder="تلقائي: MUT-2026-XXXX"
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      رمز الدخول (اختياري)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={enrollAccessCode}
                      onChange={(e) => setEnrollAccessCode(e.target.value)}
                      placeholder="تلقائي: 6 أرقام"
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ملاحظة الإدارة للمنخرط
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={enrollNote}
                  onChange={(e) => setEnrollNote(e.target.value)}
                  placeholder="مثال: تم قبول الملف وتفعيل العضوية، يرجى تسليم النسخة الورقية للمركز الولائي."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewEnroll(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'جاري الحفظ...' : 'اعتماد وحفظ القرار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

