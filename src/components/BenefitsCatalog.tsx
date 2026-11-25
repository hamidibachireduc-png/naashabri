import { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  CalendarCheck,
  Dumbbell,
  Eye,
  FilePlus2,
  FolderCheck,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Maximize2,
  Pill,
  ScanLine,
  Scissors,
  ShieldCheck,
  Umbrella,
  X,
} from 'lucide-react';
import {
  BASE_FILE_DOCUMENTS,
  BENEFIT_CATEGORIES,
  BENEFITS_2026_SECTIONS,
} from '../data/mutualCatalog';
import type {
  BenefitCategoryFilter,
  BenefitGuideSection,
  CareType,
} from '../types/mutual';
import { BrandImage } from './BrandImage';

interface BenefitsCatalogProps {
  onApplyForBenefit?: (careType: CareType) => void;
}

function renderBenefitIcon(iconKey: BenefitGuideSection['iconKey']) {
  const cls = 'w-5 h-5 text-blue-800 shrink-0';
  switch (iconKey) {
    case 'book':
      return <BookOpen className={cls} aria-hidden="true" />;
    case 'calendar':
      return <CalendarCheck className={cls} aria-hidden="true" />;
    case 'folder':
      return <FolderCheck className={cls} aria-hidden="true" />;
    case 'pill':
      return <Pill className={cls} aria-hidden="true" />;
    case 'scissors':
      return <Scissors className={cls} aria-hidden="true" />;
    case 'scan':
      return <ScanLine className={cls} aria-hidden="true" />;
    case 'eye':
      return <Eye className={cls} aria-hidden="true" />;
    case 'activity':
      return <Activity className={cls} aria-hidden="true" />;
    case 'dumbbell':
      return <Dumbbell className={cls} aria-hidden="true" />;
    case 'heart':
      return <HeartHandshake className={cls} aria-hidden="true" />;
    case 'award':
      return <Award className={cls} aria-hidden="true" />;
    case 'umbrella':
      return <Umbrella className={cls} aria-hidden="true" />;
    case 'shield':
      return <ShieldCheck className={cls} aria-hidden="true" />;
    case 'handHeart':
      return <HeartPulse className={cls} aria-hidden="true" />;
    case 'graduation':
      return <GraduationCap className={cls} aria-hidden="true" />;
  }
}

export function BenefitsCatalog({ onApplyForBenefit }: BenefitsCatalogProps) {
  const [category, setCategory] = useState<BenefitCategoryFilter>('الكل');
  const [zoomSection, setZoomSection] = useState<BenefitGuideSection | null>(null);

  const filteredSections = useMemo(() => {
    if (category === 'الكل') return BENEFITS_2026_SECTIONS;
    return BENEFITS_2026_SECTIONS.filter((s) => s.category === category);
  }, [category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            دليل المزايا والأداءات — طبعة 2026 الشاملة
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC) · جميع النسب والمبالغ والوثائق المعتمدة
          </p>
        </div>
      </div>

      {/* Base File Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <FolderCheck className="w-5 h-5 text-blue-800 shrink-0" aria-hidden="true" />
          <h3 className="text-sm font-bold text-slate-900">
            صيغة الملف القاعدي الموحد (مطلوب في جميع الطلبات)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs text-slate-700">
          {BASE_FILE_DOCUMENTS.map((docLabel, index) => (
            <div
              key={docLabel}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"
            >
              <span className="font-mono-tabular font-bold text-blue-800 ml-1">
                0{index + 1}.
              </span>
              <span>{docLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-1 overflow-x-auto">
        {BENEFIT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              category === cat
                ? 'bg-blue-800 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Benefits Cards with Official Infographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSections.map((section) => (
          <article
            key={section.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="relative bg-slate-100 border-b border-slate-200 aspect-video overflow-hidden group">
              <BrandImage
                src={section.imagePath}
                alt={section.title}
                fallbackLabel={section.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setZoomSection(section)}
                aria-label={`تكبير بطاقة ${section.title}`}
                className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900/85 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>معاينة اللوحة كاملة</span>
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    {renderBenefitIcon(section.iconKey)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      {section.category} · {section.validityNote}
                    </p>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {section.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">{section.subtitle}</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="text-slate-500 mt-0.5 leading-relaxed">
                          {item.detail}
                        </p>
                      </div>
                      <span className="font-mono-tabular font-bold text-blue-800 whitespace-nowrap shrink-0">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500 flex-1 min-w-[180px]">
                  {section.extraDocsNote}
                </p>
                {onApplyForBenefit && section.associatedCareType && (
                  <button
                    type="button"
                    onClick={() => onApplyForBenefit(section.associatedCareType!)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>إيداع ملف لهذا الأداء</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Full-size Infographic Lightbox */}
      {zoomSection && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={zoomSection.title}
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {zoomSection.title}
                </h3>
                <p className="text-xs text-slate-500">{zoomSection.validityNote}</p>
              </div>
              <button
                type="button"
                onClick={() => setZoomSection(null)}
                aria-label="إغلاق"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-100 p-3 flex items-center justify-center">
              <BrandImage
                src={zoomSection.imagePath}
                alt={zoomSection.title}
                fallbackLabel={zoomSection.title}
                className="w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
