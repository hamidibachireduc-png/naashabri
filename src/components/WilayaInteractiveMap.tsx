import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Search } from 'lucide-react';
import { getSafeExternalUrl } from '../data/mutualCatalog';
import type { PublicWilayaMapEntry } from '../types/mutual';

const ALGERIA_CENTER: [number, number] = [28.0339, 1.6596];

interface WilayaInteractiveMapProps {
  entries: PublicWilayaMapEntry[];
  selectedCode?: string | null;
  onSelectCode?: (code: string | null) => void;
  pickerMode?: boolean;
  pickedLat?: number;
  pickedLng?: number;
  onPickCoords?: (lat: number, lng: number, formattedAddress?: string) => void;
  heightClassName?: string;
}

function createPinIcon(color: string, borderColor: string, size = 28): L.DivIcon {
  const height = Math.round(size * 1.32);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 28 37" fill="none">
      <path d="M14 1.5C7.1 1.5 1.5 7.1 1.5 14C1.5 23.4 14 35.5 14 35.5C14 35.5 26.5 23.4 26.5 14C26.5 7.1 20.9 1.5 14 1.5Z" fill="${color}" stroke="${borderColor}" stroke-width="2.2"/>
      <circle cx="14" cy="13.5" r="4.8" fill="#ffffff"/>
    </svg>
  `.trim();

  return L.divIcon({
    html: svg,
    className: 'bg-transparent border-0',
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height + 4],
  });
}

function buildPopupElement(entry: PublicWilayaMapEntry): HTMLElement {
  const root = document.createElement('div');
  root.dir = 'rtl';
  root.className = 'p-1 text-right space-y-2 min-w-[220px] max-w-[280px] font-sans';

  const header = document.createElement('div');
  header.className = 'border-b border-slate-200 pb-2';

  const codeEl = document.createElement('p');
  codeEl.className = 'text-[11px] font-mono text-slate-500 m-0';
  codeEl.textContent = `الولاية / الفرع رقم ${entry.code}`;
  header.appendChild(codeEl);

  const titleEl = document.createElement('h4');
  titleEl.className = 'text-sm font-bold text-slate-900 mt-0.5 mb-0';
  titleEl.textContent = entry.wilayaName;
  header.appendChild(titleEl);

  if (entry.officeName) {
    const officeEl = document.createElement('p');
    officeEl.className = 'text-xs text-slate-600 mt-0.5 mb-0';
    officeEl.textContent = entry.officeName;
    header.appendChild(officeEl);
  }
  root.appendChild(header);

  const body = document.createElement('div');
  body.className = 'space-y-1 text-xs text-slate-700';

  const headBox = document.createElement('div');
  const headName = document.createElement('div');
  headName.className = 'font-semibold text-slate-900';
  headName.textContent = entry.representativeName || 'رئيس التعاضدية الولائية';
  headBox.appendChild(headName);

  const headSub = document.createElement('div');
  headSub.className = 'text-[11px] text-slate-500';
  headSub.textContent = `${entry.headTitle} · حساب: ${entry.headUsername} (${
    entry.hasActiveAccount ? 'حساب مفعل' : 'بانتظار التفعيل'
  })`;
  headBox.appendChild(headSub);
  body.appendChild(headBox);

  if (entry.phone) {
    const phoneRow = document.createElement('div');
    const phoneLink = document.createElement('a');
    phoneLink.href = `tel:${entry.phone.replace(/[^\d+]/g, '')}`;
    phoneLink.dir = 'ltr';
    phoneLink.className = 'font-mono text-blue-800 hover:underline';
    phoneLink.textContent = `هاتف: ${entry.phone}`;
    phoneRow.appendChild(phoneLink);
    body.appendChild(phoneRow);
  }

  if (entry.email) {
    const emailRow = document.createElement('div');
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${entry.email}`;
    emailLink.dir = 'ltr';
    emailLink.className = 'font-mono text-blue-800 hover:underline break-all';
    emailLink.textContent = entry.email;
    emailRow.appendChild(emailLink);
    body.appendChild(emailRow);
  }

  if (entry.accountInfo) {
    const accRow = document.createElement('div');
    accRow.className = 'font-mono text-[11px] text-slate-600 break-all';
    accRow.textContent = `الحساب: ${entry.accountInfo}`;
    body.appendChild(accRow);
  }

  if (entry.address) {
    const addrRow = document.createElement('div');
    addrRow.className = 'text-[11px] text-slate-600';
    addrRow.textContent = entry.address;
    body.appendChild(addrRow);
  }

  root.appendChild(body);

  const safeMapsUrl = getSafeExternalUrl(entry.googleMapsUrl);
  const safeSocialUrl = getSafeExternalUrl(entry.socialUrl);

  if (safeMapsUrl || safeSocialUrl) {
    const actions = document.createElement('div');
    actions.className = 'pt-2 border-t border-slate-100 flex flex-wrap gap-2';

    if (safeMapsUrl) {
      const mapsAnchor = document.createElement('a');
      mapsAnchor.href = safeMapsUrl;
      mapsAnchor.target = '_blank';
      mapsAnchor.rel = 'noopener noreferrer';
      mapsAnchor.className =
        'inline-flex items-center px-2.5 py-1 text-[11px] font-medium bg-blue-800 text-white rounded-md hover:bg-blue-900 no-underline';
      mapsAnchor.textContent = 'فتح رابط الاتجاهات';
      actions.appendChild(mapsAnchor);
    }

    if (safeSocialUrl) {
      const socialAnchor = document.createElement('a');
      socialAnchor.href = safeSocialUrl;
      socialAnchor.target = '_blank';
      socialAnchor.rel = 'noopener noreferrer';
      socialAnchor.className =
        'inline-flex items-center px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-800 rounded-md hover:bg-slate-200 no-underline';
      socialAnchor.textContent = 'الصفحة الرسمية';
      actions.appendChild(socialAnchor);
    }

    root.appendChild(actions);
  }

  return root;
}

export function WilayaInteractiveMap({
  entries,
  selectedCode = null,
  onSelectCode,
  pickerMode = false,
  pickedLat,
  pickedLng,
  onPickCoords,
  heightClassName = 'h-[480px] lg:h-[540px]',
}: WilayaInteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByCodeRef = useRef<Record<string, L.Marker>>({});
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  const onSelectCodeRef = useRef(onSelectCode);
  const onPickCoordsRef = useRef(onPickCoords);
  onSelectCodeRef.current = onSelectCode;
  onPickCoordsRef.current = onPickCoords;

  const [queryText, setQueryText] = useState('');
  const [searching, setSearching] = useState(false);
  const [placeError, setPlaceError] = useState('');

  const mappedEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          typeof e.lat === 'number' &&
          typeof e.lng === 'number' &&
          Number.isFinite(e.lat) &&
          Number.isFinite(e.lng)
      ),
    [entries]
  );

  // Initialize Leaflet map instance (100% open-source, zero API keys required)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const hasPicked =
      pickerMode && typeof pickedLat === 'number' && typeof pickedLng === 'number';
    const initialCenter: [number, number] = hasPicked
      ? [pickedLat, pickedLng]
      : ALGERIA_CENTER;
    const initialZoom = hasPicked ? 13 : 5;

    const map = L.map(el, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layerGroup;

    map.on('click', (ev: L.LeafletMouseEvent) => {
      if (!pickerMode || !onPickCoordsRef.current) return;
      const lat = Math.round(ev.latlng.lat * 1000000) / 1000000;
      const lng = Math.round(ev.latlng.lng * 1000000) / 1000000;
      onPickCoordsRef.current(lat, lng);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(el);

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markerByCodeRef.current = {};
      pickerMarkerRef.current = null;
    };
  }, [pickerMode]);

  // Render directory markers in view mode
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerByCodeRef.current = {};

    if (pickerMode) return;

    for (const entry of mappedEntries) {
      if (typeof entry.lat !== 'number' || typeof entry.lng !== 'number') continue;
      const isSelected = selectedCode === entry.code;
      const hasHeadNamed = Boolean(entry.representativeName.trim());
      const pinBg = isSelected
        ? '#0f172a'
        : entry.hasActiveAccount
        ? '#047857'
        : hasHeadNamed
        ? '#1d4ed8'
        : '#2563eb';
      const pinBorder = isSelected ? '#f59e0b' : '#ffffff';

      const marker = L.marker([entry.lat, entry.lng], {
        icon: createPinIcon(pinBg, pinBorder, isSelected ? 32 : 26),
        title: `${entry.code} — ${entry.wilayaName}`,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindPopup(() => buildPopupElement(entry), { maxWidth: 300 });
      marker.on('click', () => {
        onSelectCodeRef.current?.(entry.code);
      });
      marker.on('popupclose', () => {
        if (selectedCode === entry.code) {
          onSelectCodeRef.current?.(null);
        }
      });

      marker.addTo(layer);
      markerByCodeRef.current[entry.code] = marker;
    }
  }, [mappedEntries, pickerMode, selectedCode]);

  // Focus selected marker and open its popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pickerMode || !selectedCode) return;
    const entry = mappedEntries.find((e) => e.code === selectedCode);
    if (!entry || typeof entry.lat !== 'number' || typeof entry.lng !== 'number') return;

    const nextZoom = Math.max(map.getZoom(), 10);
    map.flyTo([entry.lat, entry.lng], nextZoom, { duration: 0.45 });

    const marker = markerByCodeRef.current[entry.code];
    if (marker && !marker.isPopupOpen()) {
      marker.openPopup();
    }
  }, [selectedCode, mappedEntries, pickerMode]);

  // Sync picker marker & pan in picker mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickerMode) return;

    if (typeof pickedLat === 'number' && typeof pickedLng === 'number') {
      if (!pickerMarkerRef.current) {
        pickerMarkerRef.current = L.marker([pickedLat, pickedLng], {
          icon: createPinIcon('#047857', '#ffffff', 30),
        }).addTo(map);
      } else {
        pickerMarkerRef.current.setLatLng([pickedLat, pickedLng]);
      }
      const nextZoom = Math.max(map.getZoom(), 12);
      map.flyTo([pickedLat, pickedLng], nextZoom, { duration: 0.35 });
    } else if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }
  }, [pickerMode, pickedLat, pickedLng]);

  const handleSearchPlace = async () => {
    const clean = queryText.trim();
    if (!clean) return;
    setSearching(true);
    setPlaceError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=dz&accept-language=ar&q=${encodeURIComponent(
        clean
      )}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      const items = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;
      const first = items[0];
      if (!first) {
        setPlaceError('لم يتم العثور على موقع مطابق. يمكنك النقر مباشرة على الخريطة لتحديد الإحداثيات.');
        return;
      }
      const lat = Math.round(Number(first.lat) * 1000000) / 1000000;
      const lng = Math.round(Number(first.lon) * 1000000) / 1000000;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setPlaceError('إحداثيات النتيجة غير صالحة.');
        return;
      }
      mapRef.current?.flyTo([lat, lng], 14, { duration: 0.45 });
      onPickCoords?.(lat, lng, first.display_name || clean);
    } catch {
      setPlaceError('تعذر البحث عن العنوان حالياً. يمكنك النقر مباشرة على الخريطة لتثبيت الموقع.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {pickerMode && onPickCoords && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSearchPlace();
                  }
                }}
                placeholder="ابحث عن المدينة أو عنوان المقر في الجزائر (مثال: وسط مدينة بجاية)..."
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearchPlace()}
              disabled={searching || !queryText.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {searching ? 'جاري البحث...' : 'تحديد'}
            </button>
          </div>
          {placeError && <p className="text-[11px] text-amber-700">{placeError}</p>}
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-blue-800 shrink-0" />
            <span>
              خريطة مفتوحة دون أي مفاتيح API — انقر على أي نقطة لتثبيت إحداثيات مقر التعاضدية الولائية بدقة.
            </span>
          </p>
        </div>
      )}

      <div
        className={`w-full ${heightClassName} rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative z-0`}
      >
        <div ref={containerRef} className="w-full h-full" />
        {!pickerMode && mappedEntries.length === 0 && (
          <div className="absolute inset-0 bg-slate-50/90 flex flex-col items-center justify-center p-6 text-center gap-2 z-[400]">
            <MapPin className="w-7 h-7 text-slate-400" aria-hidden="true" />
            <p className="text-xs text-slate-600">لا توجد إحداثيات مسجلة بعد لعرضها على الخريطة.</p>
          </div>
        )}
      </div>
    </div>
  );
}
