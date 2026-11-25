import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { EMBLEM_IMAGE_PATH } from '../data/mutualCatalog';
import { verifyElectronicCardQr } from '../lib/internalApi';
import type { CardVerificationResult } from '../types/mutual';
import { BrandImage } from './BrandImage';
import { StatusLabel } from './StatusLabel';

interface CardQrVerifyPageProps {
  membershipNumber: string;
  sig: string;
  onBackToPortal: () => void;
}

export function CardQrVerifyPage({
  membershipNumber,
  sig,
  onBackToPortal,
}: CardQrVerifyPageProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<CardVerificationResult | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg('');
    verifyElectronicCardQr(membershipNumber, sig)
      .then((res) => {
        if (active) setResult(res);
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'تعذر التحقق من صلاحية بطاقة الانخراط الإلكترونية.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [membershipNumber, sig]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[#0b244e] text-white px-6 py-5 flex items-center justify-between gap-4 border-b-4 border-[#c59b43]">
          <div className="flex items-center gap-3">
            <BrandImage
              src={EMBLEM_IMAGE_PATH}
              alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
              fallbackLabel="MUTNATEC"
              className="w-12 h-12 rounded-full object-contain bg-white p-0.5 border border-[#c59b43] shrink-0"
            />
            <div>
              <p className="text-[11px] text-amber-200 font-medium">
                الجمهورية الجزائرية الديمقراطية الشعبية
              </p>
              <h1 className="text-sm sm:text-base font-bold">
                التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC)
              </h1>
              <p className="text-[11px] text-slate-300 mt-0.5">
                نظام المصادقة والتحقق الإلكتروني عبر رمز QR · رقم الاعتماد: 96 / 04
              </p>
            </div>
          </div>
          <QrCode className="w-7 h-7 text-[#e2be6c] shrink-0" aria-hidden="true" />
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              جاري فحص التوقيع الرقمي والتحقق من البطاقة في السجل المركزي...
            </div>
          ) : errorMsg ? (
            <div className="p-5 rounded-xl bg-red-50 border border-red-200 space-y-2 text-center">
              <ShieldAlert className="w-8 h-8 text-red-700 mx-auto" aria-hidden="true" />
              <h2 className="text-base font-bold text-red-900">
                تعذر المصادقة على البطاقة الإلكترونية
              </h2>
              <p className="text-xs text-red-700">{errorMsg}</p>
            </div>
          ) : result ? (
            <>
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  result.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {result.valid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-amber-700 shrink-0" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-bold">
                    {result.valid
                      ? 'بطاقة انخراط إلكترونية موثقة وسارية المفعول'
                      : `البطاقة مسجلة — الوضعية الحالية: ${result.status}`}
                  </p>
                  <p className="text-xs opacity-85 mt-0.5 font-mono-tabular">
                    رقم البطاقة: {result.membershipNumber} · سنة الانخراط: {result.enrollmentYear}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-sm">
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">الاسم واللقب للمنخرط</span>
                  <span className="font-bold text-slate-900">{result.fullName}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">رقم بطاقة الانخراط</span>
                  <span className="font-mono-tabular font-bold text-[#0b244e]">
                    {result.membershipNumber}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">سنة الانخراط والاعتماد</span>
                  <span className="font-mono-tabular text-slate-800">
                    {result.enrollmentYear} · اعتماد رقم {result.accreditationNumber}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">الولاية والبلدية</span>
                  <span className="text-slate-800">
                    {result.city} — {result.municipality}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">مكان العمل / القطاع</span>
                  <span className="text-slate-800">{result.institution}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">صيغة التغطية التعاضدية</span>
                  <span className="font-semibold text-slate-900">{result.coveragePlan}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">الوضعية الإدارية</span>
                  <StatusLabel status={result.status} />
                </div>
              </div>
            </>
          ) : null}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToPortal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#0b244e] text-white rounded-lg hover:bg-blue-950 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
              <span>العودة إلى البوابة الرئيسية</span>
            </button>
            <span className="text-[11px] font-mono-tabular text-slate-400">
              QR-VERIFY · MUTNATEC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
