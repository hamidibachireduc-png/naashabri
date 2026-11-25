import { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Download,
  Edit3,
  KeyRound,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import {
  CITIES_LIST,
  COVERAGE_PLANS,
  SECTORS_LIST,
} from '../data/mutualCatalog';
import {
  addAdminRosterMember,
  deleteAdminRosterMember,
  fetchAdminRoster,
  importAdminRoster,
  updateAdminRosterMember,
} from '../lib/internalApi';
import type {
  CoveragePlan,
  InternalRosterMember,
  MemberGender,
  MemberProfile,
  MemberStatus,
} from '../types/mutual';
import { DigitalCardModal } from './DigitalCardModal';
import { StatusLabel } from './StatusLabel';

interface InternalRosterAdminProps {
  adminToken: string;
}

export function InternalRosterAdmin({ adminToken }: InternalRosterAdminProps) {
  const [roster, setRoster] = useState<InternalRosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [membershipNumber, setMembershipNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<MemberGender>('ذكر');
  const [seniorityYears, setSeniorityYears] = useState('5');
  const [sector, setSector] = useState(SECTORS_LIST[0]);
  const [city, setCity] = useState(CITIES_LIST[0]);
  const [municipality, setMunicipality] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('0550123456');
  const [rib, setRib] = useState('00799999002481920455');
  const [coveragePlan, setCoveragePlan] = useState<CoveragePlan>('التغطية التكميلية+');
  const [annualCeiling, setAnnualCeiling] = useState('250000');
  const [status, setStatus] = useState<MemberStatus>('نشط');
  const [saving, setSaving] = useState(false);
  const [cardMember, setCardMember] = useState<MemberProfile | null>(null);

  const loadRoster = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchAdminRoster(adminToken);
      setRoster(res.roster);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل الملف الداخلي للمنخرطين.'
      );
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const filtered = roster.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.membershipNumber.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      m.nationalId.toLowerCase().includes(q) ||
      m.city.toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setEditingNumber(null);
    setMembershipNumber(`MUT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setAccessCode(String(Math.floor(10000000 + Math.random() * 89999999)));
    setFullName('');
    setEmail('member@mutnatec.dz');
    setNationalId('');
    setGender('ذكر');
    setSeniorityYears('5');
    setSector(SECTORS_LIST[0]);
    setCity(CITIES_LIST[0]);
    setMunicipality(CITIES_LIST[0]);
    setInstitution('');
    setPhone('0550123456');
    setRib('00799999002481920455');
    setCoveragePlan('التغطية التكميلية+');
    setAnnualCeiling('250000');
    setStatus('نشط');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (m: InternalRosterMember) => {
    setEditingNumber(m.membershipNumber);
    setMembershipNumber(m.membershipNumber);
    setAccessCode(m.accessCode);
    setFullName(m.fullName);
    setEmail(m.email);
    setNationalId(m.nationalId);
    setGender(m.gender === 'أنثى' ? 'أنثى' : 'ذكر');
    setSeniorityYears(String(m.seniorityYears ?? 5));
    setSector(m.sector);
    setCity(m.city);
    setMunicipality(m.municipality || m.city);
    setInstitution(m.institution || '');
    setPhone(m.phone);
    setRib(m.rib);
    setCoveragePlan(m.coveragePlan);
    setAnnualCeiling(String(m.annualCeiling));
    setStatus(m.status);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setErrorMsg('');
    setNoticeMsg('');
    setSaving(true);
    const cleanSeniority = Math.max(0, Math.min(50, Math.round(Number(seniorityYears) || 0)));
    try {
      if (editingNumber) {
        const res = await updateAdminRosterMember(adminToken, editingNumber, {
          fullName,
          accessCode,
          gender,
          seniorityYears: cleanSeniority,
          sector,
          city,
          municipality: municipality.trim() || city,
          institution: institution.trim() || sector,
          phone,
          rib,
          coveragePlan,
          annualCeiling: Number(annualCeiling) || 250000,
          status,
        });
        setRoster(res.roster);
        setNoticeMsg(`تم تحديث حساب المنخرط ${editingNumber} في الملف الداخلي.`);
      } else {
        const res = await addAdminRosterMember(adminToken, {
          membershipNumber,
          accessCode,
          fullName,
          email: email || 'member@mutnatec.dz',
          nationalId,
          gender,
          seniorityYears: cleanSeniority,
          sector,
          city,
          municipality: municipality.trim() || city,
          institution: institution.trim() || sector,
          phone,
          rib,
          coveragePlan,
          annualCeiling: Number(annualCeiling) || 250000,
          status,
        });
        setRoster(res.roster);
        setNoticeMsg(`تمت إضافة المنخرط ${membershipNumber} إلى الملف الداخلي بنجاح.`);
      }
      setShowModal(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حفظ المنخرط.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (m: InternalRosterMember) => {
    if (!adminToken) return;
    try {
      const nextStatus: MemberStatus = m.status === 'نشط' ? 'معلق' : 'نشط';
      const res = await updateAdminRosterMember(adminToken, m.membershipNumber, {
        status: nextStatus,
      });
      setRoster(res.roster);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تغيير وضعية الحساب.');
    }
  };

  const handleDelete = async (membershipNum: string) => {
    if (!adminToken) return;
    try {
      const res = await deleteAdminRosterMember(adminToken, membershipNum);
      setRoster(res.roster);
      setNoticeMsg(`تم حذف الحساب ${membershipNum} من الملف الداخلي.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حذف الحساب.');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(roster, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `internal-members-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as InternalRosterMember[];
      const res = await importAdminRoster(adminToken, parsed);
      setRoster(res.roster);
      setNoticeMsg(`تم استيراد ${res.count} سجل منخرط وتحديث الملف الداخلي.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'فشل استيراد ملف JSON الداخلي.'
      );
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            الملف الداخلي للمنخرطين (data/internal-members.json)
          </h3>
          <p className="text-xs text-slate-500">
            التحكم الكامل في حسابات الدخول المباشر (رقم الانخراط + رمز الدخول) وتصدير أو استيراد الملف الداخلي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير JSON</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>استيراد ملف JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة منخرط للملف</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {errorMsg}
        </div>
      )}

      {noticeMsg && (
        <div className="p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          {noticeMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-sm">
          <Search
            className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الانخراط، الاسم، أو الولاية..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            جاري قراءة الملف الداخلي للمنخرطين...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            لا توجد حسابات مسجلة في الملف الداخلي تطابق البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">رقم الانخراط</th>
                  <th className="py-3 px-4">الاسم واللقب</th>
                  <th className="py-3 px-4">الولاية والقطاع</th>
                  <th className="py-3 px-4">رمز الدخول</th>
                  <th className="py-3 px-4">الوضعية</th>
                  <th className="py-3 px-4">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((m) => (
                  <tr key={m.membershipNumber} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-tabular text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {m.membershipNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{m.fullName}</div>
                      <div className="text-xs font-mono-tabular text-slate-500">
                        NSS/NIN: {m.nationalId}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{m.city}</div>
                      <div className="text-xs text-slate-500 max-w-[200px] truncate">
                        {m.sector}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        <span>{m.accessCode}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel status={m.status} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCardMember({
                              uid: `internal:${m.membershipNumber}`,
                              fullName: m.fullName,
                              email: m.email,
                              nationalId: m.nationalId,
                              socialSecurityNumber: m.socialSecurityNumber,
                              birthDate: m.birthDate,
                              birthPlace: m.birthPlace,
                              jobTitle: m.jobTitle,
                              municipality: m.municipality,
                              institution: m.institution,
                              memberRole: m.memberRole,
                              enrollmentYear: m.enrollmentYear,
                              cardQrSig: m.cardQrSig,
                              membershipNumber: m.membershipNumber,
                              sector: m.sector,
                              city: m.city,
                              phone: m.phone,
                              rib: m.rib,
                              coveragePlan: m.coveragePlan,
                              annualCeiling: m.annualCeiling,
                              status: m.status,
                            })
                          }
                          title="استخراج البطاقة الرقمية للمنخرط"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span>بطاقة QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          title="تعديل البيانات أو رمز الدخول"
                          className="p-1.5 text-slate-500 hover:text-blue-800 hover:bg-blue-50 rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(m)}
                          title={m.status === 'نشط' ? 'تعليق الحساب' : 'تفعيل الحساب'}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md cursor-pointer"
                        >
                          {m.status === 'نشط' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.membershipNumber)}
                          title="حذف من الملف الداخلي"
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingNumber
                  ? `تحديث حساب ${editingNumber}`
                  : 'إضافة منخرط إلى الملف الداخلي'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رقم الانخراط
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingNumber)}
                    value={membershipNumber}
                    onChange={(e) => setMembershipNumber(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رمز الدخول (كلمة المرور)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الاسم واللقب
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رقم الضمان / التعريف (NSS / NIN)
                  </label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الجنس
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as MemberGender)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الأقدمية المهنية (سنوات)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={seniorityYears}
                    onChange={(e) => setSeniorityYears(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الولاية
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
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
                    البلدية
                  </label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="اسم البلدية..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    القطاع
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
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
                    المؤسسة التربوية / الثقافية
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="اسم الثانوية / المتوسطة / دار الثقافة..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    صيغة التغطية
                  </label>
                  <select
                    value={coveragePlan}
                    onChange={(e) => setCoveragePlan(e.target.value as CoveragePlan)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {COVERAGE_PLANS.map((pl) => (
                      <option key={pl} value={pl}>
                        {pl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الوضعية
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MemberStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="نشط">نشط</option>
                    <option value="قيد المراجعة">قيد المراجعة</option>
                    <option value="معلق">معلق</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الحساب البريدي (CCP) أو RIB
                  </label>
                  <input
                    type="text"
                    value={rib}
                    onChange={(e) => setRib(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-right"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ في الملف الداخلي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cardMember && (
        <DigitalCardModal
          member={cardMember}
          dependents={[]}
          mode="card"
          onClose={() => setCardMember(null)}
        />
      )}
    </div>
  );
}
