import { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Plus, Trash2, Users, X, CheckCircle2, Ban } from 'lucide-react';
import { generateSafeId, ISO_DATE_REGEX } from '../data/mutualCatalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  createInternalDependent,
  deleteInternalDependent,
  toggleInternalDependent,
} from '../lib/internalApi';
import type {
  AuthSessionMode,
  Dependent,
  DependentRelationship,
  MemberProfile,
} from '../types/mutual';

interface DependentsManagerProps {
  member: MemberProfile;
  dependents: Dependent[];
  sessionMode: AuthSessionMode;
  internalToken?: string;
  onInternalSync?: () => Promise<void>;
}

const RELATIONSHIPS: DependentRelationship[] = [
  'الزوج/الزوجة',
  'ابن/ابنة',
  'أحد الوالدين',
];

export function DependentsManager({
  member,
  dependents,
  sessionMode,
  internalToken = '',
  onInternalSync,
}: DependentsManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState<DependentRelationship>('ابن/ابنة');
  const [birthDate, setBirthDate] = useState('2016-05-15');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim().slice(0, 120);
    if (cleanName.length < 2) {
      setFormError('يرجى إدخال الاسم الكامل للمستفيد (حرفان على الأقل).');
      return;
    }
    if (!ISO_DATE_REGEX.test(birthDate)) {
      setFormError('تاريخ الازدياد غير صالح.');
      return;
    }

    setSubmitting(true);
    try {
      if (sessionMode === 'internal') {
        await createInternalDependent(internalToken, {
          fullName: cleanName,
          relationship,
          birthDate,
        });
        await onInternalSync?.();
      } else {
        const coverageCode = generateSafeId('DEP').slice(0, 24);
        await addDoc(collection(db, 'members', member.uid, 'dependents'), {
          ownerId: member.uid,
          fullName: cleanName,
          relationship,
          birthDate,
          coverageCode,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setFullName('');
      setShowModal(false);
    } catch (error) {
      if (sessionMode === 'internal') {
        setFormError(
          error instanceof Error ? error.message : 'تعذر تسجيل المستفيد في الملف الداخلي.'
        );
      } else {
        handleFirestoreError(
          error,
          OperationType.CREATE,
          `members/${member.uid}/dependents`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (dep: Dependent) => {
    setActionError('');
    try {
      if (sessionMode === 'internal') {
        await toggleInternalDependent(internalToken, dep.id, !dep.active);
        await onInternalSync?.();
      } else {
        await updateDoc(doc(db, 'members', member.uid, 'dependents', dep.id), {
          active: !dep.active,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      if (sessionMode === 'internal') {
        setActionError(
          error instanceof Error ? error.message : 'تعذر تحديث وضعية المستفيد.'
        );
      } else {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `members/${member.uid}/dependents/${dep.id}`
        );
      }
    }
  };

  const handleRemoveDependent = async (dep: Dependent) => {
    setActionError('');
    try {
      if (sessionMode === 'internal') {
        await deleteInternalDependent(internalToken, dep.id);
        await onInternalSync?.();
      } else {
        await deleteDoc(doc(db, 'members', member.uid, 'dependents', dep.id));
      }
    } catch (error) {
      if (sessionMode === 'internal') {
        setActionError(
          error instanceof Error ? error.message : 'تعذر حذف المستفيد.'
        );
      } else {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `members/${member.uid}/dependents/${dep.id}`
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ذوو الحقوق والملف العائلي</h2>
          <p className="text-sm text-slate-500 mt-1">
            تسجيل وإدارة أفراد الأسرة المستفيدين من التغطية الصحية والمنح العائلية
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>تصريح بمستفيد جديد</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {actionError}
        </div>
      )}

      {dependents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            لا يوجد ذوو حقوق مسجلون حالياً
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            أضف الزوج(ة) أو الأبناء لتتمكن من إيداع ملفات المرض وطلبات التكفل باسمهم مباشرة.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستفيد عائلي</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dependents.map((dep) => (
            <div
              key={dep.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{dep.fullName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dep.relationship} · تاريخ الازدياد{' '}
                      <span className="font-mono-tabular">{dep.birthDate}</span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
                      dep.active ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {dep.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{dep.active ? 'مستفيد نشط' : 'موقوف مؤقتاً'}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>رمز التغطية</span>
                  <span className="font-mono-tabular font-medium text-slate-800">
                    {dep.coverageCode}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(dep)}
                  className="text-xs font-medium text-slate-700 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  {dep.active ? 'تعليق الاستفادة مؤقتاً' : 'تفعيل الاستفادة'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDependent(dep)}
                  title="حذف المستفيد"
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="إضافة ذوي حقوق"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">التصريح بمستفيد جديد</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDependent} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الاسم الكامل للمستفيد
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الشخصي والعائلي"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    صلة القرابة
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) =>
                      setRelationship(e.target.value as DependentRelationship)
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    تاريخ الازدياد
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
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
                  {submitting ? 'جاري التسجيل...' : 'تسجيل المستفيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
