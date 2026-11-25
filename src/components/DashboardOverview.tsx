import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calculator,
  ClipboardCheck,
  CreditCard,
  FileBadge,
  Plus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EMBLEM_IMAGE_PATH, formatCurrency } from '../data/mutualCatalog';
import type {
  AuthSessionMode,
  AuthorizationRequest,
  Dependent,
  MedicalClaim,
  MemberProfile,
} from '../types/mutual';
import { BrandImage } from './BrandImage';
import { ClaimsStatusPieChart } from './ClaimsStatusPieChart';
import { StatusLabel } from './StatusLabel';

export type WorkspaceSection =
  | 'overview'
  | 'benefits'
  | 'claims'
  | 'dependents'
  | 'authorizations'
  | 'simulator'
  | 'providers'
  | 'wilayas'
  | 'card'
  | 'contact'
  | 'profile'
  | 'admin';

interface DashboardOverviewProps {
  member: MemberProfile;
  dependents: Dependent[];
  claims: MedicalClaim[];
  authorizations: AuthorizationRequest[];
  sessionMode: AuthSessionMode;
  onNavigate: (section: WorkspaceSection) => void;
  onNewClaim: () => void;
  onOpenCard: (mode: 'card' | 'attestation') => void;
}

const ARABIC_MONTHS = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

interface MonthlyChartRow {
  monthLabel: string;
  monthIndex: number;
  claimedAmount: number;
  reimbursedAmount: number;
  claimsCount: number;
}

interface CareTypeChartRow {
  categoryLabel: string;
  fullName: string;
  claimedAmount: number;
  reimbursedAmount: number;
  claimsCount: number;
}

function shortenCareType(careType: string): string {
  if (careType.length <= 18) return careType;
  return `${careType.slice(0, 16)}…`;
}

export function DashboardOverview({
  member,
  dependents,
  claims,
  authorizations,
  sessionMode,
  onNavigate,
  onNewClaim,
  onOpenCard,
}: DashboardOverviewProps) {
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add('2026');
    for (const c of claims) {
      if (c.careDate && c.careDate.length >= 4) {
        years.add(c.careDate.slice(0, 4));
      }
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [claims]);

  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [chartMode, setChartMode] = useState<'monthly' | 'byCare'>('monthly');

  const activeYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0];

  const totalReimbursed = claims
    .filter((c) => c.status === 'تم الصرف' || c.status === 'تمت الموافقة')
    .reduce(
      (sum, c) =>
        sum + (c.approvedAmount > 0 ? c.approvedAmount : c.estimatedReimbursement),
      0
    );

  const pendingClaimsCount = claims.filter(
    (c) => c.status === 'قيد الدراسة' || c.status === 'وثائق ناقصة'
  ).length;

  const remainingCeiling = Math.max(0, member.annualCeiling - totalReimbursed);
  const activeDependentsCount = dependents.filter((d) => d.active).length;
  const recentClaims = claims.slice(0, 5);

  const monthlyData = useMemo<MonthlyChartRow[]>(() => {
    const buckets: MonthlyChartRow[] = ARABIC_MONTHS.map((label, idx) => ({
      monthLabel: label,
      monthIndex: idx + 1,
      claimedAmount: 0,
      reimbursedAmount: 0,
      claimsCount: 0,
    }));

    for (const c of claims) {
      if (!c.careDate || !c.careDate.startsWith(activeYear)) continue;
      const monthNum = Number(c.careDate.slice(5, 7));
      if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) continue;
      const bucket = buckets[monthNum - 1];
      bucket.claimsCount += 1;
      bucket.claimedAmount += Number(c.totalAmount) || 0;
      const reimb =
        c.status === 'مرفوض'
          ? 0
          : c.approvedAmount > 0
          ? c.approvedAmount
          : c.estimatedReimbursement;
      bucket.reimbursedAmount += Number(reimb) || 0;
    }

    return buckets;
  }, [claims, activeYear]);

  const careTypeData = useMemo<CareTypeChartRow[]>(() => {
    const map = new Map<string, CareTypeChartRow>();
    for (const c of claims) {
      if (!c.careDate || !c.careDate.startsWith(activeYear)) continue;
      const current = map.get(c.careType) || {
        categoryLabel: shortenCareType(c.careType),
        fullName: c.careType,
        claimedAmount: 0,
        reimbursedAmount: 0,
        claimsCount: 0,
      };
      current.claimsCount += 1;
      current.claimedAmount += Number(c.totalAmount) || 0;
      const reimb =
        c.status === 'مرفوض'
          ? 0
          : c.approvedAmount > 0
          ? c.approvedAmount
          : c.estimatedReimbursement;
      current.reimbursedAmount += Number(reimb) || 0;
      map.set(c.careType, current);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.reimbursedAmount - a.reimbursedAmount
    );
  }, [claims, activeYear]);

  const yearClaimsSummary = useMemo(() => {
    return monthlyData.reduce(
      (acc, row) => ({
        count: acc.count + row.claimsCount,
        claimed: acc.claimed + row.claimedAmount,
        reimbursed: acc.reimbursed + row.reimbursedAmount,
      }),
      { count: 0, claimed: 0, reimbursed: 0 }
    );
  }, [monthlyData]);

  return (
    <div className="space-y-6">
      {/* Top 2-Column Overview: Member Card Summary + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandImage
                src={EMBLEM_IMAGE_PATH}
                alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
                fallbackLabel="MUTNATEC"
                className="w-12 h-12 rounded-full object-contain bg-white p-0.5 shrink-0"
              />
              <div>
                <p className="text-xs text-slate-400">
                  التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC) ·{' '}
                  {sessionMode === 'internal' ? 'دخول بالملف الداخلي' : 'حساب سحابي موثق'}
                </p>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {member.fullName}
                </h2>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400">رقم الانخراط</p>
              <p className="font-mono-tabular text-sm font-semibold text-sky-300 mt-0.5">
                {member.membershipNumber}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-5 text-sm">
            <div>
              <p className="text-xs text-slate-400">صيغة التغطية</p>
              <p className="font-medium text-slate-100 mt-0.5">{member.coveragePlan}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">القطاع / الهيئة</p>
              <p className="font-medium text-slate-100 mt-0.5 truncate">{member.sector}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">رقم الضمان / التعريف</p>
              <p className="font-mono-tabular font-medium text-slate-100 mt-0.5">
                {member.nationalId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => onOpenCard('card')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4" />
              <span>استخراج البطاقة الرقمية</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCard('attestation')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileBadge className="w-4 h-4" />
              <span>شهادة الانخراط</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">الخدمات الإلكترونية السريعة</h3>
            <p className="text-xs text-slate-500 mt-1">
              وصول مباشر إلى أبرز الإجراءات والأداءات التعاضدية لعام 2026
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
            <button
              type="button"
              onClick={onNewClaim}
              className="w-full py-2.5 flex items-center justify-between text-sm font-medium text-slate-800 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-blue-800" />
                <span>إيداع ملف مرض أو منحة جديدة</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('benefits')}
              className="w-full py-2.5 flex items-center justify-between text-sm font-medium text-slate-800 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-800" />
                <span>دليل المزايا والأداءات 2026</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('authorizations')}
              className="w-full py-2.5 flex items-center justify-between text-sm font-medium text-slate-800 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <ClipboardCheck className="w-4 h-4 text-blue-800" />
                <span>طلب تكفل مسبق (PEC)</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dependents')}
              className="w-full py-2.5 flex items-center justify-between text-sm font-medium text-slate-800 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-800" />
                <span>إدارة ذوي الحقوق ({activeDependentsCount})</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('simulator')}
              className="w-full py-2.5 flex items-center justify-between text-sm font-medium text-slate-800 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <Calculator className="w-4 h-4 text-blue-800" />
                <span>احتساب مبلغ التعويض</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">التعويضات المعتمدة والمصروفة</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalReimbursed)}
          </p>
          <p className="text-xs text-slate-500 mt-1">السنة المالية {activeYear}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">السقف السنوي المتبقي</p>
          <p className="font-mono-tabular text-2xl font-bold text-blue-800 mt-2">
            {formatCurrency(remainingCeiling)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono-tabular">
            من أصل {formatCurrency(member.annualCeiling)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">ملفات قيد المعالجة</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-2">
            {pendingClaimsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            من إجمالي {claims.length} ملف مودع
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">ذوو الحقوق وطلبات التكفل</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-2">
            {activeDependentsCount} / {authorizations.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">مستفيدون نشطون · طلبات PEC</p>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-800" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                الإحصائيات البيانية لملفات المرض والتعويضات
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
                السنة {activeYear} · {yearClaimsSummary.count} ملفات · إجمالي المصاريف:{' '}
                {formatCurrency(yearClaimsSummary.claimed)} · التعويضات:{' '}
                {formatCurrency(yearClaimsSummary.reimbursed)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChartMode('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  chartMode === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                التوزيع عبر الأشهر
              </button>
              <button
                type="button"
                onClick={() => setChartMode('byCare')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  chartMode === 'byCare'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حسب نوع الأداء
              </button>
            </div>

            {availableYears.length > 0 && (
              <select
                value={activeYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="اختيار السنة"
                className="px-3 py-1.5 text-xs font-mono-tabular font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {yearClaimsSummary.count === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              لا توجد ملفات مرض مسجلة لسنة{' '}
              <span className="font-mono-tabular font-semibold">{activeYear}</span> لعرض الرسم البياني.
            </p>
            <button
              type="button"
              onClick={onNewClaim}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إيداع ملف لعرض الإحصائيات</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
              <div className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" />
                <span>المبلغ المصرح به في الفواتير (د.ج)</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-blue-800 inline-block" />
                <span>التعويض التعاضدي المعتمد / التقديري (د.ج)</span>
              </div>
            </div>

            <div className="w-full h-72 min-w-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'monthly' ? (
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 10, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const row = payload[0].payload as MonthlyChartRow;
                        const rate =
                          row.claimedAmount > 0
                            ? Math.round((row.reimbursedAmount / row.claimedAmount) * 100)
                            : 0;
                        return (
                          <div
                            dir="rtl"
                            className="bg-slate-900 text-white rounded-lg px-3.5 py-2.5 text-xs shadow-md border border-slate-800 space-y-1"
                          >
                            <p className="font-bold text-sky-300">
                              {row.monthLabel} {activeYear} ·{' '}
                              <span className="font-mono-tabular">{row.claimsCount}</span> ملف
                            </p>
                            <p className="font-mono-tabular">
                              المصرح به: {formatCurrency(row.claimedAmount)}
                            </p>
                            <p className="font-mono-tabular text-emerald-300">
                              التعويض: {formatCurrency(row.reimbursedAmount)} ({rate}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="claimedAmount"
                      name="المبلغ المصرح به"
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="reimbursedAmount"
                      name="التعويض التعاضدي"
                      fill="#1e40af"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                ) : (
                  <BarChart
                    data={careTypeData}
                    margin={{ top: 10, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="categoryLabel"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const row = payload[0].payload as CareTypeChartRow;
                        return (
                          <div
                            dir="rtl"
                            className="bg-slate-900 text-white rounded-lg px-3.5 py-2.5 text-xs shadow-md border border-slate-800 space-y-1 max-w-xs"
                          >
                            <p className="font-bold text-sky-300">{row.fullName}</p>
                            <p className="font-mono-tabular">
                              عدد الملفات: {row.claimsCount}
                            </p>
                            <p className="font-mono-tabular">
                              المصرح به: {formatCurrency(row.claimedAmount)}
                            </p>
                            <p className="font-mono-tabular text-emerald-300">
                              التعويض: {formatCurrency(row.reimbursedAmount)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="claimedAmount"
                      name="المبلغ المصرح به"
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="reimbursedAmount"
                      name="التعويض التعاضدي"
                      fill="#1e40af"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
        </div>

        <div className="lg:col-span-5">
          <ClaimsStatusPieChart claims={claims} />
        </div>
      </div>

      {/* Recent Claims Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">أحدث الملفات والمنح المودعة</h3>
          <button
            type="button"
            onClick={() => onNavigate('claims')}
            className="text-xs font-semibold text-blue-800 hover:text-blue-900 cursor-pointer"
          >
            عرض كافة الملفات
          </button>
        </div>

        {recentClaims.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-500">
              لم تقم بإيداع أي ملف بعد. ابدأ بإيداع ملفك الأول أو تصفح دليل المزايا 2026.
            </p>
            <button
              type="button"
              onClick={onNewClaim}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إيداع ملف جديد</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">المرجع</th>
                  <th className="py-3 px-4">المستفيد</th>
                  <th className="py-3 px-4">نوع الأداء</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-left">المبلغ المصرح به</th>
                  <th className="py-3 px-4">الوضعية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-slate-800">
                      {c.referenceCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {c.beneficiaryName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{c.careType}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600">
                      {c.careDate}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-left text-slate-900">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
