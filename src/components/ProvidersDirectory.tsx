import { useMemo, useState } from 'react';
import { Building2, MapPin, Phone, Search, CheckCircle2 } from 'lucide-react';
import { CITIES_LIST, PROVIDERS_DIRECTORY } from '../data/mutualCatalog';
import type { ProviderItem } from '../types/mutual';

const CATEGORIES: Array<'الكل' | ProviderItem['category']> = [
  'الكل',
  'مصحة متعاقدة',
  'وكالة التعاضدية',
  'مركز طب الأسنان',
  'مختبر التحاليل والأشعة',
  'بصريات معتمدة',
];

export function ProvidersDirectory() {
  const [cityFilter, setCityFilter] = useState<string>('الكل');
  const [categoryFilter, setCategoryFilter] = useState<'الكل' | ProviderItem['category']>('الكل');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return PROVIDERS_DIRECTORY.filter((p) => {
      const matchesCity = cityFilter === 'الكل' || p.city === cityFilter;
      const matchesCat = categoryFilter === 'الكل' || p.category === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.conventionCode.toLowerCase().includes(q);
      return matchesCity && matchesCat && matchesQuery;
    });
  }, [cityFilter, categoryFilter, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          دليل المصحات المتعاقدة والأقسام الولائية (MUTNATEC)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          الأقسام الولائية للتعاضدية، المصحات المتعاقدة، مراكز طب الأسنان، والمختبرات عبر ولايات الجزائر
        </p>
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
              placeholder="ابحث باسم المصحة، القسم الولائي، الحي أو رمز الاتفاقية..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:bg-white"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            aria-label="تصفية حسب الولاية"
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
          >
            <option value="الكل">كل الولايات</option>
            {CITIES_LIST.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          لا توجد مؤسسات مطابقة لخيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      {item.category} · <span className="font-mono-tabular">{item.conventionCode}</span>
                    </p>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{item.name}</h3>
                  </div>
                  {item.thirdPartyPay && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>الثالث المؤدي</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>
                      {item.city} — {item.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="font-mono-tabular" dir="ltr">
                      {item.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>
                      {item.thirdPartyPay
                        ? 'يقبل بطاقة التعاضدية الوطنية مباشرة (التكفل المسبق متاح)'
                        : 'استرجاع المصاريف عبر إيداع ملف المرض'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
