import { X } from 'lucide-react';
import type { Dependent, MemberProfile } from '../types/mutual';
import { DigitalCardExtractor } from './DigitalCardExtractor';

interface DigitalCardModalProps {
  member: MemberProfile;
  dependents: Dependent[];
  mode: 'card' | 'attestation';
  onClose: () => void;
}

export function DigitalCardModal({
  member,
  dependents,
  mode,
  onClose,
}: DigitalCardModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'card' ? 'استخراج بطاقة الانخراط الرقمية' : 'شهادة الانخراط'}
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-900">
            استخراج بطاقة الانخراط الرقمية والشهادات (MUTNATEC)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <DigitalCardExtractor
            member={member}
            dependents={dependents}
            initialMode={mode}
          />
        </div>
      </div>
    </div>
  );
}
