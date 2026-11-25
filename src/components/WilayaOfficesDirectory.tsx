import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Globe,
  Images,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import {
  getSafeExternalUrl,
  PAYMENT_CENTERS_GALLERY,
} from '../data/mutualCatalog';
import { fetchWilayaOffices } from '../lib/internalApi';
import type { WilayaOffice } from '../types/mutual';
import { BrandImage } from './BrandImage';

function isOfficeConfigured(office: WilayaOffice): boolean {
  return Boolean(
    office.officeName.trim() ||
      office.representativeName.trim() ||
      office.phone.trim() ||
      office.accountInfo.trim() ||
      office.address.trim() ||
      office.googleMapsUrl.trim()
  );
}

export function WilayaOfficesDirectory() {
  const [offices, setOffices] = useState<WilayaOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'configured'>('all');
  const [showGallery, setShowGallery] = useState(false);

  const loadOffices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWilayaOffices();
      setOffices(res.offices);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذر تحميل بيانات المقرات الولائية.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  const configuredCount = useMemo(
    () => offices.filter((o) => isOfficeConfigured(o)).length,
    [offices]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offices.filter((office) => {
      if (viewMode === 'configured' && !isOfficeConfigured(office)) {
        return false;
      }
      if (!q) return true;
      return (
        office.code.toLowerCase().includes(q) ||
        office.wilayaName.toLowerCase().includes(q) ||
        office.officeName.toLowerCase().includes(q) ||
        office.representativeName.toLowerCase().includes(q) ||
        office.phone.toLowerCase().includes(q) ||
        office.accountInfo.toLowerCase().includes(q) ||
        office.address.toLowerCase().includes(q)
      );
    });
  }, [offices, search, viewMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            دليل المقرات الولائية عبر الوطن (96 ولاية / فرع ولائي)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            أسماء المقرات والممثلين، أرقام الهواتف، الحسابات المعتمدة، والمواقع الجغرافية على خرائط قوقل
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>
            إجمالي المقرات:{' '}
            <strong className="font-mono-tabular text-slate-900">96</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            البيانات المدخلة:{' '}
            <strong className="font-mono-tabular text-emerald-700">
              {configuredCount} / 96
            </strong>
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
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
              placeholder="ابحث برمز الولاية (مثلاً 16)، اسم الولاية، اسم المقر، المسؤول أو رقم الهاتف..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كافة الولايات (96)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('configured')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'configured'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المقرات المكتملة ({configuredCount})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowGallery((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Images className="w-3.5 h-3.5 text-blue-800" aria-hidden="true" />
              <span>{showGallery ? 'إخفاء الدليل المصور' : 'عرض الدليل المصور لمراكز الدفع'}</span>
            </button>
          </div>
        </div>
      </div>

      {showGallery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PAYMENT_CENTERS_GALLERY.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
            >
              <BrandImage
                src={item.imagePath}
                alt={item.title}
                fallbackLabel={item.title}
                className="w-full h-72 object-contain bg-slate-50"
              />
              <div className="px-4 py-3 border-t border-slate-100 text-xs font-semibold text-slate-800">
                {item.title}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          جاري تحميل بيانات المقرات الولائية عبر الوطن...
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadOffices}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {viewMode === 'configured' && configuredCount === 0
              ? 'لم يقم مدير الموقع بإدخال بيانات المقرات الولائية بعد.'
              : 'لا توجد مقرات ولائية مطابقة لعبارة البحث الحالية.'}
          </p>
          {viewMode === 'configured' && configuredCount === 0 && (
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className="text-xs font-semibold text-blue-800 hover:underline cursor-pointer"
            >
              عرض قائمة الـ 96 ولاية
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((office) => {
            const configured = isOfficeConfigured(office);
            const safeMapsUrl = getSafeExternalUrl(office.googleMapsUrl);
            const safeSecondaryMapsUrl = getSafeExternalUrl(office.secondaryMapsUrl || '');
            const safeSocialUrl = getSafeExternalUrl(office.socialUrl);

            return (
              <div
                key={office.code}
                className={`border rounded-xl p-5 flex flex-col justify-between gap-4 ${
                  configured
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-xs text-slate-500 font-mono-tabular">
                        الولاية / الفرع رقم {office.code}
                      </p>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {office.wilayaName}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                        configured ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {configured ? 'بيانات مفعلة' : 'قيد التحديث'}
                    </span>
                  </div>

                  {configured ? (
                    <div className="space-y-2 text-xs text-slate-700">
                      {office.officeName && (
                        <div className="flex items-start gap-2">
                          <Building2
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-slate-900">
                            {office.officeName}
                          </span>
                        </div>
                      )}

                      {office.representativeName && (
                        <div className="flex items-start gap-2">
                          <User
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>المسؤول: {office.representativeName}</span>
                        </div>
                      )}

                      {office.phone && (
                        <div className="flex items-center gap-2">
                          <Phone
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                          <a
                            href={`tel:${office.phone.replace(/[^\d+]/g, '')}`}
                            className="font-mono-tabular text-blue-800 hover:underline"
                            dir="ltr"
                          >
                            {office.phone}
                          </a>
                        </div>
                      )}

                      {office.accountInfo && (
                        <div className="flex items-start gap-2">
                          <Wallet
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="font-mono-tabular break-all">
                            {office.accountInfo}
                          </span>
                        </div>
                      )}

                      {office.address && (
                        <div className="flex items-start gap-2">
                          <MapPin
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{office.address}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed py-2">
                      لم تُدرج بيانات هذا المقر بعد؛ يمكن لمدير الموقع إضافتها وتحديثها من
                      لوحة التحكم.
                    </p>
                  )}
                </div>

                {(safeMapsUrl || safeSecondaryMapsUrl || safeSocialUrl) && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {safeMapsUrl && (
                      <a
                        href={safeMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>خرائط قوقل</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                    )}
                    {safeSecondaryMapsUrl && (
                      <a
                        href={safeSecondaryMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>خرائط قوقل (المقر 2)</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                    )}
                    {safeSocialUrl && (
                      <a
                        href={safeSocialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>الحساب الرسمي</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
