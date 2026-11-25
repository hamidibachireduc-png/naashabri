import { useMemo } from 'react';
import { CheckCircle2, Clock, FileBarChart2, XCircle } from 'lucide-react';
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
import { formatCurrency } from '../data/mutualCatalog';
import type { MedicalClaim } from '../types/mutual';

interface AdminClaimsStatusChartProps {
  claims: MedicalClaim[];
}

interface StatusBucket {
  key: 'pending' | 'accepted' | 'rejected';
  name: string;
  count: number;
  totalAmount: number;
  approvedAmount: number;
  color: string;
}

export function AdminClaimsStatusChart({ claims }: AdminClaimsStatusChartProps) {
  const summary = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let acceptedCount = 0;
    let acceptedClaimed = 0;
    let acceptedApproved = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    for (const c of claims) {
      if (c.status === 'تمت الموافقة' || c.status === 'تم الصرف') {
        acceptedCount += 1;
        acceptedClaimed += c.totalAmount || 0;
        acceptedApproved += c.approvedAmount || 0;
      } else if (c.status === 'مرفوض') {
        rejectedCount += 1;
        rejectedAmount += c.totalAmount || 0;
      } else {
        // 'قيد الدراسة' | 'وثائق ناقصة'
        pendingCount += 1;
        pendingAmount += c.totalAmount || 0;
      }
    }

    const buckets: StatusBucket[] = [
      {
        key: 'pending',
        name: 'في الانتظار',
        count: pendingCount,
        totalAmount: pendingAmount,
        approvedAmount: 0,
        color: '#d97706',
      },
      {
        key: 'accepted',
        name: 'مقبولة',
        count: acceptedCount,
        totalAmount: acceptedClaimed,
        approvedAmount: acceptedApproved,
        color: '#047857',
      },
      {
        key: 'rejected',
        name: 'مرفوضة',
        count: rejectedCount,
        totalAmount: rejectedAmount,
        approvedAmount: 0,
        color: '#dc2626',
      },
    ];

    const nonZero = buckets.filter((b) => b.count > 0);
    return {
      total: claims.length,
      buckets,
      pieData: nonZero,
    };
  }, [claims]);

  const pct = (count: number) => {
    if (summary.total === 0) return '0%';
    return `${Math.round((count / summary.total) * 100)}%`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="w-5 h-5 text-blue-800" aria-hidden="true" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              التوزيع البياني للملفات الطبية حسب الحالة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تصنيف الملفات المودعة إلى: في الانتظار (قيد الدراسة/وثائق ناقصة)، مقبولة (موافق عليها/مصروفة)، ومرفوضة
            </p>
          </div>
        </div>
        <span className="text-xs font-mono-tabular font-semibold text-slate-600">
          إجمالي الملفات: {summary.total}
        </span>
      </div>

      {/* 3 Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>في الانتظار</span>
            <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono-tabular text-slate-900">
              {summary.buckets[0].count}
            </span>
            <span className="text-xs font-mono-tabular font-semibold text-amber-700">
              {pct(summary.buckets[0].count)}
            </span>
          </div>
          <p className="text-[11px] font-mono-tabular text-slate-600">
            بقيمة مصرحة: {formatCurrency(summary.buckets[0].totalAmount)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>مقبولة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono-tabular text-slate-900">
              {summary.buckets[1].count}
            </span>
            <span className="text-xs font-mono-tabular font-semibold text-emerald-700">
              {pct(summary.buckets[1].count)}
            </span>
          </div>
          <p className="text-[11px] font-mono-tabular text-slate-600">
            معتمدة: {formatCurrency(summary.buckets[1].approvedAmount)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-red-800">
            <span>مرفوضة</span>
            <XCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono-tabular text-slate-900">
              {summary.buckets[2].count}
            </span>
            <span className="text-xs font-mono-tabular font-semibold text-red-700">
              {pct(summary.buckets[2].count)}
            </span>
          </div>
          <p className="text-[11px] font-mono-tabular text-slate-600">
            بقيمة مصرحة: {formatCurrency(summary.buckets[2].totalAmount)}
          </p>
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          لا توجد ملفات طبية مسجلة بعد لرسم المنحنيات البيانية.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
          {/* Donut Chart */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-800">
              نسبة توزيع الملفات الطبية حسب الوضعية
            </h4>
            <div className="h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {summary.pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value ?? 0) || 0} ملف`}
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

          {/* Bar Chart */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-800">
              مقارنة عدد الملفات الطبية في كل حالة
            </h4>
            <div className="h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.buckets}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    formatter={(value) => `${Number(value ?? 0) || 0} ملف`}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="عدد الملفات" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {summary.buckets.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
