import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  ExternalLink,
  MapPin,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getSafeExternalUrl } from '../data/mutualCatalog';
import {
  clearAdminWilayaOffice,
  fetchWilayaOffices,
  importAdminWilayaOffices,
  saveAdminWilayaOffice,
} from '../lib/internalApi';
import type { PublicWilayaMapEntry, WilayaOffice } from '../types/mutual';
import { WilayaInteractiveMap } from './WilayaInteractiveMap';

interface WilayaOfficesAdminProps {
  adminToken: string;
}

function isOfficePopulated(office: WilayaOffice): boolean {
  return Boolean(
    office.officeName.trim() ||
      office.representativeName.trim() ||
      office.phone.trim() ||
      office.accountInfo.trim() ||
      office.address.trim() ||
      office.googleMapsUrl.trim()
  );
}

export function WilayaOfficesAdmin({ adminToken }: WilayaOfficesAdminProps) {
  const [offices, setOffices] = useState<WilayaOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'filled' | 'empty'>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  const [editingOffice, setEditingOffice] = useState<WilayaOffice | null>(null);
  const [wilayaName, setWilayaName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [phone, setPhone] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [address, setAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [secondaryMapsUrl, setSecondaryMapsUrl] = useState('');
  const [latStr, setLatStr] = useState('');
  const [lngStr, setLngStr] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOffices = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchWilayaOffices();
      setOffices(res.offices);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل قائمة المقرات الولائية.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  const filledCount = useMemo(
    () => offices.filter((o) => isOfficePopulated(o)).length,
    [offices]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offices.filter((o) => {
      const filled = isOfficePopulated(o);
      if (filterMode === 'filled' && !filled) return false;
      if (filterMode === 'empty' && filled) return false;
      if (!q) return true;
      return (
        o.code.toLowerCase().includes(q) ||
        o.wilayaName.toLowerCase().includes(q) ||
        o.officeName.toLowerCase().includes(q) ||
        o.representativeName.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        o.accountInfo.toLowerCase().includes(q)
      );
    });
  }, [offices, search, filterMode]);

  const openEditor = (office: WilayaOffice) => {
    setErrorMsg('');
    setNoticeMsg('');
    setEditingOffice(office);
    setWilayaName(office.wilayaName);
    setOfficeName(office.officeName);
    setRepresentativeName(office.representativeName);
    setPhone(office.phone);
    setAccountInfo(office.accountInfo);
    setSocialUrl(office.socialUrl);
    setAddress(office.address);
    setGoogleMapsUrl(office.googleMapsUrl);
    setSecondaryMapsUrl(office.secondaryMapsUrl || '');
    setLatStr(typeof office.lat === 'number' ? String(office.lat) : '');
    setLngStr(typeof office.lng === 'number' ? String(office.lng) : '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffice || !adminToken) return;
    setErrorMsg('');
    setSaving(true);
    try {
      const parsedLat = latStr.trim() ? Number(latStr.trim()) : undefined;
      const parsedLng = lngStr.trim() ? Number(lngStr.trim()) : undefined;
      const res = await saveAdminWilayaOffice(adminToken, editingOffice.code, {
        wilayaName: wilayaName.trim(),
        officeName: officeName.trim(),
        representativeName: representativeName.trim(),
        phone: phone.trim(),
        accountInfo: accountInfo.trim(),
        socialUrl: socialUrl.trim(),
        address: address.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        secondaryMapsUrl: secondaryMapsUrl.trim(),
        lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
        lng: Number.isFinite(parsedLng) ? parsedLng : undefined,
      });
      setOffices(res.offices);
      setNoticeMsg(`تم حفظ بيانات المقر الولائي (${editingOffice.code} - ${wilayaName.trim()}) بنجاح.`);
      setEditingOffice(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر حفظ بيانات المقر الولائي.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (office: WilayaOffice) => {
    if (!adminToken) return;
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const res = await clearAdminWilayaOffice(adminToken, office.code);
      setOffices(res.offices);
      setNoticeMsg(`تم مسح بيانات المقر الولائي رقم ${office.code}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر مسح البيانات.');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(offices, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mutnatec-wilaya-offices-96.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !adminToken) return;
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('يجب أن يحتوي الملف على مصفوفة JSON للمقرات الولائية.');
      }
      const res = await importAdminWilayaOffices(adminToken, parsed);
      setOffices(res.offices);
      setNoticeMsg(`تم استيراد وتحديث ${res.count} مقر ولائي من ملف JSON بنجاح.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر استيراد ملف المقرات الولائية.'
      );
    }
  };

  const previewMapsUrl = getSafeExternalUrl(googleMapsUrl);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              إدارة بيانات المقرات الولائية عبر الوطن (96 ولاية / فرع)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إدخال وتحديث الأسماء، الهواتف، الحسابات البنكية/البريدية والإلكترونية، وروابط المقرات على خرائط قوقل · المدخل حالياً:{' '}
              <strong className="font-mono-tabular text-slate-800">
                {filledCount} / 96
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>استيراد JSON</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportJson}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>تصدير JSON (96)</span>
            </button>
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
              placeholder="ابحث برمز الولاية (01-96) أو اسم الولاية أو اسم المسؤول أو الهاتف..."
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
              الكل ({offices.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('filled')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'filled'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المدخلة ({filledCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('empty')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'empty'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فارغة ({Math.max(0, offices.length - filledCount)})
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
            جاري تحميل جدول المقرات الولائية (01 – 96)...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            لا توجد ولايات مطابقة لعامل التصفية الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">الرمز</th>
                  <th className="py-3 px-4">الولاية / الفرع</th>
                  <th className="py-3 px-4">اسم المقر والمسؤول</th>
                  <th className="py-3 px-4">الهاتف</th>
                  <th className="py-3 px-4">الحسابات</th>
                  <th className="py-3 px-4">خرائط قوقل</th>
                  <th className="py-3 px-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((office) => {
                  const filled = isOfficePopulated(office);
                  const safeMaps = getSafeExternalUrl(office.googleMapsUrl);
                  return (
                    <tr key={office.code} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono-tabular text-xs font-semibold text-slate-800">
                        {office.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {office.wilayaName}
                      </td>
                      <td className="py-3 px-4">
                        {office.officeName || office.representativeName ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {office.officeName || '—'}
                            </div>
                            {office.representativeName && (
                              <div className="text-xs text-slate-500">
                                {office.representativeName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">غير مدخل</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700" dir="ltr">
                        {office.phone || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700 max-w-[180px] truncate">
                        {office.accountInfo || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {safeMaps ? (
                          <a
                            href={safeMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-800 hover:underline font-medium whitespace-nowrap"
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>عرض الموقع</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">غير مضاف</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditor(office)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            <Edit3 className="w-3 h-3" aria-hidden="true" />
                            <span>{filled ? 'تعديل' : 'إدخال'}</span>
                          </button>
                          {filled && (
                            <button
                              type="button"
                              onClick={() => handleClear(office)}
                              aria-label={`مسح بيانات المقر ${office.code}`}
                              className="p-1.5 text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingOffice && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                تحديث بيانات المقر الولائي ({editingOffice.code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingOffice(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    اسم الولاية / الفرع ({editingOffice.code})
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={wilayaName}
                    onChange={(e) => setWilayaName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    اسم المقر الولائي
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="مثلاً: المقر الولائي للتعاضدية — الجزائر"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    اسم المسؤول / الممثل الولائي
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="الاسم الكامل للمسؤول"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رقم الهاتف / الفاكس
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={60}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="021 00 00 00 / 0550 00 00 00"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  بيانات الحسابات (CCP / RIB / البريد الإلكتروني)
                </label>
                <input
                  type="text"
                  maxLength={180}
                  value={accountInfo}
                  onChange={(e) => setAccountInfo(e.target.value)}
                  placeholder="رقم الحساب البريدي أو البريد الإلكتروني الرسمي للمقر"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رابط الحساب الإلكتروني / صفحة التواصل (اختياري)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  maxLength={500}
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  العنوان التفصيلي للمقر
                </label>
                <input
                  type="text"
                  maxLength={220}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="الشارع، البلدية، الولاية..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    رابط المقر على خرائط قوقل (Google Maps)
                  </label>
                  {previewMapsUrl && (
                    <a
                      href={previewMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline"
                    >
                      <span>اختبار الرابط</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  dir="ltr"
                  maxLength={500}
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رابط مقر ثانٍ على خرائط قوقل (اختياري)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  maxLength={500}
                  value={secondaryMapsUrl}
                  onChange={(e) => setSecondaryMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    إحداثيات المقر على الخريطة التفاعلية
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={latStr}
                      onChange={(e) => setLatStr(e.target.value)}
                      placeholder="Lat"
                      className="w-24 px-2 py-1 text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={lngStr}
                      onChange={(e) => setLngStr(e.target.value)}
                      placeholder="Lng"
                      className="w-24 px-2 py-1 text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <WilayaInteractiveMap
                  entries={
                    [
                      {
                        code: editingOffice.code,
                        wilayaName,
                        officeName,
                        representativeName,
                        headTitle: editingOffice.headTitle || '',
                        headUsername: `head${editingOffice.code}`,
                        headStatus: 'نشط',
                        hasActiveAccount: false,
                        phone,
                        email: '',
                        accountInfo,
                        socialUrl,
                        address,
                        googleMapsUrl,
                        secondaryMapsUrl,
                        lat: latStr ? Number(latStr) : undefined,
                        lng: lngStr ? Number(lngStr) : undefined,
                        updatedAt: editingOffice.updatedAt,
                      },
                    ] as PublicWilayaMapEntry[]
                  }
                  pickerMode={true}
                  pickedLat={latStr ? Number(latStr) : undefined}
                  pickedLng={lngStr ? Number(lngStr) : undefined}
                  onPickCoords={(lat, lng, formattedAddr) => {
                    setLatStr(String(lat));
                    setLngStr(String(lng));
                    if (formattedAddr && !address.trim()) setAddress(formattedAddr);
                  }}
                  heightClassName="h-[220px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOffice(null)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ بيانات المقر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
