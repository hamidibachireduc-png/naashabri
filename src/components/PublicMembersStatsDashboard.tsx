import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  Clock,
  MapPin,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchPublicMemberStats } from '../lib/internalApi';
import type { PublicMemberStats } from '../types/mutual';

const GENDER_COLORS = ['#1e3a8a', '#047857'];
const SENIORITY_COLORS = ['#0284c7', '#1e3a8a', '#047857', '#b45309'];

export function PublicMembersStatsDashboard() {
  const [stats, setStats] = useState<PublicMemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchPublicMemberStats();
      setStats(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل الإحصائيات العامة للمنخرطين.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <section
      id="stats"
      aria-labelledby="public-stats-heading"
      className="bg-slate-50 border-b border-slate-200 py-12"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 shrink-0">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">
                الشفافية الرقمية ومؤشرات العضوية — المعطيات الإجمالية دون بيانات شخصية
              </p>
              <h2
                id="public-stats-heading"
                className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5"
              >
                لوحة إحصائيات المنخرطين
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-60 cursor-pointer self-start whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{loading ? 'جاري التحديث...' : 'تحديث المؤشرات'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {errorMsg}
          </div>
        )}

        {loading && !stats ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
            جاري تحميل اللوحة الإحصائية للمنخرطين...
          </div>
        ) : stats ? (
          <>
            {/* 4 KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>إجمالي المنخرطين</span>
                  <Users className="w-4 h-4 text-blue-800" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {stats.totalMembers}
                </p>
                <p className="text-xs text-emerald-700 font-medium font-mono-tabular">
                  {stats.activeMembers} منخرط نشط
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>متوسط الأقدمية المهنية</span>
                  <Clock className="w-4 h-4 text-amber-700" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {stats.averageSeniorityYears} <span className="text-sm font-normal">سنة</span>
                </p>
                <p className="text-xs text-slate-500">معدل سنوات الخبرة في القطاع</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>البلديات المغطاة</span>
                  <MapPin className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {stats.municipalitiesCount}
                </p>
                <p className="text-xs text-slate-500">بلدية مسجل بها منخرطون</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>المؤسسات المنضوية</span>
                  <Building2 className="w-4 h-4 text-blue-800" aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold font-mono-tabular text-slate-900">
                  {stats.institutionsCount}
                </p>
                <p className="text-xs text-slate-500">مؤسسة تربوية وثقافية وإدارية</p>
              </div>
            </div>

            {/* 2x2 Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Gender Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      توزيع المنخرطين حسب الجنس
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      نسبة الذكور والإناث من مجموع المنخرطين المسجلين
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono-tabular">
                    {stats.byGender.map((g, i) => (
                      <span key={g.name} className="font-semibold text-slate-700">
                        {g.name}:{' '}
                        <strong style={{ color: GENDER_COLORS[i % GENDER_COLORS.length] }}>
                          {g.count}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byGender.filter((g) => g.count > 0)}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={4}
                      >
                        {stats.byGender
                          .filter((g) => g.count > 0)
                          .map((entry, idx) => (
                            <Cell
                              key={entry.name}
                              fill={GENDER_COLORS[idx % GENDER_COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0) || 0} منخرط`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Seniority Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    توزيع المنخرطين حسب الأقدمية المهنية
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تصنيف المنخرطين حسب شرائح سنوات الخدمة الفعلية
                  </p>
                </div>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.bySeniority}
                      margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0) || 0} منخرط`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="عدد المنخرطين" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {stats.bySeniority.map((entry, idx) => (
                          <Cell
                            key={entry.name}
                            fill={SENIORITY_COLORS[idx % SENIORITY_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Municipality Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    توزيع المنخرطين حسب البلدية
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    أكثر البلديات تمثيلاً في سجل المنخرطين (أعلى {stats.byMunicipality.length} بلدية)
                  </p>
                </div>
                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={stats.byMunicipality}
                      margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={118}
                        tick={{ fontSize: 11, fill: '#1e293b' }}
                      />
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0) || 0} منخرط`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="المنخرطون"
                        fill="#047857"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 4. Institutions Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    توزيع المنخرطين حسب المؤسسات
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    المؤسسات التربوية والثقافية المنضوية في التعاضدية (أعلى {stats.byInstitution.length} مؤسسة)
                  </p>
                </div>
                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={stats.byInstitution}
                      margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={156}
                        tick={{ fontSize: 11, fill: '#1e293b' }}
                      />
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0) || 0} منخرط`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="المنخرطون"
                        fill="#1e3a8a"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
