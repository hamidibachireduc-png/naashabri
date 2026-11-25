import { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  Edit3,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  CARE_TYPES,
  CLAIM_STATUS_FILTERS,
  COVERAGE_RULES,
  estimateReimbursement,
  formatCurrency,
  generateSafeId,
  ISO_DATE_REGEX,
  todayIsoDate,
} from '../data/mutualCatalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  createInternalClaim,
  deleteInternalClaim,
  updateInternalClaim,
} from '../lib/internalApi';
import type {
  AuthSessionMode,
  CareType,
  ClaimStatus,
  Dependent,
  MedicalClaim,
  MemberProfile,
} from '../types/mutual';
import { StatusLabel } from './StatusLabel';

interface ClaimsManagerProps {
  member: MemberProfile;
  dependents: Dependent[];
  claims: MedicalClaim[];
  sessionMode: AuthSessionMode;
  internalToken?: string;
  onInternalSync?: () => Promise<void>;
  preselectedCareType?: CareType;
  openNewModalSignal?: number;
}

export function ClaimsManager({
  member,
  dependents,
  claims,
  sessionMode,
  internalToken = '',
  onInternalSync,
  preselectedCareType,
  openNewModalSignal = 0,
}: ClaimsManagerProps) {
  const defaultCareType: CareType = preselectedCareType || CARE_TYPES[0];

  const [statusFilter, setStatusFilter] = useState<'الكل' | ClaimStatus>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(openNewModalSignal > 0);
  const [selectedClaim, setSelectedClaim] = useState<MedicalClaim | null>(null);
  const [editingClaim, setEditingClaim] = useState<MedicalClaim | null>(null);

  // New / Edit claim form state
  const [beneficiaryKey, setBeneficiaryKey] = useState('self');
  const [careType, setCareType] = useState<CareType>(defaultCareType);
  const [providerName, setProviderName] = useState('');
  const [careDate, setCareDate] = useState(todayIsoDate());
  const [totalAmount, setTotalAmount] = useState('4500');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  // Track external open signal
  const [lastSignal, setLastSignal] = useState(openNewModalSignal);
  if (openNewModalSignal !== lastSignal) {
    setLastSignal(openNewModalSignal);
    if (openNewModalSignal > 0) {
      setEditingClaim(null);
      setBeneficiaryKey('self');
      setCareType(preselectedCareType || CARE_TYPES[0]);
      setProviderName('');
      setCareDate(todayIsoDate());
      setTotalAmount('4500');
      setNotes('');
      setFormError('');
      setShowNewModal(true);
    }
  }

  const beneficiaryOptions = useMemo(() => {
    const list = [
      { key: 'self', name: member.fullName, relation: 'المنخرط الرئيسي' },
      ...dependents
        .filter((d) => d.active)
        .map((d) => ({
          key: d.id,
          name: d.fullName,
          relation: d.relationship,
        })),
    ];
    return list;
  }, [member.fullName, dependents]);

  const parsedAmount = Number(totalAmount);
  const liveEstimate = useMemo(
    () => estimateReimbursement(careType, parsedAmount, member.coveragePlan),
    [careType, parsedAmount, member.coveragePlan]
  );

  const selectedRule = useMemo(
    () => COVERAGE_RULES.find((r) => r.careType === careType) || COVERAGE_RULES[0],
    [careType]
  );

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesStatus = statusFilter === 'الكل' || c.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.referenceCode.toLowerCase().includes(q) ||
        c.beneficiaryName.toLowerCase().includes(q) ||
        c.providerName.toLowerCase().includes(q) ||
        c.careType.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [claims, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingClaim(null);
    setBeneficiaryKey('self');
    setCareType(preselectedCareType || CARE_TYPES[0]);
    setProviderName('');
    setCareDate(todayIsoDate());
    setTotalAmount('4500');
    setNotes('');
    setFormError('');
    setShowNewModal(true);
  };

  const openEditModal = (claim: MedicalClaim) => {
    setEditingClaim(claim);
    setCareType(claim.careType);
    setProviderName(claim.providerName);
    setCareDate(claim.careDate);
    setTotalAmount(String(claim.totalAmount));
    setNotes(claim.notes);
    setFormError('');
    setSelectedClaim(null);
    setShowNewModal(true);
  };

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanProvider = providerName.trim().slice(0, 140);
    const cleanNotes = notes.trim().slice(0, 600);
    const amountNum = Number(totalAmount);

    if (cleanProvider.length < 2) {
      setFormError('يرجى إدخال اسم الطبيب أو المصحة أو الجهة المعنية (حرفان على الأقل).');
      return;
    }
    if (!ISO_DATE_REGEX.test(careDate)) {
      setFormError('تاريخ العلاج أو الحدث غير صالح.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > 5000000) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من 0 وأقل من 5,000,000 د.ج.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClaim) {
        const est = estimateReimbursement(
          editingClaim.careType,
          amountNum,
          member.coveragePlan
        );
        if (sessionMode === 'internal') {
          await updateInternalClaim(internalToken, editingClaim.id, {
            providerName: cleanProvider,
            careDate,
            totalAmount: amountNum,
            estimatedReimbursement: est.totalReimbursement,
            notes: cleanNotes,
          });
          await onInternalSync?.();
        } else {
          const docRef = doc(db, 'claims', editingClaim.id);
          await updateDoc(docRef, {
            providerName: cleanProvider,
            careDate,
            totalAmount: amountNum,
            estimatedReimbursement: est.totalReimbursement,
            notes: cleanNotes,
            status: 'قيد الدراسة',
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        const chosen =
          beneficiaryOptions.find((b) => b.key === beneficiaryKey) ||
          beneficiaryOptions[0];
        const est = estimateReimbursement(careType, amountNum, member.coveragePlan);

        if (sessionMode === 'internal') {
          await createInternalClaim(internalToken, {
            beneficiaryName: chosen.name.slice(0, 120),
            beneficiaryRelation: chosen.relation.slice(0, 40),
            careType,
            providerName: cleanProvider,
            careDate,
            totalAmount: amountNum,
            estimatedReimbursement: est.totalReimbursement,
            notes: cleanNotes,
          });
          await onInternalSync?.();
        } else {
          const refCode = generateSafeId('CLM').slice(0, 24);
          await addDoc(collection(db, 'claims'), {
            ownerId: member.uid,
            memberName: member.fullName.slice(0, 120),
            membershipNumber: member.membershipNumber.slice(0, 32),
            referenceCode: refCode,
            beneficiaryName: chosen.name.slice(0, 120),
            beneficiaryRelation: chosen.relation.slice(0, 40),
            careType,
            providerName: cleanProvider,
            careDate,
            totalAmount: amountNum,
            estimatedReimbursement: est.totalReimbursement,
            approvedAmount: 0,
            status: 'قيد الدراسة',
            notes: cleanNotes,
            reviewerNote: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      setShowNewModal(false);
    } catch (error) {
      if (sessionMode === 'internal') {
        setFormError(
          error instanceof Error ? error.message : 'تعذر حفظ ملف التعويض في الملف الداخلي.'
        );
      } else {
        handleFirestoreError(
          error,
          editingClaim ? OperationType.UPDATE : OperationType.CREATE,
          editingClaim ? `claims/${editingClaim.id}` : 'claims'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClaim = async (claim: MedicalClaim) => {
    setActionError('');
    try {
      if (sessionMode === 'internal') {
        await deleteInternalClaim(internalToken, claim.id);
        await onInternalSync?.();
      } else {
        await deleteDoc(doc(db, 'claims', claim.id));
      }
      if (selectedClaim?.id === claim.id) {
        setSelectedClaim(null);
      }
    } catch (error) {
      if (sessionMode === 'internal') {
        setActionError(
          error instanceof Error ? error.message : 'تعذر سحب الملف من السجل الداخلي.'
        );
      } else {
        handleFirestoreError(error, OperationType.DELETE, `claims/${claim.id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ملفات المرض والمنح والأداءات</h2>
          <p className="text-sm text-slate-500 mt-1">
            متابعة وضعية الملفات المودعة وإيداع طلبات استرجاع المصاريف الطبية والمنح الاجتماعية
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إيداع ملف جديد</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {CLAIM_STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الملف، المستفيد، أو المؤسسة..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredClaims.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {claims.length === 0
                ? 'لا توجد ملفات مرض أو منح مودعة بعد'
                : 'لم يتم العثور على ملفات مطابقة'}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {claims.length === 0
                ? 'يمكنك إيداع أول ملف لتتبع مراحل المراقبة الطبية وصرف التعويض إلى حسابك البريدي (CCP).'
                : 'جرّب تغيير معايير التصفية أو كلمة البحث للوصول إلى الملف المطلوب.'}
            </p>
            {claims.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إيداع أول ملف</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">رقم الملف</th>
                  <th className="py-3 px-4 whitespace-nowrap">المستفيد</th>
                  <th className="py-3 px-4 whitespace-nowrap">نوع الأداء / المنحة</th>
                  <th className="py-3 px-4 whitespace-nowrap">مقدم الخدمة / الجهة</th>
                  <th className="py-3 px-4 whitespace-nowrap">التاريخ</th>
                  <th className="py-3 px-4 whitespace-nowrap text-left">المبلغ المصرح به</th>
                  <th className="py-3 px-4 whitespace-nowrap text-left">التعويض</th>
                  <th className="py-3 px-4 whitespace-nowrap">الوضعية</th>
                  <th className="py-3 px-4 whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-slate-800 whitespace-nowrap">
                      {claim.referenceCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{claim.beneficiaryName}</div>
                      <div className="text-xs text-slate-500">{claim.beneficiaryRelation}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {claim.careType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                      {claim.providerName}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600 whitespace-nowrap">
                      {claim.careDate}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-900 text-left whitespace-nowrap">
                      {formatCurrency(claim.totalAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-left whitespace-nowrap">
                      {claim.approvedAmount > 0 ? (
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(claim.approvedAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          ~{formatCurrency(claim.estimatedReimbursement)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusLabel status={claim.status} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedClaim(claim)}
                          title="معاينة التفاصيل"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(claim.status === 'قيد الدراسة' ||
                          claim.status === 'وثائق ناقصة') && (
                          <button
                            type="button"
                            onClick={() => openEditModal(claim)}
                            title="تعديل أو استكمال الملف"
                            className="p-1.5 text-slate-500 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {claim.status === 'قيد الدراسة' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClaim(claim)}
                            title="سحب الطلب"
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Claim Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={editingClaim ? 'تعديل الملف' : 'إيداع ملف جديد'}
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingClaim
                  ? `تعديل / استكمال الملف ${editingClaim.referenceCode}`
                  : 'إيداع ملف تعويض أو منحة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClaim} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              {!editingClaim && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      المستفيد
                    </label>
                    <select
                      value={beneficiaryKey}
                      onChange={(e) => setBeneficiaryKey(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      {beneficiaryOptions.map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.name} ({b.relation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      نوع الأداء أو المنحة
                    </label>
                    <select
                      value={careType}
                      onChange={(e) => setCareType(e.target.value as CareType)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      {CARE_TYPES.map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  اسم الطبيب / المصحة / المختبر أو الجهة الإدارية
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="مثال: مصحة بن عكنون، صيدلية النور، أو مديرية التربية"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    تاريخ العلاج أو الفاتورة أو الحدث
                  </label>
                  <input
                    type="date"
                    required
                    value={careDate}
                    onChange={(e) => setCareDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    المبلغ الإجمالي / المرجعي (د.ج)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="5000000"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">
                      التعويض التقديري من التعاضدية (MUTNATEC)
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {selectedRule.mode === 'fixed'
                        ? `مبلغ مقطوع · الصلاحية: ${selectedRule.validityPeriod}`
                        : `نسبة التغطية: ${liveEstimate.effectiveRate}% · الصلاحية: ${selectedRule.validityPeriod}`}
                    </p>
                  </div>
                  <p className="font-mono-tabular text-base font-bold text-blue-800">
                    {formatCurrency(liveEstimate.totalReimbursement)}
                  </p>
                </div>
                <p className="text-slate-600 border-t border-slate-200 pt-2">
                  الوثائق المطلوبة: {selectedRule.requiredDocs.join(' · ')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ملاحظات وتفاصيل الوثائق المرفقة
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أدخل أرقام الفواتير أو الوثائق المرفقة بالملف القاعدي..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? 'جاري الحفظ...'
                    : editingClaim
                    ? 'حفظ وإعادة الإرسال'
                    : 'تأكيد إيداع الملف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل الملف"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  تفاصيل الملف <span className="font-mono-tabular">{selectedClaim.referenceCode}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedClaim.careType} · {selectedClaim.careDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">الوضعية الحالية</span>
                <StatusLabel status={selectedClaim.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">المستفيد</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedClaim.beneficiaryName}
                  </p>
                  <p className="text-xs text-slate-500">{selectedClaim.beneficiaryRelation}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">مقدم الخدمة / الجهة</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedClaim.providerName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">المبلغ المصرح به</p>
                  <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(selectedClaim.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    {selectedClaim.approvedAmount > 0 ? 'التعويض المصادق عليه' : 'التعويض التقديري'}
                  </p>
                  <p className="font-mono-tabular font-bold text-emerald-700 mt-0.5">
                    {formatCurrency(
                      selectedClaim.approvedAmount > 0
                        ? selectedClaim.approvedAmount
                        : selectedClaim.estimatedReimbursement
                    )}
                  </p>
                </div>
              </div>

              {selectedClaim.notes && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-semibold text-slate-600 mb-1">ملاحظات المنخرط</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{selectedClaim.notes}</p>
                </div>
              )}

              {selectedClaim.reviewerNote && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-900 mb-1">
                    ملاحظة المراقبة الطبية والإدارية
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {selectedClaim.reviewerNote}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              {(selectedClaim.status === 'قيد الدراسة' ||
                selectedClaim.status === 'وثائق ناقصة') && (
                <button
                  type="button"
                  onClick={() => openEditModal(selectedClaim)}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
                >
                  تعديل واستكمال الملف
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
