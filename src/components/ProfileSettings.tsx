import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CreditCard, FileBadge, Save, CheckCircle2 } from 'lucide-react';
import {
  CITIES_LIST,
  COVERAGE_PLANS,
  SAFE_ID_REGEX,
  SECTORS_LIST,
} from '../data/mutualCatalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { updateInternalProfile } from '../lib/internalApi';
import type { AuthSessionMode, CoveragePlan, MemberProfile } from '../types/mutual';
import { StatusLabel } from './StatusLabel';

interface ProfileSettingsProps {
  member: MemberProfile;
  sessionMode: AuthSessionMode;
  internalToken?: string;
  onInternalSync?: () => Promise<void>;
  onOpenCard: (mode: 'card' | 'attestation') => void;
}

export function ProfileSettings({
  member,
  sessionMode,
  internalToken = '',
  onInternalSync,
  onOpenCard,
}: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(member.fullName);
  const [nationalId, setNationalId] = useState(member.nationalId);
  const [sector, setSector] = useState(member.sector);
  const [city, setCity] = useState(member.city);
  const [phone, setPhone] = useState(member.phone);
  const [rib, setRib] = useState(member.rib);
  const [coveragePlan, setCoveragePlan] = useState<CoveragePlan>(member.coveragePlan);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedNotice(false);

    const cleanName = fullName.trim().slice(0, 120);
    const cleanCin = nationalId.trim().slice(0, 32);
    const cleanPhone = phone.trim().slice(0, 30);
    const cleanRib = rib.replace(/\s+/g, '').slice(0, 34);

    if (cleanName.length < 2) {
      setErrorMsg('يرجى إدخال الاسم واللقب.');
      return;
    }
    if (!SAFE_ID_REGEX.test(cleanCin) || cleanCin.length < 3) {
      setErrorMsg('رقم الضمان الاجتماعي / التعريف الوطني يجب أن يحتوي على أرقام أو أحرف إنجليزية فقط.');
      return;
    }
    if (cleanPhone.length < 6) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح.');
      return;
    }
    if (cleanRib.length < 10) {
      setErrorMsg('يرجى إدخال رقم الحساب البريدي (CCP/RIP) أو البنكي (RIB) من 10 أرقام على الأقل.');
      return;
    }

    setSaving(true);
    try {
      if (sessionMode === 'internal') {
        await updateInternalProfile(internalToken, {
          fullName: cleanName,
          nationalId: cleanCin,
          sector: sector.slice(0, 100),
          city: city.slice(0, 80),
          phone: cleanPhone,
          rib: cleanRib,
          coveragePlan,
        });
        await onInternalSync?.();
      } else {
        await updateDoc(doc(db, 'members', member.uid), {
          fullName: cleanName,
          nationalId: cleanCin,
          sector: sector.slice(0, 100),
          city: city.slice(0, 80),
          phone: cleanPhone,
          rib: cleanRib,
          coveragePlan,
          updatedAt: serverTimestamp(),
        });
      }
      setSavedNotice(true);
    } catch (error) {
      if (sessionMode === 'internal') {
        setErrorMsg(
          error instanceof Error ? error.message : 'تعذر حفظ المعطيات في الملف الداخلي.'
        );
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `members/${member.uid}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">الملف الشخصي والوثائق الرقمية</h2>
          <p className="text-sm text-slate-500 mt-1">
            تحديث المعطيات المهنية والحساب البريدي (CCP) لصرف التعويضات وطباعة الشهادات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCard('card')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <CreditCard className="w-4 h-4 text-blue-800" />
            <span>استخراج البطاقة الرقمية</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenCard('attestation')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileBadge className="w-4 h-4" />
            <span>شهادة الانخراط</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">رقم الانخراط المرجعي</p>
            <p className="font-mono-tabular text-lg font-bold text-slate-900">
              {member.membershipNumber}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              {sessionMode === 'internal' ? 'نمط الحساب' : 'البريد الإلكتروني المسجل'}
            </p>
            <p className="text-sm font-medium text-slate-800">
              {sessionMode === 'internal'
                ? `ملف داخلي موثق · ${member.email}`
                : member.email}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">وضعية الاشتراك</p>
            <StatusLabel status={member.status} />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          {savedNotice && (
            <div className="p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>تم حفظ وتحديث معطيات الملف الشخصي بنجاح.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الاسم واللقب
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رقم الضمان الاجتماعي / التعريف الوطني (NSS / NIN)
              </label>
              <input
                type="text"
                required
                maxLength={32}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                القطاع أو الهيئة المستخدمة
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {SECTORS_LIST.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الولاية
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {CITIES_LIST.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رقم الهاتف
              </label>
              <input
                type="tel"
                required
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                صيغة التغطية التعاضدية
              </label>
              <select
                value={coveragePlan}
                onChange={(e) => setCoveragePlan(e.target.value as CoveragePlan)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {COVERAGE_PLANS.map((pl) => (
                  <option key={pl} value={pl}>
                    {pl}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رقم الحساب البريدي (CCP / RIP) أو البنكي (RIB) لتحويل التعويضات
              </label>
              <input
                type="text"
                required
                maxLength={34}
                value={rib}
                onChange={(e) => setRib(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
