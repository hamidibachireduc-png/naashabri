import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CreditCard,
  FileCheck2,
  Lock,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { EMBLEM_IMAGE_PATH, HERO_IMAGE_PATH } from '../data/mutualCatalog';
import { BenefitsCatalog } from './BenefitsCatalog';
import { BrandImage } from './BrandImage';
import { ContactSection } from './ContactSection';
import { IndividualEnrollmentSection } from './IndividualEnrollmentSection';
import type { LoginModalMode } from './InternalLoginModal';
import { ProvidersDirectory } from './ProvidersDirectory';
import { PublicMembersStatsDashboard } from './PublicMembersStatsDashboard';
import { SimulatorAndGuide } from './SimulatorAndGuide';
import { WilayaOfficesDirectory } from './WilayaOfficesDirectory';

interface PublicPortalProps {
  onOpenLogin: (initialMode?: LoginModalMode, targetSection?: 'overview' | 'card') => void;
  signingIn: boolean;
  authError: string;
}

export function PublicPortal({ onOpenLogin, signingIn, authError }: PublicPortalProps) {
  const [activeTab, setActiveTab] = useState<'benefits' | 'simulator' | 'wilayas' | 'providers'>('benefits');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            التعاضدية الوطنية (MUTNATEC)
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#stats"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              إحصائيات المنخرطين
            </a>
            <a
              href="#services"
              onClick={() => setActiveTab('benefits')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              دليل المزايا 2026
            </a>
            <a
              href="#services"
              onClick={() => setActiveTab('wilayas')}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              المقرات الولائية
            </a>
            <a
              href="#enrollment"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              الانخراط الإلكتروني
            </a>
            <a
              href="#contact"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              اتصل بنا
            </a>
          </nav>

          <button
            type="button"
            onClick={() => onOpenLogin('internal')}
            disabled={signingIn}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
          >
            {signingIn ? 'جاري الدخول...' : 'دخول فضاء المنخرط'}
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section id="overview" className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14 space-y-10">
            {authError && (
              <div className="p-3.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {authError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-3">
                  <BrandImage
                    src={EMBLEM_IMAGE_PATH}
                    alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
                    fallbackLabel="MUTNATEC"
                    className="w-12 h-12 rounded-full object-contain bg-white border border-slate-200 shrink-0"
                  />
                  <span className="text-xs font-medium text-slate-500">
                    التعاضدية الوطنية لعمال التربية والثقافة · الجزائر
                  </span>
                </div>

                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  البوابة الرقمية للتعاضدية الوطنية لعمال التربية والثقافة
                </h1>

                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  تصفح دليل المزايا والأداءات الشامل 2026، أودع ملفات المرض والمنح
                  العائلية، تتبع التحويلات عبر الحساب البريدي (CCP)، وسجّل الدخول عبر
                  الملف الداخلي للمنخرطين أو حسابك الموثق.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenLogin('internal')}
                    disabled={signingIn}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <span>{signingIn ? 'جاري الاتصال...' : 'الولوج إلى فضاء المنخرط'}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <a
                    href="#services"
                    onClick={() => setActiveTab('benefits')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4 text-blue-800" />
                    <span>دليل المزايا 2026</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onOpenLogin('internal', 'card')}
                    disabled={signingIn}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>استخراج بطاقة الانخراط الرقمية</span>
                  </button>
                  <a
                    href="#enrollment"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>الانخراط الفردي الإلكتروني</span>
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-64 sm:h-80 lg:h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <BrandImage
                    src={HERO_IMAGE_PATH}
                    alt="المقر المؤسسي للتعاضدية الوطنية بالجزائر"
                    fallbackLabel="MUTNATEC"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Summary Strip below Hero Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <FileCheck2 className="w-5 h-5 text-blue-800" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900">دليل الأداءات 2026</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  كل النسب والمبالغ المقطوعة للأدوية، الجراحة، الأشعة، والمنح العائلية والتقاعد.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <ShieldCheck className="w-5 h-5 text-blue-800" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900">حماية اجتماعية شاملة</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  منح الأرامل والأيتام والتمدرس، مساعدة مصاريف الجنازة، وإعانات الأمراض المستعصية.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <Building2 className="w-5 h-5 text-blue-800" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900">أقسام ولائية ومصحات متعاقدة</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  فروع ولائية عبر الجزائر ومصحات متعاقدة بنظام التكفل المسبق داخل الوطن.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <CreditCard className="w-5 h-5 text-blue-800" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900">استخراج البطاقة الرقمية</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  إصدار وتحميل بطاقة الانخراط الرقمية وشهادة الانخراط برمز تحقق إلكتروني بعد تسجيل الدخول.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Section Public Statistical Dashboard */}
        <PublicMembersStatsDashboard />

        {/* Interactive Public Tools Section */}
        <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">الخدمات والأدلة المفتوحة للمنخرطين</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                الدليل الكامل لأداءات 2026، حاسبة التعويضات، ودليل الأقسام الولائية بالجزائر
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('benefits')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'benefits'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                دليل المزايا 2026
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'simulator'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حاسبة التعويضات والتغطية
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wilayas')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'wilayas'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المقرات الولائية (96)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('providers')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'providers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المصحات المتعاقدة
              </button>
            </div>
          </div>

          {activeTab === 'benefits' && <BenefitsCatalog />}
          {activeTab === 'simulator' && <SimulatorAndGuide />}
          {activeTab === 'wilayas' && <WilayaOfficesDirectory />}
          {activeTab === 'providers' && <ProvidersDirectory />}
        </section>

        <IndividualEnrollmentSection />

        <ContactSection />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC) — الجزائر</span>
          <div className="flex items-center gap-4">
            <span>جميع المعطيات محفوظة وفق معايير السرية الطبية</span>
            <button
              type="button"
              onClick={() => onOpenLogin('admin')}
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-800 font-medium cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>بوابة الإدارة</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
