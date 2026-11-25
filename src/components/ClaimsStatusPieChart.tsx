import { useMemo } from 'react';
import { CheckCircle2, Clock, PieChart as PieChartIcon, XCircle } from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '../data/mutualCatalog';
import type { MedicalClaim } from '../types/mutual';

interface ClaimsStatusPieChartProps {
  claims: MedicalClaim[];
  title?: string;
  subtitle?: string;
}

interface StatusSlice {
  key: 'pending' | 'accepted' | 'rejected';
  name: string;
  count: number;
  amount: number;
  color: string;
  badgeClass: string;
}

export function ClaimsStatusPieChart({
  claims,
  title = 'توزيع ملفات المرض حسب حالة المعالجة',
  subtitle = 'تصنيف الملفات المودعة إلى: قيد الدراسة، مقبول، مرفوض',
}: ClaimsStatusPieChartProps) {
  const summary = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let acceptedCount = 0;
    let acceptedAmount = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    for (const c of claims) {
      if (c.status === 'تمت الموافقة' || c.status === 'تم الصرف') {
        acceptedCount += 1;
        acceptedAmount +=
          c.approvedAmount > 0 ? c.approvedAmount : c.estimatedReimbursement || 0;
      } else if (c.status === 'مرفوض') {
        rejectedCount += 1;
        rejectedAmount += c.totalAmount || 0;
      } else {
        // 'قيد الدراسة' | 'وثائق ناقصة'
        pendingCount += 1;
        pendingAmount += c.totalAmount || 0;
      }
    }

    const buckets: StatusSlice[] = [
      {
        key: 'pending',
        name: 'قيد الدراسة',
        count: pendingCount,
        amount: pendingAmount,
        color: '#d97706',
        badgeClass: 'border-amber-200 bg-amber-50/70 text-amber-800',
      },
      {
        key: 'accepted',
        name: 'مقبول',
        count: acceptedCount,
        amount: acceptedAmount,
        color: '#047857',
        badgeClass: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
      },
      {
        key: 'rejected',
        name: 'مرفوض',
        count: rejectedCount,
        amount: rejectedAmount,
        color: '#dc2626',
        badgeClass: 'border-red-200 bg-red-50/70 text-red-800',
      },
    ];

    return {
      total: claims.length,
      buckets,
      pieData: buckets.filter((b) => b.count > 0),
    };
  }, [claims]);

  const pct = (count: number) => {
    if (summary.total === 0) return '0%';
    return `${Math.round((count / summary.total) * 100)}%`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4 h-full">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 shrink-0">
            <PieChartIcon className="w-5 h-5 text-blue-800" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-mono-tabular font-semibold text-slate-600 whitespace-nowrap">
          الإجمالي: {summary.total}
        </span>
      </div>

      {/* 3 Status Summary Counters */}
      <div className="grid grid-cols-3 gap-2.5">
        {summary.buckets.map((bucket) => {
          const Icon =
            bucket.key === 'accepted'
              ? CheckCircle2
              : bucket.key === 'rejected'
              ? XCircle
              : Clock;
          return (
            <div
              key={bucket.key}
              className={`p-3 rounded-lg border space-y-1 ${bucket.badgeClass}`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
                <span className="truncate">{bucket.name}</span>
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-lg font-bold font-mono-tabular text-slate-900">
                  {bucket.count}
                </span>
                <span className="text-[11px] font-mono-tabular font-semibold">
                  {pct(bucket.count)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {summary.total === 0 ? (
        <div className="flex-1 min-h-[210px] flex items-center justify-center p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          لا توجد ملفات مرض مسجلة بعد لعرض المخطط البياني.
        </div>
      ) : (
        <div className="h-60 w-full min-w-0" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={summary.pieData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={3}
              >
                {summary.pieData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload as StatusSlice;
                  return (
                    <div
                      dir="rtl"
                      className="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-md border border-slate-800 space-y-1"
                    >
                      <p className="font-bold text-sky-300">{item.name}</p>
                      <p className="font-mono-tabular">
                        العدد: {item.count} ملف ({pct(item.count)})
                      </p>
                      <p className="font-mono-tabular text-slate-300">
                        {item.key === 'accepted' ? 'التعويض المعتمد: ' : 'القيمة المصرحة: '}
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
