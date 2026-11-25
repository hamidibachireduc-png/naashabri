import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2 } from 'lucide-react';
import {
  CARE_TYPES,
  COVERAGE_PLANS,
  COVERAGE_RULES,
  estimateReimbursement,
  formatCurrency,
} from '../data/mutualCatalog';
import type { CareType, CoveragePlan } from '../types/mutual';

interface SimulatorAndGuideProps {
  defaultPlan?: CoveragePlan;
}

export function SimulatorAndGuide({
  defaultPlan = 'التغطية التكميلية+',
}: SimulatorAndGuideProps) {
  const [careType, setCareType] = useState<CareType>('العطل المرضية');
  const [plan, setPlan] = useState<CoveragePlan>(defaultPlan);
  const [amountInput, setAmountInput] = useState('10000');

  const amount = Number(amountInput);
  const result = useMemo(
    () => estimateReimbursement(careType, amount, plan),
    [careType, amount, plan]
  );

  const selectedRule = useMemo(
    () => COVERAGE_RULES.find((r) => r.careType === careType) || COVERAGE_RULES[0],
    [careType]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          حاسبة التعويضات وجدول الأداءات 2026 (MUTNATEC)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          احتسب مبلغ التعويض المستحق من التعاضدية الوطنية لعمال التربية والثقافة وفق طبعة 2026 الشاملة
        </p>
      </div>

      {/* Interactive Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Calculator className="w-5 h-5 text-blue-800" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900">محاكي التعويض والمنح (2026)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                نوع الأداء أو المنحة
              </label>
              <select
                value={careType}
                onChange={(e) => setCareType(e.target.value as CareType)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {CARE_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                صيغة الانخراط
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as CoveragePlan)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                {COVERAGE_PLANS.map((pl) => (
                  <option key={pl} value={pl}>
                    {pl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              المبلغ الإجمالي للفاتورة أو التكلفة بالدينار الجزائري (د.ج)
            </label>
            <input
              type="number"
              min="0"
              max="5000000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-3 py-2.5 text-base font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              الوثائق المطلوبة لملف {selectedRule.careType}:
            </p>
            <ul className="space-y-1.5">
              {selectedRule.requiredDocs.map((docItem) => (
                <li
                  key={docItem}
                  className="flex items-center gap-2 text-xs text-slate-600"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-800 shrink-0" aria-hidden="true" />
                  <span>{docItem}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs text-slate-400">مبلغ التعويض التقديري من التعاضدية</p>
            <p className="font-mono-tabular text-3xl font-bold text-sky-300">
              {formatCurrency(result.totalReimbursement)}
            </p>
            <p className="text-xs text-slate-300">
              {selectedRule.mode === 'fixed' ? (
                <>
                  صيغة الأداء: مبلغ مقطوع · السقف المرجعي:{' '}
                  <span className="font-mono-tabular font-semibold">
                    {formatCurrency(selectedRule.fixedAmount || 0)}
                  </span>
                </>
              ) : (
                <>
                  نسبة التعويض المعتمدة:{' '}
                  <span className="font-mono-tabular font-semibold">{result.effectiveRate}%</span>
                  {result.appliedCap && (
                    <>
                      {' '}
                      · السقف السنوي:{' '}
                      <span className="font-mono-tabular">{formatCurrency(result.appliedCap)}</span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">حصة التعاضدية الوطنية (MUTNATEC)</span>
              <span className="font-mono-tabular font-semibold text-sky-300">
                {formatCurrency(result.mutualShare)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">طريقة الاحتساب</span>
              <span className="font-mono-tabular font-semibold text-white">
                {selectedRule.mode === 'fixed'
                  ? 'مبلغ مقطوع'
                  : `${selectedRule.mutualRate}% من الفاتورة`}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <span className="text-slate-300">المبلغ المتبقي بعد التعويض</span>
              <span className="font-mono-tabular font-semibold text-amber-300">
                {formatCurrency(result.outOfPocket)}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 border-t border-slate-800 pt-4">
            أجل الصلاحية المعتمد: {selectedRule.validityPeriod} · داخل الوطن فقط
          </p>
        </div>
      </div>

      {/* Coverage Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            جدول الأداءات والنسب والمبالغ المقطوعة — طبعة 2026
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">نوع الأداء أو المنحة</th>
                <th className="py-3 px-4 text-left">نسبة / مبلغ التعاضدية</th>
                <th className="py-3 px-4 text-left">السقف السنوي / الأقصى</th>
                <th className="py-3 px-4">أجل الصلاحية والتكرار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {COVERAGE_RULES.map((r) => (
                <tr key={r.careType} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-semibold text-slate-900">{r.careType}</td>
                  <td className="py-3 px-4 font-mono-tabular text-blue-800 font-semibold text-left whitespace-nowrap">
                    {r.mode === 'fixed'
                      ? `${formatCurrency(r.fixedAmount || 0)} (مقطوع)`
                      : `${r.mutualRate}%`}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-700 text-left whitespace-nowrap">
                    {r.annualCap ? formatCurrency(r.annualCap) : 'بدون سقف سنوي'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{r.validityPeriod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
