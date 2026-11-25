import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { ShieldCheck } from 'lucide-react';
import {
  CITIES_LIST,
  COVERAGE_PLANS,
  EMBLEM_IMAGE_PATH,
  generateMembershipNumber,
  SAFE_ID_REGEX,
  SECTORS_LIST,
} from '../data/mutualCatalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { CoveragePlan } from '../types/mutual';
import { BrandImage } from './BrandImage';

interface MemberOnboardingProps {
  user: User;
}

export function MemberOnboarding({ user }: MemberOnboardingProps) {
  const [fullName, setFullName] = useState(user.displayName || 'منخرط التعاضدية الوطنية');
  const [nationalId, setNationalId] = useState('1986160420019482');
  const [sector, setSector] = useState(SECTORS_LIST[0]);
  const [city, setCity] = useState(CITIES_LIST[0]);
  const [phone, setPhone] = useState('0550123456');
  const [rib, setRib] = useState('00799999002481920455');
  const [coveragePlan, setCoveragePlan] = useState<CoveragePlan>('التغطية التكميلية+');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = fullName.trim().slice(0, 120);
    const cleanNin = nationalId.trim().slice(0, 32);
    const cleanPhone = phone.trim().slice(0, 30);
    const cleanRib = rib.replace(/\s+/g, '').slice(0, 34);
    const membershipNumber = generateMembershipNumber(user.uid);

    if (cleanName.length < 2) {
      setErrorMsg('يرجى إدخال الاسم الكامل.');
      return;
    }
    if (!SAFE_ID_REGEX.test(cleanNin) || cleanNin.length < 3) {
      setErrorMsg('رقم التعريف الوطني / الضمان الاجتماعي يجب أن يحتوي على أرقام أو أحرف إنجليزية فقط.');
      return;
    }
    if (cleanPhone.length < 6) {
      setErrorMsg('يرجى إدخال رقم هاتف جزائري صحيح.');
      return;
    }
    if (cleanRib.length < 10) {
      setErrorMsg('يرجى إدخال رقم الحساب البريدي (CCP) أو البنكي (RIB) من 10 أرقام على الأقل.');
      return;
    }

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'members', user.uid), {
        uid: user.uid,
        fullName: cleanName,
        email: (user.email || 'member@mutnatec.dz').slice(0, 160),
        nationalId: cleanNin,
        membershipNumber,
        sector: sector.slice(0, 100),
        city: city.slice(0, 80),
        phone: cleanPhone,
        rib: cleanRib,
        coveragePlan,
        annualCeiling: 250000,
        status: 'نشط',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `members/${user.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
          <BrandImage
            src={EMBLEM_IMAGE_PATH}
            alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
            fallbackLabel="MUTNATEC"
            className="w-12 h-12 rounded-full object-contain bg-white border border-slate-200 shrink-0"
          />
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              تفعيل فضاء المنخرط — التعاضدية الوطنية (MUTNATEC)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              استكمل بياناتك المهنية لإنشاء بطاقتك التعاضدية الرقمية بالجزائر
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                رقم الضمان الاجتماعي / التعريف (NSS / NIN)
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
                القطاع / الهيئة المستخدمة
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
                صيغة التغطية
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رقم الحساب البريدي (CCP / RIP) أو البنكي (RIB) لصرف التعويضات
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

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-800" aria-hidden="true" />
              <span>بياناتك محمية ومشفرة</span>
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'جاري التفعيل...' : 'تفعيل فضاء المنخرط'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
