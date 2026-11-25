import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  KeyRound,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  bulkProvisionAdminWilayaHeads,
  fetchAdminWilayaHeads,
  saveAdminWilayaHead,
} from '../lib/internalApi';
import type {
  PublicWilayaMapEntry,
  WilayaHeadAccount,
  WilayaHeadProvisionedCredential,
  WilayaHeadStatus,
} from '../types/mutual';
import { WilayaInteractiveMap } from './WilayaInteractiveMap';

interface WilayaHeadsAdminProps {
  adminToken: string;
}

export function WilayaHeadsAdmin({ adminToken }: WilayaHeadsAdminProps) {
  const [accounts, setAccounts] = useState<WilayaHeadAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'provisioned' | 'unprovisioned'>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<WilayaHeadProvisionedCredential[] | null>(
    null
  );
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Edit modal state
  const [editing, setEditing] = useState<WilayaHeadAccount | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [address, setAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [secondaryMapsUrl, setSecondaryMapsUrl] = useState('');
  const [latStr, setLatStr] = useState('');
  const [lngStr, setLngStr] = useState('');
  const [status, setStatus] = useState<WilayaHeadStatus>('نشط');
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchAdminWilayaHeads(adminToken);
      setAccounts(res.accounts);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل حسابات رؤساء التعاضديات الولائية.'
      );
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const provisionedCount = useMemo(
    () => accounts.filter((a) => a.hasPassword).length,
    [accounts]
  );
  const mappedCount = useMemo(
    () =>
      accounts.filter(
        (a) => typeof a.lat === 'number' && typeof a.lng === 'number'
      ).length,
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (filterMode === 'provisioned' && !acc.hasPassword) return false;
      if (filterMode === 'unprovisioned' && acc.hasPassword) return false;
      if (!q) return true;
      return (
        acc.wilayaCode.toLowerCase().includes(q) ||
        acc.wilayaName.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.fullName.toLowerCase().includes(q) ||
        acc.officeName.toLowerCase().includes(q) ||
        acc.phone.toLowerCase().includes(q)
      );
    });
  }, [accounts, search, filterMode]);

  const openEditor = (acc: WilayaHeadAccount) => {
    setErrorMsg('');
    setNoticeMsg('');
    setEditing(acc);
    setUsername(acc.username);
    setPassword('');
    setFullName(acc.fullName);
    setTitle(acc.title);
    setPhone(acc.phone);
    setEmail(acc.email);
    setOfficeName(acc.officeName);
    setAccountInfo(acc.accountInfo);
    setSocialUrl(acc.socialUrl);
    setAddress(acc.address);
    setGoogleMapsUrl(acc.googleMapsUrl);
    setSecondaryMapsUrl(acc.secondaryMapsUrl || '');
    setLatStr(typeof acc.lat === 'number' ? String(acc.lat) : '');
    setLngStr(typeof acc.lng === 'number' ? String(acc.lng) : '');
    setStatus(acc.status);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !adminToken) return;
    setErrorMsg('');
    setSaving(true);
    try {
      const parsedLat = latStr.trim() ? Number(latStr.trim()) : undefined;
      const parsedLng = lngStr.trim() ? Number(lngStr.trim()) : undefined;
      const res = await saveAdminWilayaHead(adminToken, editing.wilayaCode, {
        username: username.trim().toLowerCase(),
        ...(password.trim() ? { password: password.trim() } : {}),
        fullName: fullName.trim(),
        title: title.trim(),
        phone: phone.trim(),
        email: email.trim(),
        officeName: officeName.trim(),
        accountInfo: accountInfo.trim(),
        socialUrl: socialUrl.trim(),
        address: address.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        secondaryMapsUrl: secondaryMapsUrl.trim(),
        lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
        lng: Number.isFinite(parsedLng) ? parsedLng : undefined,
        status,
      });
      setAccounts(res.accounts);
      setNoticeMsg(
        `تم حفظ حساب رئيس التعاضدية الولائية (${editing.wilayaCode} — ${editing.wilayaName}) بنجاح.`
      );
      setEditing(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر حفظ بيانات حساب الرئيس الولائي.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBulkProvision = async (mode: 'missing_only' | 'reset_all') => {
    if (!adminToken) return;
    setErrorMsg('');
    setNoticeMsg('');
    setConfirmResetAll(false);
    setProvisioning(true);
    try {
      const res = await bulkProvisionAdminWilayaHeads(adminToken, mode);
      setAccounts(res.accounts);
      if (res.provisionedCount === 0) {
        setNoticeMsg('جميع حسابات رؤساء التعاضديات الولائية (96) مفعلة مسبقاً.');
      } else {
        setNoticeMsg(`تم تفعيل وتوليد كلمات مرور لـ ${res.provisionedCount} حساباً ولائياً.`);
        setGeneratedCreds(res.credentials);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تفعيل الحسابات الولائية.'
      );
    } finally {
      setProvisioning(false);
    }
  };

  const handleDownloadCredsCsv = () => {
    if (!generatedCreds || generatedCreds.length === 0) return;
    const headers = ['رمز الولاية', 'الولاية', 'اسم المستخدم', 'كلمة المرور', 'اسم الرئيس'];
    const rows = generatedCreds.map((c) =>
      [c.wilayaCode, c.wilayaName, c.username, c.password, c.fullName]
        .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mutnatec-wilaya-heads-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCreds = async () => {
    if (!generatedCreds || generatedCreds.length === 0) return;
    const lines = generatedCreds.map(
      (c) => `${c.wilayaCode} (${c.wilayaName}) | المستخدم: ${c.username} | كلمة المرور: ${c.password}`
    );
    await navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const mapEntriesPreview: PublicWilayaMapEntry[] = useMemo(() => {
    if (!editing) return [];
    const lat = latStr.trim() ? Number(latStr.trim()) : undefined;
    const lng = lngStr.trim() ? Number(lngStr.trim()) : undefined;
    return [
      {
        code: editing.wilayaCode,
        wilayaName: editing.wilayaName,
        officeName,
        representativeName: fullName,
        headTitle: title,
        headUsername: username,
        headStatus: status,
        hasActiveAccount: editing.hasPassword || Boolean(password.trim()),
        phone,
        email,
        accountInfo,
        socialUrl,
        address,
        googleMapsUrl,
        secondaryMapsUrl,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        updatedAt: editing.updatedAt,
      },
    ];
  }, [
    editing,
    officeName,
    fullName,
    title,
    username,
    status,
    password,
    phone,
    email,
    accountInfo,
    socialUrl,
    address,
    googleMapsUrl,
    secondaryMapsUrl,
    latStr,
    lngStr,
  ]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>إدارة حسابات رؤساء التعاضديات الولائية (96 ولاية / فرع)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              إنشاء وتفعيل حسابات الدخول المستقلة لرؤساء التعاضديات الولائية مع ربط كل رئيس بمقره وإحداثياته على الخريطة التفاعلية
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
              <span>
                حسابات مفعلة بكلمة مرور:{' '}
                <strong className="font-mono-tabular text-emerald-700">
                  {provisionedCount} / {accounts.length || 96}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                محددة على الخريطة:{' '}
                <strong className="font-mono-tabular text-blue-800">
                  {mappedCount} / {accounts.length || 96}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={provisioning}
              onClick={() => void handleBulkProvision('missing_only')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {provisioning ? 'جاري التوليد...' : 'تفعيل الحسابات غير المفعلة'}
              </span>
            </button>

            {!confirmResetAll ? (
              <button
                type="button"
                disabled={provisioning}
                onClick={() => setConfirmResetAll(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <span>إعادة توليد كلمات المرور للكل</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-amber-900 font-medium">تأكيد إعادة التعيين للكل؟</span>
                <button
                  type="button"
                  onClick={() => void handleBulkProvision('reset_all')}
                  className="px-2 py-1 bg-amber-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                >
                  نعم، تأكيد
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetAll(false)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برمز الولاية، اسم الولاية، اسم المستخدم (head16)، اسم الرئيس أو الهاتف..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('provisioned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'provisioned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مفعلة ({provisionedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unprovisioned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'unprovisioned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              بانتظار التفعيل ({Math.max(0, accounts.length - provisionedCount)})
            </button>
          </div>
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            جاري تحميل حسابات رؤساء التعاضديات الولائية...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            لا توجد حسابات مطابقة لعامل البحث الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">الولاية</th>
                  <th className="py-3 px-4">حساب الدخول</th>
                  <th className="py-3 px-4">رئيس التعاضدية الولائية</th>
                  <th className="py-3 px-4">الهاتف / البريد</th>
                  <th className="py-3 px-4">الموقع على الخريطة</th>
                  <th className="py-3 px-4">الوضعية</th>
                  <th className="py-3 px-4">إدارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((acc) => {
                  const hasCoords =
                    typeof acc.lat === 'number' && typeof acc.lng === 'number';
                  return (
                    <tr key={acc.wilayaCode} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-mono-tabular text-xs text-slate-500">
                          {acc.wilayaCode}
                        </div>
                        <div className="font-semibold text-slate-900">{acc.wilayaName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono-tabular text-xs font-semibold text-slate-900">
                          {acc.username}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {acc.hasPassword ? 'كلمة مرور معينة' : 'غير مفعل بعد'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {acc.fullName || 'غير مسمى بعد'}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">
                          {acc.officeName || acc.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-mono-tabular text-slate-700" dir="ltr">
                          {acc.phone || '—'}
                        </div>
                        {acc.email && (
                          <div className="font-mono-tabular text-slate-500 truncate max-w-[160px]" dir="ltr">
                            {acc.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {hasCoords ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono-tabular">
                              {acc.lat?.toFixed(3)}, {acc.lng?.toFixed(3)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">غير محدد</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`font-semibold ${
                            acc.status === 'معلق'
                              ? 'text-red-700'
                              : acc.hasPassword
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {acc.status === 'معلق'
                            ? 'معلق'
                            : acc.hasPassword
                            ? 'نشط ومفعل'
                            : 'بانتظار كلمة المرور'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openEditor(acc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                          <span>إدارة الحساب</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provisioned Credentials Export Modal */}
      {generatedCreds && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900">
                  بيانات الدخول المولدة لرؤساء التعاضديات الولائية ({generatedCreds.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedCreds(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                تُعرض كلمات المرور هذه لمرة واحدة فقط هنا لتسليمها إلى رؤساء التعاضديات الولائية. يُرجى حفظ نسخة CSV أو نسخ القائمة قبل إغلاق النافذة.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCredsCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyCreds()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCreds ? 'تم النسخ!' : 'نسخ القائمة'}</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">الولاية</th>
                      <th className="py-2.5 px-3">اسم المستخدم</th>
                      <th className="py-2.5 px-3">كلمة المرور المؤقتة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-tabular">
                    {generatedCreds.map((c) => (
                      <tr key={c.wilayaCode}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">
                          {c.wilayaCode} — {c.wilayaName}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{c.username}</td>
                        <td className="py-2 px-3 font-bold text-emerald-800">{c.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Wilaya Head Account Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-900">
                إدارة حساب رئيس التعاضدية الولائية — {editing.wilayaCode} ({editing.wilayaName})
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم المستخدم للدخول
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`head${editing.wilayaCode}`}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editing.hasPassword
                      ? 'كلمة مرور جديدة (اتركه فارغاً للإبقاء)'
                      : 'تعيين كلمة المرور (6 أحرف+)'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editing.hasPassword ? '••••••••' : 'مثال: MT-16-2026'}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    حالة الحساب
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WilayaHeadStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="نشط">نشط</option>
                    <option value="معلق">معلق</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم واللقب لرئيس التعاضدية الولائية
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="الاسم الكامل للمسؤول الولائي"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الصفة / المنصب الرسمي
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`رئيس التعاضدية الولائية — ${editing.wilayaName}`}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الهاتف المباشر / المكتب
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={60}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550 00 00 00"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    البريد الإلكتروني المهني
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    maxLength={160}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`wilaya${editing.wilayaCode}@mutnatec.dz`}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم المقر الولائي
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الحساب المعتمد (CCP / RIB)
                  </label>
                  <input
                    type="text"
                    maxLength={180}
                    value={accountInfo}
                    onChange={(e) => setAccountInfo(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  العنوان التفصيلي للمقر
                </label>
                <input
                  type="text"
                  maxLength={220}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رابط خرائط قوقل
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    maxLength={500}
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رابط الصفحة الرسمية (اختياري)
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    maxLength={500}
                    value={socialUrl}
                    onChange={(e) => setSocialUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    تحديد موقع المقر على الخريطة التفاعلية
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono-tabular">
                    <input
                      type="text"
                      dir="ltr"
                      value={latStr}
                      onChange={(e) => setLatStr(e.target.value)}
                      placeholder="Lat"
                      className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={lngStr}
                      onChange={(e) => setLngStr(e.target.value)}
                      placeholder="Lng"
                      className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <WilayaInteractiveMap
                  entries={mapEntriesPreview}
                  pickerMode={true}
                  pickedLat={latStr ? Number(latStr) : undefined}
                  pickedLng={lngStr ? Number(lngStr) : undefined}
                  onPickCoords={(lat, lng, formattedAddr) => {
                    setLatStr(String(lat));
                    setLngStr(String(lng));
                    if (formattedAddr && !address.trim()) {
                      setAddress(formattedAddr);
                    }
                  }}
                  heightClassName="h-[250px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ بيانات الحساب والمقر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
