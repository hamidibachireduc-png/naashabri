import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit3,
  FileUp,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '../data/mutualCatalog';
import type { ClaimStatus, MedicalClaim } from '../types/mutual';
import { StatusLabel } from './StatusLabel';

type StepVisualState = 'completed' | 'active' | 'warning' | 'rejected' | 'upcoming' | 'cancelled';

interface TimelineStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  badgeText: string;
  dateText: string;
  description: string;
  noteBox?: {
    tone: 'amber' | 'red' | 'emerald' | 'slate';
    label: string;
    text: string;
  };
  state: StepVisualState;
  icon: typeof FileUp;
  showEditButton?: boolean;
}

interface ClaimProcessingTimelineProps {
  claim: MedicalClaim;
  memberRib?: string;
  onEditIncomplete?: (claim: MedicalClaim) => void;
  compact?: boolean;
}

function formatClaimTimestamp(value: unknown, fallback?: string): string {
  if (!value) return fallback || '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return fallback || '';
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTs = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      const d = maybeTs.toDate();
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    if (typeof maybeTs.seconds === 'number') {
      const d = new Date(maybeTs.seconds * 1000);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
  }
  return fallback || '';
}

function getProgressMeta(status: ClaimStatus): {
  completedCount: number;
  percent: number;
  barClass: string;
  summaryText: string;
} {
  switch (status) {
    case 'قيد الدراسة':
      return {
        completedCount: 1,
        percent: 38,
        barClass: 'bg-blue-700',
        summaryText: 'المرحلة 2 من 4 · قيد المراجعة الطبية والإدارية',
      };
    case 'وثائق ناقصة':
      return {
        completedCount: 1,
        percent: 45,
        barClass: 'bg-amber-500',
        summaryText: 'متوقف مؤقتاً في المرحلة 2 · يتطلب استكمال الوثائق',
      };
    case 'تمت الموافقة':
      return {
        completedCount: 3,
        percent: 78,
        barClass: 'bg-blue-700',
        summaryText: 'المرحلة 4 من 4 · تمت المصادقة وفي انتظار الصرف المالي',
      };
    case 'تم الصرف':
      return {
        completedCount: 4,
        percent: 100,
        barClass: 'bg-emerald-600',
        summaryText: '4 من 4 مراحل · تم صرف التعويض وتسوية الملف نهائياً',
      };
    case 'مرفوض':
      return {
        completedCount: 2,
        percent: 75,
        barClass: 'bg-red-600',
        summaryText: 'تم البت في المرحلة 3 · الملف مرفوض من اللجنة المختصة',
      };
  }
}

export function ClaimProcessingTimeline({
  claim,
  memberRib,
  onEditIncomplete,
  compact = false,
}: ClaimProcessingTimelineProps) {
  const submittedDate = formatClaimTimestamp(claim.createdAt, claim.careDate);
  const updatedDate = formatClaimTimestamp(claim.updatedAt, claim.careDate);
  const finalAmount =
    claim.approvedAmount > 0 ? claim.approvedAmount : claim.estimatedReimbursement;
  const progress = getProgressMeta(claim.status);

  const reviewState: StepVisualState =
    claim.status === 'قيد الدراسة'
      ? 'active'
      : claim.status === 'وثائق ناقصة'
      ? 'warning'
      : 'completed';

  const decisionState: StepVisualState =
    claim.status === 'قيد الدراسة' || claim.status === 'وثائق ناقصة'
      ? 'upcoming'
      : claim.status === 'مرفوض'
      ? 'rejected'
      : 'completed';

  const payoutState: StepVisualState =
    claim.status === 'تم الصرف'
      ? 'completed'
      : claim.status === 'تمت الموافقة'
      ? 'active'
      : claim.status === 'مرفوض'
      ? 'cancelled'
      : 'upcoming';

  const steps: TimelineStep[] = [
    {
      id: 'submission',
      stepNumber: 1,
      title: 'إيداع الملف وتسجيله إلكترونياً',
      subtitle: `${claim.careType} · ${claim.providerName}`,
      badgeText: 'تم الإيداع',
      dateText: submittedDate || claim.careDate,
      description: `تم تسجيل الطلب بالمرجع ${claim.referenceCode} لفائدة ${claim.beneficiaryName} (${claim.beneficiaryRelation}) بمبلغ مصرح به قدره ${formatCurrency(claim.totalAmount)}.`,
      noteBox: claim.notes
        ? {
            tone: 'slate',
            label: 'تفاصيل الوثائق والملاحظات المرفقة',
            text: claim.notes,
          }
        : undefined,
      state: 'completed',
      icon: FileUp,
    },
    {
      id: 'review',
      stepNumber: 2,
      title: 'التدقيق الإداري والمراقبة الطبية',
      subtitle: 'مراجعة الفواتير ومطابقة التغطية التنظيمية',
      badgeText:
        reviewState === 'completed'
          ? 'تم التدقيق'
          : reviewState === 'warning'
          ? 'وثائق ناقصة'
          : 'جاري الفحص',
      dateText:
        reviewState === 'active'
          ? 'قيد المعالجة'
          : updatedDate || submittedDate || claim.careDate,
      description:
        reviewState === 'completed'
          ? 'تم فحص الوثائق القاعدية والتحقق من استيفاء الآجال القانونية وسقف التعويض.'
          : reviewState === 'warning'
          ? 'توقفت المعالجة مؤقتاً لعدم اكتمال بعض الوثائق أو البيانات المطلوبة في الملف.'
          : 'الملف حالياً لدى مصلحة المراقبة الطبية والإدارية للتحقق من الوثائق والوصفات المرفقة.',
      noteBox:
        reviewState === 'warning'
          ? {
              tone: 'amber',
              label: 'ملاحظة المراقبة (مطلوب استكماله)',
              text:
                claim.reviewerNote ||
                'يرجى مراجعة البيانات وإرفاق الوثائق المطلوبة ثم إعادة إرسال الملف لاستئناف المعالجة.',
            }
          : reviewState === 'completed' && claim.reviewerNote && claim.status !== 'مرفوض'
          ? {
              tone: 'slate',
              label: 'تقرير المراقبة الطبية',
              text: claim.reviewerNote,
            }
          : undefined,
      state: reviewState,
      icon: reviewState === 'warning' ? AlertTriangle : ClipboardCheck,
      showEditButton: reviewState === 'warning' && Boolean(onEditIncomplete),
    },
    {
      id: 'decision',
      stepNumber: 3,
      title: 'قرار اللجنة واعتماد التعويض',
      subtitle: 'تحديد المبلغ النهائي للتكفل أو البت بالرفض',
      badgeText:
        decisionState === 'completed'
          ? 'مصادق عليه'
          : decisionState === 'rejected'
          ? 'ملف مرفوض'
          : 'في الانتظار',
      dateText:
        decisionState === 'upcoming'
          ? 'مرحلة لاحقة'
          : updatedDate || submittedDate || claim.careDate,
      description:
        decisionState === 'completed'
          ? `صادقت اللجنة على صرف تعويض بقيمة ${formatCurrency(finalAmount)} وفق جدول الأداءات المعتمد.`
          : decisionState === 'rejected'
          ? 'قررت اللجنة عدم قبول طلب التعويض بعد دراسة الوثائق المقدمة.'
          : `التعويض التقديري المبدئي يبلغ ${formatCurrency(claim.estimatedReimbursement)}، ويتم تثبيته فور استكمال المراقبة.`,
      noteBox:
        decisionState === 'rejected'
          ? {
              tone: 'red',
              label: 'سبب الرفض',
              text:
                claim.reviewerNote ||
                'لم يستوفِ الملف الشروط الإدارية أو الطبية المطلوبة للتعويض.',
            }
          : undefined,
      state: decisionState,
      icon: decisionState === 'rejected' ? XCircle : ShieldCheck,
    },
    {
      id: 'payout',
      stepNumber: 4,
      title: 'تسوية وصرف التعويض المالي (CCP / RIB)',
      subtitle: memberRib
        ? `التحويل إلى الحساب: ${memberRib}`
        : 'التحويل إلى الحساب البريدي أو البنكي للمنخرط',
      badgeText:
        payoutState === 'completed'
          ? 'تم الصرف'
          : payoutState === 'active'
          ? 'قيد التحويل'
          : payoutState === 'cancelled'
          ? 'متوقف'
          : 'غير مفعل بعد',
      dateText:
        payoutState === 'completed'
          ? updatedDate || claim.careDate
          : payoutState === 'active'
          ? 'مبرمج للدفع'
          : '—',
      description:
        payoutState === 'completed'
          ? `تم تحويل مبلغ التعويض النهائي (${formatCurrency(finalAmount)}) بنجاح وتسوية الملف محاسبياً.`
          : payoutState === 'active'
          ? `أمر الصرف معتمد بمبلغ ${formatCurrency(finalAmount)} وجاري التحويل عبر مصالح المحاسبة إلى حسابكم البريدي.`
          : payoutState === 'cancelled'
          ? 'أُلغي إجراء التسوية المالية تبعاً لقرار رفض الملف.'
          : 'تبدأ التسوية المالية والتحويل لحسابكم فور صدور قرار المصادقة على التعويض.',
      noteBox:
        payoutState === 'completed'
          ? {
              tone: 'emerald',
              label: 'إشعار تسوية التعويض',
              text: `تم قيد مبلغ ${formatCurrency(finalAmount)} لحساب المنخرط${memberRib ? ` (${memberRib})` : ''}.`,
            }
          : undefined,
      state: payoutState,
      icon: Banknote,
    },
  ];

  const getStepStyling = (state: StepVisualState) => {
    switch (state) {
      case 'completed':
        return {
          dot: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
          line: 'bg-emerald-300',
          card: 'border-emerald-200/80 bg-emerald-50/30',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: 'text-slate-900',
        };
      case 'active':
        return {
          dot: 'bg-blue-800 text-white border-blue-800 ring-4 ring-blue-100',
          line: 'bg-slate-200',
          card: 'border-blue-200 bg-blue-50/40',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          title: 'text-blue-950',
        };
      case 'warning':
        return {
          dot: 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100',
          line: 'bg-slate-200',
          card: 'border-amber-300 bg-amber-50/50',
          badge: 'bg-amber-100 text-amber-900 border-amber-200',
          title: 'text-amber-950',
        };
      case 'rejected':
        return {
          dot: 'bg-red-600 text-white border-red-600 ring-4 ring-red-100',
          line: 'bg-red-200',
          card: 'border-red-200 bg-red-50/40',
          badge: 'bg-red-100 text-red-800 border-red-200',
          title: 'text-red-950',
        };
      case 'cancelled':
        return {
          dot: 'bg-slate-200 text-slate-400 border-slate-300',
          line: 'bg-slate-200',
          card: 'border-slate-200 bg-slate-50/60 opacity-75',
          badge: 'bg-slate-100 text-slate-500 border-slate-200',
          title: 'text-slate-500',
        };
      case 'upcoming':
      default:
        return {
          dot: 'bg-white text-slate-400 border-slate-300',
          line: 'bg-slate-200',
          card: 'border-slate-200 bg-white',
          badge: 'bg-slate-100 text-slate-600 border-slate-200',
          title: 'text-slate-700',
        };
    }
  };

  const getNoteBoxClass = (tone: 'amber' | 'red' | 'emerald' | 'slate') => {
    switch (tone) {
      case 'amber':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'red':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'emerald':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'slate':
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Overview Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-800 text-white shrink-0">
              {claim.status === 'تم الصرف' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>ملف رقم</span>
                <span className="font-mono-tabular text-blue-800">{claim.referenceCode}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{progress.summaryText}</p>
            </div>
          </div>
          <StatusLabel status={claim.status} />
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progress.barClass}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Vertical Timeline Steps */}
      <ol className="relative space-y-3">
        {steps.map((step, index) => {
          const styles = getStepStyling(step.state);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative flex gap-3.5">
              {/* Step Icon & Vertical Connector */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${styles.dot}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 rounded-full ${styles.line}`} />
                )}
              </div>

              {/* Step Card */}
              <div
                className={`flex-1 rounded-xl border ${compact ? 'p-3' : 'p-3.5 sm:p-4'} ${styles.card}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono-tabular font-semibold text-slate-400">
                        0{step.stepNumber}
                      </span>
                      <h4 className={`text-sm font-bold ${styles.title}`}>{step.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono-tabular text-slate-500">
                      {step.dateText}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${styles.badge}`}
                    >
                      {step.badgeText}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed mt-2">
                  {step.description}
                </p>

                {step.noteBox && (
                  <div
                    className={`mt-2.5 p-2.5 rounded-lg border text-xs ${getNoteBoxClass(
                      step.noteBox.tone
                    )}`}
                  >
                    <p className="font-semibold text-[11px] mb-0.5">{step.noteBox.label}</p>
                    <p className="leading-relaxed">{step.noteBox.text}</p>
                  </div>
                )}

                {step.showEditButton && onEditIncomplete && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onEditIncomplete(claim)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل واستكمال الوثائق الآن</span>
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
