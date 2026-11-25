import { AlertTriangle, Banknote, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type {
  AuthorizationStatus,
  ClaimStatus,
  EnrollmentStatus,
  MemberStatus,
} from '../types/mutual';

type AnyStatus = ClaimStatus | AuthorizationStatus | MemberStatus | EnrollmentStatus;

export function StatusLabel({ status }: { status: AnyStatus }) {
  switch (status) {
    case 'تم الصرف':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <Banknote className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'تمت الموافقة':
    case 'تمت الموافقة والتسجيل':
    case 'موافق عليه':
    case 'نشط':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'قيد الدراسة':
    case 'قيد المراجعة':
    case 'جاري التدقيق والموافقة':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'وثائق ناقصة':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'مرفوض':
    case 'مرفوض / استكمال وثائق':
    case 'معلق':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    default:
      return <span className="text-xs font-medium text-slate-700">{status}</span>;
  }
}
