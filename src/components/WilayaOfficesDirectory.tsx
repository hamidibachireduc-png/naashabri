import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Globe,
  Images,
  LayoutGrid,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  Wallet,
} from 'lucide-react';
import {
  getSafeExternalUrl,
  PAYMENT_CENTERS_GALLERY,
} from '../data/mutualCatalog';
import { fetchPublicWilayaHeadsMap } from '../lib/internalApi';
import type { PublicWilayaMapEntry } from '../types/mutual';
import { BrandImage } from './BrandImage';
import { WilayaInteractiveMap } from './WilayaInteractiveMap';

function isEntryConfigured(entry: PublicWilayaMapEntry): boolean {
  return Boolean(
    entry.officeName.trim() ||
      entry.representativeName.trim() ||
      entry.phone.trim() ||
      entry.accountInfo.trim() ||
      entry.address.trim() ||
      entry.googleMapsUrl.trim() ||
      entry.hasActiveAccount
  );
}

export function WilayaOfficesDirectory() {
  const [entries, setEntries] = useState<PublicWilayaMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [displayTab, setDisplayTab] = useState<'map' | 'cards'>('map');
  const [viewMode, setViewMode] = useState<'all' | 'configured'>('all');
  const [selectedCode, setSelectedCode] = useState<string | null>('16');
  const [showGallery, setShowGallery] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPublicWilayaHeadsMap();
      setEntries(res.entries);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذر تحميل بيانات الرؤساء والمقرات الولائية.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const configuredCount = useMemo(
    () => entries.filter((o) => isEntryConfigured(o)).length,
    [entries]
  );

  const mappedCount = useMemo(
    () =>
      entries.filter(
        (e) => typeof e.lat === 'number' && typeof e.lng === 'number'
      ).length,
    [entries]
  );

  const activeAccountsCount = useMemo(
    () => entries.filter((e) => e.hasActiveAccount).length,
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (viewMode === 'configured' && !isEntryConfigured(entry)) {
        return false;
      }
      if (!q) return true;
      return (
        entry.code.toLowerCase().includes(q) ||
        entry.wilayaName.toLowerCase().includes(q) ||
        entry.officeName.toLowerCase().includes(q) ||
        entry.representativeName.toLowerCase().includes(q) ||
        entry.headTitle.toLowerCase().includes(q) ||
        entry.headUsername.toLowerCase().includes(q) ||
        entry.phone.toLowerCase().includes(q) ||
        entry.accountInfo.toLowerCase().includes(q) ||
        entry.address.toLowerCase().includes(q)
      );
    });
  }, [entries, search, viewMode]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.code === selectedCode) || null,
    [entries, selectedCode]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            خريطة ودليل رؤساء التعاضديات والمقرات الولائية (96 ولاية / فرع)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            خريطة تفاعلية تعرض بيانات كل رئيس تعاضدية ولائية، المقر، الهاتف، الحساب البريدي، والموقع الجغرافي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span>
            المقرات المحددة على الخريطة:{' '}
            <strong className="font-mono-tabular text-blue-800">
              {mappedCount} / 96
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            الحسابات المفعلة:{' '}
            <strong className="font-mono-tabular text-emerald-700">
              {activeAccountsCount} / 96
            </strong>
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برمز الولاية (مثلاً 16)، اسم الولاية، اسم الرئيس، اسم المقر أو الهاتف..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setDisplayTab('map')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  displayTab === 'map'
                    ? 'bg-white text-blue-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>الخريطة التفاعلية</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayTab('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  displayTab === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>بطاقات المقرات ({filtered.length})</span>
              </button>
            </div>

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
                الكل (96)
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
                المكتملة ({configuredCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGallery((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Images className="w-3.5 h-3.5 text-blue-800" aria-hidden="true" />
              <span>{showGallery ? 'إخفاء الدليل المصور' : 'الدليل المصور'}</span>
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
          جاري تحميل خريطة وبيانات رؤساء التعاضديات الولائية...
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadEntries}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : displayTab === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Interactive Leaflet OpenStreetMap */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <WilayaInteractiveMap
                entries={filtered}
                selectedCode={selectedCode}
                onSelectCode={(code) => setSelectedCode(code)}
                heightClassName="h-[460px] lg:h-[540px]"
              />
            </div>

            {selectedEntry && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-xs font-mono-tabular text-slate-500">
                      الولاية / الفرع رقم {selectedEntry.code} · حساب الرئيس:{' '}
                      <span className="text-slate-700 font-semibold">
                        {selectedEntry.headUsername}
                      </span>
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {selectedEntry.wilayaName}
                      {selectedEntry.officeName ? ` — ${selectedEntry.officeName}` : ''}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      selectedEntry.hasActiveAccount
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {selectedEntry.hasActiveAccount
                      ? 'حساب رئيس ولائي مفعل'
                      : 'بانتظار تفعيل الحساب'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">
                        {selectedEntry.representativeName || 'لم يُعيّن الاسم بعد'}
                      </p>
                      <p className="text-slate-500">{selectedEntry.headTitle}</p>
                    </div>
                  </div>
                  {selectedEntry.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${selectedEntry.phone.replace(/[^\d+]/g, '')}`}
                        dir="ltr"
                        className="font-mono-tabular text-blue-800 hover:underline font-medium"
                      >
                        {selectedEntry.phone}
                      </a>
                    </div>
                  )}
                  {selectedEntry.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <a
                        href={`mailto:${selectedEntry.email}`}
                        dir="ltr"
                        className="font-mono-tabular text-blue-800 hover:underline"
                      >
                        {selectedEntry.email}
                      </a>
                    </div>
                  )}
                  {selectedEntry.accountInfo && (
                    <div className="flex items-start gap-2">
                      <Wallet className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-mono-tabular">{selectedEntry.accountInfo}</span>
                    </div>
                  )}
                  {selectedEntry.address && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedEntry.address}</span>
                    </div>
                  )}
                </div>

                {(getSafeExternalUrl(selectedEntry.googleMapsUrl) ||
                  getSafeExternalUrl(selectedEntry.socialUrl)) && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    {getSafeExternalUrl(selectedEntry.googleMapsUrl) && (
                      <a
                        href={getSafeExternalUrl(selectedEntry.googleMapsUrl) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>فتح الاتجاهات في خرائط قوقل</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {getSafeExternalUrl(selectedEntry.socialUrl) && (
                      <a
                        href={getSafeExternalUrl(selectedEntry.socialUrl) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>الحساب الرسمي</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Wilaya & Heads Side List */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col max-h-[680px]">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                قائمة الرؤساء والمقرات ({filtered.length})
              </span>
              <span className="text-[11px] text-slate-500">انقر لعرض المقر على الخريطة</span>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  لا توجد ولايات مطابقة للبحث.
                </div>
              ) : (
                filtered.map((entry) => {
                  const isSel = selectedCode === entry.code;
                  const hasCoords =
                    typeof entry.lat === 'number' && typeof entry.lng === 'number';
                  return (
                    <button
                      key={entry.code}
                      type="button"
                      onClick={() => setSelectedCode(entry.code)}
                      className={`w-full text-right px-4 py-3 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                        isSel ? 'bg-blue-50/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs font-bold text-blue-800">
                            {entry.code}
                          </span>
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {entry.wilayaName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {entry.representativeName || entry.officeName || 'مركز ولائي'}
                        </p>
                        {entry.phone && (
                          <p
                            className="text-[11px] font-mono-tabular text-slate-500 mt-0.5"
                            dir="ltr"
                          >
                            {entry.phone}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-left">
                        <span
                          className={`text-[11px] font-semibold ${
                            hasCoords ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {hasCoords ? 'على الخريطة' : 'بدون إحداثيات'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">
            لا توجد مقرات ولائية مطابقة لعبارة البحث الحالية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => {
            const configured = isEntryConfigured(entry);
            const safeMapsUrl = getSafeExternalUrl(entry.googleMapsUrl);
            const safeSecondaryMapsUrl = getSafeExternalUrl(entry.secondaryMapsUrl || '');
            const safeSocialUrl = getSafeExternalUrl(entry.socialUrl);

            return (
              <div
                key={entry.code}
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
                        الولاية / الفرع رقم {entry.code}
                      </p>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {entry.wilayaName}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                        entry.hasActiveAccount
                          ? 'text-emerald-700'
                          : configured
                          ? 'text-blue-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.hasActiveAccount
                        ? 'حساب رئيس مفعل'
                        : configured
                        ? 'بيانات مفعلة'
                        : 'قيد التحديث'}
                    </span>
                  </div>

                  {configured ? (
                    <div className="space-y-2 text-xs text-slate-700">
                      {entry.officeName && (
                        <div className="flex items-start gap-2">
                          <Building2
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-slate-900">
                            {entry.officeName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <UserCheck
                          className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          الرئيس: {entry.representativeName || 'رئيس التعاضدية الولائية'}{' '}
                          <span className="font-mono-tabular text-slate-500">
                            ({entry.headUsername})
                          </span>
                        </span>
                      </div>

                      {entry.phone && (
                        <div className="flex items-center gap-2">
                          <Phone
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            aria-hidden="true"
                          />
                          <a
                            href={`tel:${entry.phone.replace(/[^\d+]/g, '')}`}
                            className="font-mono-tabular text-blue-800 hover:underline"
                            dir="ltr"
                          >
                            {entry.phone}
                          </a>
                        </div>
                      )}

                      {entry.accountInfo && (
                        <div className="flex items-start gap-2">
                          <Wallet
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="font-mono-tabular break-all">
                            {entry.accountInfo}
                          </span>
                        </div>
                      )}

                      {entry.address && (
                        <div className="flex items-start gap-2">
                          <MapPin
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{entry.address}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed py-2">
                      لم تُدرج بيانات هذا المقر بعد؛ يمكن للمدير أو رئيس التعاضدية الولائية إضافتها من فضائه.
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  {typeof entry.lat === 'number' && typeof entry.lng === 'number' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCode(entry.code);
                        setDisplayTab('map');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
                    >
                      <MapIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>عرض على الخريطة</span>
                    </button>
                  )}
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
                      <span>المقر 2</span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
