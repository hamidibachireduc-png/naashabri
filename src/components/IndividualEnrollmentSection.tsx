import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSearch,
  Send,
  UserPlus,
} from 'lucide-react';
import {
  ALL_58_WILAYAS,
  COVERAGE_PLANS,
  SAFE_ID_REGEX,
  SECTORS_LIST,
} from '../data/mutualCatalog';
import {
  checkIndividualEnrollment,
  submitIndividualEnrollment,
} from '../lib/internalApi';
import type { CoveragePlan, EnrollmentStatus, MemberGender } from '../types/mutual';

export function IndividualEnrollmentSection() {
  const [mode, setMode] = useState<'apply' | 'track'>('apply');

  // Apply form state
  const [fullName, setFullName] = useState('');
  const [socialSecurityNumber, setSocialSecurityNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<MemberGender>('ذكر');
  const [seniorityYears, setSeniorityYears] = useState('5');
  const [birthDate, setBirthDate] = useState('1988-01-01');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sector, setSector] = useState(SECTORS_LIST[0]);
  const [city, setCity] = useState('الجزائر');
  const [municipality, setMunicipality] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [rib, setRib] = useState('');
  const [coveragePlan, setCoveragePlan] = useState<CoveragePlan>('التغطية التكميلية+');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedResult, setSubmittedResult] = useState<{
    trackingCode: string;
    fullName: string;
    status: EnrollmentStatus;
    statusMessage: string;
  } | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Track form state
  const [trackCode, setTrackCode] = useState('');
  const [trackNationalId, setTrackNationalId] = useState('');
  const [checking, setChecking] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackedResult, setTrackedResult] = useState<{
    trackingCode: string;
    fullName: string;
    city: string;
    coveragePlan: CoveragePlan;
    status: EnrollmentStatus;
    statusMessage: string;
    reviewerNote: string;
    assignedMembershipNumber: string;
    updatedAt: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const cleanName = fullName.trim();
    const cleanNss = socialSecurityNumber.replace(/\s+/g, '');
    const cleanNin = nationalId.replace(/\s+/g, '');
    const cleanPhone = phone.trim();
    const cleanRib = rib.replace(/\s+/g, '');

    if (cleanName.length < 2) {
      setSubmitError('يرجى إدخال الاسم واللقب الكاملين.');
      return;
    }
    if (!SAFE_ID_REGEX.test(cleanNss) || cleanNss.length < 4) {
      setSubmitError(
        'رقم الضمان الاجتماعي (NSS) يجب أن يتكون من أرقام أو أحرف إنجليزية صحيحة.'
      );
      return;
    }
    if (!SAFE_ID_REGEX.test(cleanNin) || cleanNin.length < 4) {
      setSubmitError(
        'رقم التعريف الوطني (NIN) يجب أن يتكون من أرقام أو أحرف إنجليزية صحيحة.'
      );
      return;
    }
    if (cleanPhone.length < 6) {
      setSubmitError('يرجى إدخال رقم هاتف صحيح للتواصل.');
      return;
    }
    if (cleanRib.length < 10) {
      setSubmitError(
        'يرجى إدخال رقم الحساب البريدي (CCP / RIP) أو البنكي (RIB) من 10 أرقام على الأقل.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitIndividualEnrollment({
        fullName: cleanName,
        socialSecurityNumber: cleanNss,
        nationalId: cleanNin,
        gender,
        seniorityYears: Math.max(0, Math.min(50, Math.round(Number(seniorityYears) || 0))),
        birthDate,
        phone: cleanPhone,
        email: email.trim(),
        sector,
        city,
        municipality: municipality.trim() || city,
        workplace: workplace.trim(),
        rib: cleanRib,
        coveragePlan,
        notes: notes.trim(),
      });
      setSubmittedResult(res.enrollment);
      setTrackCode(res.enrollment.trackingCode);
      setTrackNationalId(cleanNin);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'تعذر إرسال طلب الانخراط في الوقت الحالي.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTracking = async () => {
    if (!submittedResult) return;
    try {
      await navigator.clipboard.writeText(submittedResult.trackingCode);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    } catch {
      setCopiedTracking(false);
    }
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackedResult(null);
    setChecking(true);
    try {
      const res = await checkIndividualEnrollment({
        trackingCode: trackCode.trim(),
        nationalId: trackNationalId.trim(),
      });
      setTrackedResult(res.enrollment);
    } catch (err) {
      setTrackError(
        err instanceof Error ? err.message : 'تعذر التحقق من حالة الطلب.'
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <section
      id="enrollment"
      aria-labelledby="enrollment-heading"
      className="bg-slate-50 border-t border-slate-200 py-12"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              التسجيل الرقمي للمنخرطين الجدد — عمال التربية والثقافة بالجزائر
            </p>
            <h2
              id="enrollment-heading"
              className="text-xl sm:text-2xl font-bold text-slate-900 mt-1"
            >
              الانخراط الفردي الإلكتروني
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setMode('apply')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'apply'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>استمارة الانخراط الإلكتروني</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('track')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'track'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" aria-hidden="true" />
              <span>متابعة حالة الطلب</span>
            </button>
          </div>
        </div>

        {mode === 'apply' ? (
          submittedResult ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-700" aria-hidden="true" />
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    تم استلام طلب الانخراط الفردي الإلكتروني بنجاح
                  </h3>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-amber-900">
                    {submittedResult.statusMessage}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    مقدم الطلب: <strong>{submittedResult.fullName}</strong> · يرجى الاحتفاظ
                    برقم المتابعة التالي لمراجعة قرار الإدارة لاحقاً أو تفعيل حسابكم فور
                    المصادقة:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500">رقم متابعة طلب الانخراط</p>
                  <p className="font-mono-tabular text-xl font-bold text-blue-900 mt-0.5">
                    {submittedResult.trackingCode}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTracking}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                  >
                    {copiedTracking ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-700">تم نسخ الرقم</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>نسخ رقم المتابعة</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('track')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer whitespace-nowrap"
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>متابعة حالة الطلب الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedResult(null);
                      setFullName('');
                      setSocialSecurityNumber('');
                      setNationalId('');
                      setGender('ذكر');
                      setSeniorityYears('5');
                      setPhone('');
                      setEmail('');
                      setMunicipality('');
                      setWorkplace('');
                      setRib('');
                      setNotes('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    تقديم طلب آخر
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-950 leading-relaxed">
                بعد إرسال الاستمارة الإلكترونية، تخضع جميع الطلبات لمرحلة:{' '}
                <strong>«جاري ميزة التدقيق في الانخراط والموافقة من طرف الإدارة»</strong>،
                ويتم تفعيل رقم الانخراط ورمز الدخول فور مصادقة إدارة التعاضدية.
              </div>

              {submitError && (
                <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الاسم واللقب الكاملان *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="الاسم واللقب"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      رقم الضمان الاجتماعي (NSS) *
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      maxLength={32}
                      value={socialSecurityNumber}
                      onChange={(e) => setSocialSecurityNumber(e.target.value)}
                      placeholder="881234567890"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      رقم التعريف الوطني (NIN) *
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      maxLength={32}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="109880123456789012"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      تاريخ الميلاد *
                    </label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      رقم الهاتف الشخصي *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      maxLength={30}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0550 00 00 00"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      البريد الإلكتروني (اختياري)
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      maxLength={160}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.dz"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الجنس *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as MemberGender)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الأقدمية المهنية (سنوات) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      required
                      value={seniorityYears}
                      onChange={(e) => setSeniorityYears(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الولاية *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      {ALL_58_WILAYAS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      البلدية *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      placeholder="اسم البلدية (مثال: باب الزوار)"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      القطاع أو الهيئة المستخدمة *
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
                      مؤسسة العمل / الهيئة (أو التقاعد)
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={workplace}
                      onChange={(e) => setWorkplace(e.target.value)}
                      placeholder="اسم الثانوية / المتوسطة / المديرية..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      صيغة التغطية التعاضدية *
                    </label>
                    <select
                      value={coveragePlan}
                      onChange={(e) =>
                        setCoveragePlan(e.target.value as CoveragePlan)
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      {COVERAGE_PLANS.map((pl) => (
                        <option key={pl} value={pl}>
                          {pl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1 lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      رقم الحساب البريدي (CCP / RIP) أو البنكي (RIB) *
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      maxLength={34}
                      value={rib}
                      onChange={(e) => setRib(e.target.value)}
                      placeholder="00799999000000000000"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      ملاحظات أو معلومات إضافية للإدارة (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={400}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي توضيحات حول الوضعية المهنية أو ملف الانخراط..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    الحالة الأولية عند الإرسال: جاري ميزة التدقيق في الانخراط والموافقة من طرف الإدارة
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {submitting
                        ? 'جاري إرسال طلب الانخراط...'
                        : 'إرسال طلب الانخراط الفردي'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <form onSubmit={handleCheck} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رقم متابعة الطلب
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder="REQ-2026-1234"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رقم التعريف الوطني (NIN)
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={trackNationalId}
                  onChange={(e) => setTrackNationalId(e.target.value)}
                  placeholder="109880123456789012"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                />
              </div>

              <button
                type="submit"
                disabled={checking}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <FileSearch className="w-4 h-4" aria-hidden="true" />
                <span>{checking ? 'جاري البحث...' : 'التحقق من حالة الانخراط'}</span>
              </button>
            </form>

            {trackError && (
              <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {trackError}
              </div>
            )}

            {trackedResult && (
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-xs text-slate-500 font-mono-tabular">
                      {trackedResult.trackingCode} · {trackedResult.city}
                    </p>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {trackedResult.fullName}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      trackedResult.status === 'تمت الموافقة والتسجيل'
                        ? 'text-emerald-700'
                        : trackedResult.status === 'مرفوض / استكمال وثائق'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {trackedResult.status === 'تمت الموافقة والتسجيل' ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Clock className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>{trackedResult.status}</span>
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-lg border text-sm font-semibold ${
                    trackedResult.status === 'تمت الموافقة والتسجيل'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : trackedResult.status === 'مرفوض / استكمال وثائق'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {trackedResult.statusMessage}
                </div>

                {trackedResult.assignedMembershipNumber && (
                  <p className="text-xs text-slate-700">
                    رقم الانخراط المعتمد:{' '}
                    <strong className="font-mono-tabular text-blue-900">
                      {trackedResult.assignedMembershipNumber}
                    </strong>
                  </p>
                )}

                {trackedResult.reviewerNote && (
                  <p className="text-xs text-slate-600">
                    ملاحظة الإدارة: <strong>{trackedResult.reviewerNote}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
