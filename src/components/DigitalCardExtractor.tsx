import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  CreditCard,
  Download,
  FileBadge,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { EMBLEM_IMAGE_PATH, formatCurrency } from '../data/mutualCatalog';
import type { Dependent, MemberProfile } from '../types/mutual';
import { BrandImage } from './BrandImage';
import { StatusLabel } from './StatusLabel';

interface DigitalCardExtractorProps {
  member: MemberProfile;
  dependents: Dependent[];
  initialMode?: 'card' | 'attestation';
}

function buildVerificationMatrix(seedText: string): boolean[][] {
  const size = 15;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  // Corner finder markers (5x5 top-left, top-right, bottom-left)
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
        const isCenter = r === 2 && c === 2;
        grid[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 5);
  drawFinder(size - 5, 0);

  // Deterministic hash sequence across remaining cells
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 6 && c < 6;
      const inTopRight = r < 6 && c >= size - 6;
      const inBottomLeft = r >= size - 6 && c < 6;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      hash ^= (r * 31 + c * 17 + 7) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (hash >>> 24) % 2 === 0;
    }
  }
  return grid;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function DigitalCardExtractor({
  member,
  dependents,
  initialMode = 'card',
}: DigitalCardExtractorProps) {
  const [mode, setMode] = useState<'card' | 'attestation'>(initialMode);
  const [downloading, setDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const activeDependents = useMemo(
    () => dependents.filter((d) => d.active),
    [dependents]
  );

  const verificationCode = `MUT-${member.membershipNumber}-${member.nationalId.slice(-4) || '2026'}`;
  const matrix = useMemo(
    () => buildVerificationMatrix(`${member.membershipNumber}|${member.nationalId}|2026`),
    [member.membershipNumber, member.nationalId]
  );

  const issueDate = new Date().toISOString().slice(0, 10);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    setDownloadNotice('');
    try {
      const emblem = await loadImageSafe(EMBLEM_IMAGE_PATH);
      const canvas = document.createElement('canvas');

      if (mode === 'card') {
        canvas.width = 1080;
        canvas.height = 680;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Card outer background
        ctx.fillStyle = '#0f172a';
        drawRoundedRect(ctx, 0, 0, 1080, 680, 32);
        ctx.fill();

        // Top band gradient-like accent
        ctx.fillStyle = '#1e293b';
        drawRoundedRect(ctx, 24, 24, 1032, 136, 20);
        ctx.fill();

        // Subtle emerald bottom stripe
        ctx.fillStyle = '#059669';
        ctx.fillRect(24, 652, 1032, 8);

        // Emblem circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(980, 92, 46, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        if (emblem) {
          ctx.drawImage(emblem, 938, 50, 84, 84);
        }
        ctx.restore();

        // Header Titles (RTL aligned right)
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 28px "Cairo", "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('التعاضدية الوطنية لعمال التربية والثقافة', 916, 86);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 18px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('MUTNATEC · بطاقة الانخراط الرقمية · الجزائر', 916, 122);

        // Membership Number (left side)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 16px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('رقم الانخراط', 52, 74);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '700 26px "IBM Plex Mono", monospace';
        ctx.fillText(member.membershipNumber, 52, 114);

        // Details Fields (RTL Right Side)
        const drawField = (label: string, value: string, x: number, y: number, mono = false) => {
          ctx.textAlign = 'right';
          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 17px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText(label, x, y);
          ctx.fillStyle = '#f8fafc';
          ctx.font = mono
            ? '600 22px "IBM Plex Mono", monospace'
            : '700 22px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText(value, x, y + 34);
        };

        drawField('الاسم واللقب للمنخرط', member.fullName, 1020, 224);
        drawField('رقم الضمان الاجتماعي / التعريف (NSS / NIN)', member.nationalId, 600, 224, true);

        drawField('صيغة التغطية التعاضدية', member.coveragePlan, 1020, 336);
        drawField('القطاع / الهيئة المستخدمة', member.sector, 600, 336);

        drawField('الولاية', member.city, 1020, 448);
        drawField('سقف التغطية السنوي', formatCurrency(member.annualCeiling), 600, 448, true);

        // Deterministic Verification Matrix (Bottom Left)
        const qrX = 52;
        const qrY = 398;
        const cellSize = 10;
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, qrX - 12, qrY - 12, matrix.length * cellSize + 24, matrix.length * cellSize + 24, 14);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        matrix.forEach((row, r) => {
          row.forEach((on, c) => {
            if (on) {
              ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize - 1, cellSize - 1);
            }
          });
        });

        // Bottom strip
        ctx.fillStyle = '#020617';
        drawRoundedRect(ctx, 24, 574, 1032, 68, 16);
        ctx.fill();

        ctx.textAlign = 'right';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 18px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(`ذوو الحقوق النشطون: ${activeDependents.length}  ·  الوضعية: ${member.status}`, 1020, 616);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.font = '600 16px "IBM Plex Mono", monospace';
        ctx.fillText(`${verificationCode} · ${issueDate}`, 52, 616);
      } else {
        // Attestation (Certificate) PNG Canvas
        canvas.width = 1100;
        canvas.height = 1420;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        // Header
        if (emblem) {
          ctx.drawImage(emblem, 910, 74, 108, 108);
        }
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 32px "Cairo", "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC)', 890, 120);

        ctx.fillStyle = '#475569';
        ctx.font = '500 20px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('المديرية العامة بالجزائر · شهادة انخراط رقمية رسمية', 890, 162);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(74, 214);
        ctx.lineTo(1026, 214);
        ctx.stroke();

        // Title Banner
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e3a8a';
        ctx.font = '700 36px "Cairo", "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('شهادة انخراط في التعاضدية الوطنية', canvas.width / 2, 290);

        // Details Box
        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 74, 340, 952, 460, 20);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        const rows = [
          ['الاسم واللقب للمنخرط:', member.fullName],
          ['رقم الانخراط المرجعي:', member.membershipNumber],
          ['رقم الضمان / التعريف الوطني:', member.nationalId],
          ['القطاع / الهيئة المستخدمة:', member.sector],
          ['الولاية:', member.city],
          ['صيغة التغطية التعاضدية:', member.coveragePlan],
          ['سقف التغطية السنوي:', formatCurrency(member.annualCeiling)],
          ['وضعية الانخراط الحالية:', member.status],
        ];

        rows.forEach(([label, val], idx) => {
          const y = 400 + idx * 50;
          ctx.textAlign = 'right';
          ctx.fillStyle = '#475569';
          ctx.font = '600 20px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText(label, 990, y);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#0f172a';
          ctx.font = '700 21px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText(val, 110, y);
        });

        // Dependents Section
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(`ذوو الحقوق المسجلون والنشطون (${activeDependents.length}):`, 1020, 864);

        if (activeDependents.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = '500 19px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText('لا يوجد ذوو حقوق مسجلون حالياً في الملف العائلي.', 1020, 910);
        } else {
          activeDependents.slice(0, 6).forEach((dep, idx) => {
            const y = 910 + idx * 42;
            ctx.fillStyle = '#334155';
            ctx.font = '500 19px "IBM Plex Sans Arabic", sans-serif';
            ctx.fillText(`• ${dep.fullName} (${dep.relationship}) — رمز التغطية: ${dep.coverageCode}`, 1000, y);
          });
        }

        // Verification Matrix & Footer
        const qrX = 80;
        const qrY = 1170;
        const cellSize = 10;
        ctx.fillStyle = '#0f172a';
        matrix.forEach((row, r) => {
          row.forEach((on, c) => {
            if (on) {
              ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize - 1, cellSize - 1);
            }
          });
        });

        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '500 18px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(`حُررت بتاريخ: ${issueDate}`, 1020, 1230);
        ctx.fillText(`رمز التحقق الرقمي: ${verificationCode}`, 1020, 1270);
        ctx.fillStyle = '#059669';
        ctx.font = '700 20px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('وثيقة إلكترونية مستخرجة من البوابة الرقمية للتعاضدية الوطنية', 1020, 1315);
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('تعذر توليد ملف الصورة.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        mode === 'card'
          ? `MUTNATEC-Card-${member.membershipNumber}.png`
          : `MUTNATEC-Attestation-${member.membershipNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadNotice(
        mode === 'card'
          ? 'تم استخراج وتحميل صورة بطاقة الانخراط الرقمية بنجاح.'
          : 'تم استخراج وتحميل شهادة الانخراط الرقمية بنجاح.'
      );
    } catch {
      setDownloadNotice('تعذر تحميل الصورة. يمكنك استخدام زر الطباعة لحفظ الوثيقة بصيغة PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => {
              setMode('card');
              setDownloadNotice('');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'card'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
            <span>بطاقة الانخراط الرقمية</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('attestation');
              setDownloadNotice('');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'attestation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileBadge className="w-3.5 h-3.5" aria-hidden="true" />
            <span>شهادة الانخراط</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span className="text-emerald-700">تم نسخ المرجع</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span className="font-mono-tabular">{verificationCode}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>
              {downloading
                ? 'جاري الاستخراج...'
                : mode === 'card'
                ? 'استخراج وتحميل البطاقة (PNG)'
                : 'تحميل الشهادة (PNG)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>طباعة / حفظ PDF</span>
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div className="no-print p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          {downloadNotice}
        </div>
      )}

      {mode === 'card' ? (
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-900 text-white">
          <div className="px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandImage
                src={EMBLEM_IMAGE_PATH}
                alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
                fallbackLabel="MUTNATEC"
                className="w-12 h-12 rounded-full object-contain bg-white p-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-bold tracking-tight text-white">
                  التعاضدية الوطنية لعمال التربية والثقافة
                </p>
                <p className="text-xs text-slate-300">
                  MUTNATEC · الجمهورية الجزائرية الديمقراطية الشعبية
                </p>
              </div>
            </div>
            <div className="sm:text-left">
              <p className="text-xs text-slate-400">رقم الانخراط</p>
              <p className="font-mono-tabular text-sm font-semibold text-sky-300">
                {member.membershipNumber}
              </p>
            </div>
          </div>

          <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm flex-1 w-full">
              <div>
                <p className="text-xs text-slate-400">الاسم واللقب للمنخرط</p>
                <p className="font-semibold text-white mt-0.5">{member.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  رقم الضمان الاجتماعي / التعريف (NSS / NIN)
                </p>
                <p className="font-mono-tabular font-semibold text-white mt-0.5">
                  {member.nationalId}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">صيغة التغطية</p>
                <p className="font-medium text-slate-100 mt-0.5">{member.coveragePlan}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">القطاع / الهيئة</p>
                <p className="font-medium text-slate-100 mt-0.5">{member.sector}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">الولاية</p>
                <p className="font-medium text-slate-100 mt-0.5">{member.city}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">سقف التغطية السنوي</p>
                <p className="font-mono-tabular font-semibold text-sky-300 mt-0.5">
                  {formatCurrency(member.annualCeiling)}
                </p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl shrink-0 self-center md:self-end text-center space-y-1.5">
              <svg
                width="105"
                height="105"
                viewBox="0 0 15 15"
                role="img"
                aria-label={`رمز التحقق الرقمي للبطاقة ${verificationCode}`}
                className="block mx-auto"
              >
                <rect width="15" height="15" fill="#ffffff" />
                {matrix.map((row, r) =>
                  row.map((on, c) =>
                    on ? (
                      <rect
                        key={`${r}-${c}`}
                        x={c}
                        y={r}
                        width={0.92}
                        height={0.92}
                        fill="#0f172a"
                      />
                    ) : null
                  )
                )}
              </svg>
              <p className="font-mono-tabular text-[10px] font-semibold text-slate-700">
                {verificationCode}
              </p>
            </div>
          </div>

          <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span>ذوو الحقوق النشطون: {activeDependents.length}</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>الوضعية: {member.status}</span>
            </span>
            <span className="font-mono-tabular">
              تاريخ الاستخراج: {issueDate} · صالحة لسنة 2026
            </span>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <BrandImage
                src={EMBLEM_IMAGE_PATH}
                alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
                fallbackLabel="MUTNATEC"
                className="w-14 h-14 rounded-full object-contain bg-white border border-slate-200 shrink-0"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC)
                </h3>
                <p className="text-xs text-slate-500">
                  المديرية العامة بالجزائر · شهادة انخراط إلكترونية مستخرجة
                </p>
              </div>
            </div>
            <div className="text-left">
              <StatusLabel status={member.status} />
              <p className="text-xs text-slate-500 font-mono-tabular mt-1">{issueDate}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              تشهد مصالح{' '}
              <strong>التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC)</strong> بأن
              السيد(ة) <strong>{member.fullName}</strong>، الحامل(ة) لرقم الضمان
              الاجتماعي / التعريف الوطني{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {member.nationalId}
              </span>
              ، منخرط(ة) بصفة نظامية تحت رقم الانخراط{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {member.membershipNumber}
              </span>{' '}
              التابع لـ <strong>{member.sector}</strong> بولاية{' '}
              <strong>{member.city}</strong>.
            </p>
            <p>
              يستفيد المعني بالأمر من <strong>{member.coveragePlan}</strong> بسقف تغطية
              تكميلي سنوي قدره{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {formatCurrency(member.annualCeiling)}
              </span>
              ، مع شمول ذوي الحقوق المصرح بهم أسفله.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-semibold text-slate-500 mb-3">
              ذوو الحقوق المسجلون ({activeDependents.length})
            </h4>
            {activeDependents.length === 0 ? (
              <p className="text-xs text-slate-500">
                لا يوجد ذوو حقوق مسجلون حالياً في الملف العائلي.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {activeDependents.map((dep) => (
                  <div
                    key={dep.id}
                    className="px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{dep.fullName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{dep.relationship}</span>
                    </div>
                    <span className="font-mono-tabular text-slate-500">
                      {dep.coverageCode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span>رمز التحقق المرجعي: <strong className="font-mono-tabular text-slate-800">{verificationCode}</strong></span>
            <span>صالحة للسنة المالية 2026</span>
          </div>
        </div>
      )}
    </div>
  );
}
