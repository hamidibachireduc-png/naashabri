import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ClipboardCheck, Plus, Trash2, X } from 'lucide-react';
import {
  AUTH_STATUS_FILTERS,
  formatCurrency,
  generateSafeId,
  ISO_DATE_REGEX,
  PROCEDURE_TYPES,
  todayIsoDate,
} from '../data/mutualCatalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  createInternalAuthorization,
  deleteInternalAuthorization,
} from '../lib/internalApi';
import type {
  AuthSessionMode,
  AuthorizationRequest,
  AuthorizationStatus,
  Dependent,
  MemberProfile,
  ProcedureType,
} from '../types/mutual';
import { StatusLabel } from './StatusLabel';

interface AuthorizationsManagerProps {
  member: MemberProfile;
  dependents: Dependent[];
  authorizations: AuthorizationRequest[];
  sessionMode: AuthSessionMode;
  internalToken?: string;
  onInternalSync?: () => Promise<void>;
}

export function AuthorizationsManager({
  member,
  dependents,
  authorizations,
  sessionMode,
  internalToken = '',
  onInternalSync,
}: AuthorizationsManagerProps) {
  const [statusFilter, setStatusFilter] = useState<'الكل' | AuthorizationStatus>('الكل');
  const [showModal, setShowModal] = useState(false);

  const [beneficiaryName, setBeneficiaryName] = useState(member.fullName);
  const [procedureType, setProcedureType] = useState<ProcedureType>('استشفاء وجراحة');
  const [facilityName, setFacilityName] = useState('');
  const [expectedDate, setExpectedDate] = useState(todayIsoDate());
  const [estimatedCost, setEstimatedCost] = useState('15000');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const beneficiaries = useMemo(() => {
    return [
      member.fullName,
      ...dependents.filter((d) => d.active).map((d) => d.fullName),
    ];
  }, [member.fullName, dependents]);

  const filteredAuths = useMemo(() => {
    return authorizations.filter(
      (a) => statusFilter === 'الكل' || a.status === statusFilter
    );
  }, [authorizations, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanFacility = facilityName.trim().slice(0, 140);
    const cleanNotes = notes.trim().slice(0, 600);
    const costNum = Number(estimatedCost);

    if (cleanFacility.length < 2) {
      setFormError('يرجى إدخال اسم المصحة أو المركز الطبي المعني.');
      return;
    }
    if (!ISO_DATE_REGEX.test(expectedDate)) {
      setFormError('التاريخ المتوقع غير صالح.');
      return;
    }
    if (!Number.isFinite(costNum) || costNum <= 0 || costNum > 5000000) {
      setFormError('يرجى إدخال كلفة تقديرية صحيحة بالدينار الجزائري.');
      return;
    }

    setSubmitting(true);
    try {
      if (sessionMode === 'internal') {
        await createInternalAuthorization(internalToken, {
          beneficiaryName: beneficiaryName.slice(0, 120),
          procedureType,
          facilityName: cleanFacility,
          expectedDate,
          estimatedCost: costNum,
          notes: cleanNotes,
        });
        await onInternalSync?.();
      } else {
        const refCode = generateSafeId('PEC').slice(0, 24);
        await addDoc(collection(db, 'authorizations'), {
          ownerId: member.uid,
          memberName: member.fullName.slice(0, 120),
          referenceCode: refCode,
          beneficiaryName: beneficiaryName.slice(0, 120),
          procedureType,
          facilityName: cleanFacility,
          expectedDate,
          estimatedCost: costNum,
          status: 'قيد الدراسة',
          notes: cleanNotes,
          reviewerNote: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setFacilityName('');
      setNotes('');
      setShowModal(false);
    } catch (error) {
      if (sessionMode === 'internal') {
        setFormError(
          error instanceof Error ? error.message : 'تعذر إرسال طلب التكفل المسبق.'
        );
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'authorizations');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (req: AuthorizationRequest) => {
    setActionError('');
    try {
      if (sessionMode === 'internal') {
        await deleteInternalAuthorization(internalToken, req.id);
        await onInternalSync?.();
      } else {
        await deleteDoc(doc(db, 'authorizations', req.id));
      }
    } catch (error) {
      if (sessionMode === 'internal') {
        setActionError(
          error instanceof Error ? error.message : 'تعذر إلغاء طلب التكفل.'
        );
      } else {
        handleFirestoreError(error, OperationType.DELETE, `authorizations/${req.id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            طلبات التكفل المسبق (PEC)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            طلب الموافقة المسبقة للاستشفاء، الفحوصات بالأشعة الكبرى، وتركيبات الأسنان داخل الوطن
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBeneficiaryName(member.fullName);
            setFormError('');
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>طلب تكفل مسبق جديد</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {actionError}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {AUTH_STATUS_FILTERS.map((st) => (
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
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredAuths.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              لا توجد طلبات تكفل مسبق
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              عند برمجة تدخل جراحي أو فحص بالرنين المغناطيسي لدى مصحة متعاقدة، أودع طلب التكفل للحصول على الموافقة القبلية.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">رقم الطلب</th>
                  <th className="py-3 px-4 whitespace-nowrap">المستفيد</th>
                  <th className="py-3 px-4 whitespace-nowrap">نوع الإجراء</th>
                  <th className="py-3 px-4 whitespace-nowrap">المؤسسة الصحية</th>
                  <th className="py-3 px-4 whitespace-nowrap">التاريخ المتوقع</th>
                  <th className="py-3 px-4 whitespace-nowrap text-left">الكلفة التقديرية</th>
                  <th className="py-3 px-4 whitespace-nowrap">الوضعية</th>
                  <th className="py-3 px-4 whitespace-nowrap">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAuths.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-slate-800 whitespace-nowrap">
                      {req.referenceCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {req.beneficiaryName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{req.procedureType}</td>
                    <td className="py-3 px-4 text-slate-700">{req.facilityName}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600 whitespace-nowrap">
                      {req.expectedDate}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-900 text-left whitespace-nowrap">
                      {formatCurrency(req.estimatedCost)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>
                        <StatusLabel status={req.status} />
                        {req.reviewerNote && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">
                            {req.reviewerNote}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {req.status === 'قيد الدراسة' && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req)}
                          title="إلغاء الطلب"
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="طلب تكفل مسبق جديد"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                طلب تكفل مسبق (PEC)
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    المستفيد
                  </label>
                  <select
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    {beneficiaries.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    نوع الإجراء الطبي
                  </label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value as ProcedureType)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    {PROCEDURE_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  المصحة أو المركز الطبي المتعاقد
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="مثال: مصحة الضمان الاجتماعي والتعاضدية — بن عكنون"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    التاريخ المبرمج
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الكلفة التقديرية حسب الفاتورة الشكلية (د.ج)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="5000000"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  توصيات الطبيب المعالج وملاحظات
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مرجع عرض الثمن (Devis) أو تفاصيل التدخل المبرمج..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'جاري الإرسال...' : 'إرسال طلب التكفل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
