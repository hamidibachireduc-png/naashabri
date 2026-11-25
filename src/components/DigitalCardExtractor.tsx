import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileBadge,
  IdCard,
  MapPin,
  PenTool,
  Printer,
  QrCode,
  ShieldCheck,
  User,
} from 'lucide-react';
import { EMBLEM_IMAGE_PATH, formatCurrency } from '../data/mutualCatalog';
import { verifyElectronicCardQr } from '../lib/internalApi';
import type {
  CardVerificationResult,
  Dependent,
  MemberProfile,
} from '../types/mutual';
import { BrandImage } from './BrandImage';
import { StatusLabel } from './StatusLabel';

interface DigitalCardExtractorProps {
  member: MemberProfile;
  dependents: Dependent[];
  initialMode?: 'card' | 'attestation';
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
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCardFrontToCanvas(
  ctx: CanvasRenderingContext2D,
  offsetY: number,
  width: number,
  height: number,
  emblem: HTMLImageElement | null,
  qrImg: HTMLImageElement | null,
  info: {
    membershipNumber: string;
    enrollmentYear: string;
    fullName: string;
    verificationCode: string;
  }
) {
  ctx.save();
  ctx.translate(0, offsetY);

  // Card clip & white background
  ctx.save();
  drawRoundedRect(ctx, 0, 0, width, height, 28);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Top-left navy/gold/green decorative wave
  ctx.fillStyle = '#0b244e';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.56, 0);
  ctx.quadraticCurveTo(width * 0.28, 70, 0, 215);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#006233';
  ctx.beginPath();
  ctx.moveTo(width * 0.56, 0);
  ctx.lineTo(width * 0.61, 0);
  ctx.quadraticCurveTo(width * 0.31, 78, 0, 228);
  ctx.lineTo(0, 215);
  ctx.quadraticCurveTo(width * 0.28, 70, width * 0.56, 0);
  ctx.fill();

  ctx.fillStyle = '#c59b43';
  ctx.beginPath();
  ctx.moveTo(width * 0.48, 0);
  ctx.lineTo(width * 0.52, 0);
  ctx.quadraticCurveTo(width * 0.25, 68, 0, 198);
  ctx.lineTo(0, 184);
  ctx.quadraticCurveTo(width * 0.23, 62, width * 0.48, 0);
  ctx.fill();

  // Top-right navy/gold corner wave
  ctx.fillStyle = '#0b244e';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width * 0.72, 0);
  ctx.quadraticCurveTo(width * 0.88, 56, width, 165);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c59b43';
  ctx.beginPath();
  ctx.moveTo(width * 0.71, 0);
  ctx.lineTo(width * 0.74, 0);
  ctx.quadraticCurveTo(width * 0.89, 54, width, 152);
  ctx.lineTo(width, 165);
  ctx.quadraticCurveTo(width * 0.88, 56, width * 0.71, 0);
  ctx.fill();

  // Bottom-right navy/gold/flag wave
  ctx.fillStyle = '#0b244e';
  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width * 0.62, height);
  ctx.quadraticCurveTo(width * 0.86, height - 60, width, height - 205);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c59b43';
  ctx.beginPath();
  ctx.moveTo(width * 0.62, height);
  ctx.lineTo(width * 0.58, height);
  ctx.quadraticCurveTo(width * 0.84, height - 66, width, height - 220);
  ctx.lineTo(width, height - 205);
  ctx.quadraticCurveTo(width * 0.86, height - 60, width * 0.62, height);
  ctx.fill();

  ctx.fillStyle = '#006233';
  ctx.beginPath();
  ctx.moveTo(width * 0.55, height);
  ctx.lineTo(width * 0.52, height);
  ctx.quadraticCurveTo(width * 0.72, height - 28, width * 0.86, height - 92);
  ctx.lineTo(width * 0.84, height - 80);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d21034';
  ctx.beginPath();
  ctx.moveTo(width * 0.52, height);
  ctx.lineTo(width * 0.49, height);
  ctx.quadraticCurveTo(width * 0.7, height - 22, width * 0.84, height - 80);
  ctx.lineTo(width * 0.82, height - 70);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Outer gold border
  ctx.strokeStyle = '#b9933c';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 28);
  ctx.stroke();

  // Twin Emblems (Left and Right)
  const drawEmblemCircle = (cx: number, cy: number, r: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0b244e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c59b43';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    if (emblem) {
      ctx.drawImage(emblem, cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  };
  drawEmblemCircle(132, 118, 68);
  drawEmblemCircle(width - 132, 118, 68);

  // Header Titles
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 28px "Cairo", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('الجمهورية الجزائرية الديمقراطية الشعبية', width / 2, 74);

  ctx.font = '700 30px "Cairo", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('التعاضدية الوطنية لعمال التربية والثقافة', width / 2, 122);

  ctx.direction = 'ltr';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 28px "IBM Plex Mono", "Cairo", sans-serif';
  ctx.fillText('•  M. U. N. A. T. E. C  •', width / 2, 170);

  // Gold horizontal flanking rules
  ctx.strokeStyle = '#c59b43';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(235, 161);
  ctx.lineTo(395, 161);
  ctx.moveTo(width - 395, 161);
  ctx.lineTo(width - 235, 161);
  ctx.stroke();

  // Center Ribbon "بطاقة انخراط"
  const ribbonW = 620;
  const ribbonH = 104;
  const ribbonX = (width - ribbonW) / 2;
  const ribbonY = 212;
  const grad = ctx.createLinearGradient(ribbonX, ribbonY, ribbonX + ribbonW, ribbonY + ribbonH);
  grad.addColorStop(0, '#091c3e');
  grad.addColorStop(0.5, '#123874');
  grad.addColorStop(1, '#091c3e');
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 28);
  ctx.fill();
  ctx.strokeStyle = '#c59b43';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px "Cairo", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('بطاقة انخراط', width / 2, ribbonY + 67);

  // Accreditation Pill Badge
  const badgeW = 290;
  const badgeH = 44;
  const badgeX = (width - badgeW) / 2;
  const badgeY = ribbonY + ribbonH - 12;
  ctx.fillStyle = '#d3aa52';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 22);
  ctx.fill();
  ctx.strokeStyle = '#9a7322';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#0b1e3b';
  ctx.font = '700 22px "Cairo", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('رقم الاعتماد: 96 / 04', width / 2, badgeY + 30);

  // Bottom Details (Right side) & QR Code (Left side)
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  const drawInfoRow = (label: string, value: string, y: number, mono = false) => {
    // Badge square
    ctx.fillStyle = '#7f1d1d';
    drawRoundedRect(ctx, width - 170, y - 28, 42, 38, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ID', width - 149, y - 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 24px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(label, width - 185, y);

    ctx.fillStyle = '#0b244e';
    ctx.font = mono
      ? '700 25px "IBM Plex Mono", monospace'
      : '700 24px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(value, width - 365, y);
  };

  drawInfoRow('رقم البطاقة:', info.membershipNumber, 438, true);
  drawInfoRow('سنة الانخراط:', info.enrollmentYear, 502, true);
  drawInfoRow('المنخرط(ة):', info.fullName, 566, false);

  // Scannable QR Box (Left Side)
  const qrBoxSize = 188;
  const qrBoxX = 88;
  const qrBoxY = 392;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 36, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (qrImg) {
    ctx.drawImage(qrImg, qrBoxX + 14, qrBoxY + 12, qrBoxSize - 28, qrBoxSize - 28);
  }
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0b244e';
  ctx.font = '700 13px "IBM Plex Mono", monospace';
  ctx.fillText(info.verificationCode, qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 10);

  ctx.direction = 'rtl';
  ctx.fillStyle = '#475569';
  ctx.font = '600 12px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('كود التحقق الإلكتروني QR', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize + 28);

  ctx.restore();
}

function drawCardBackToCanvas(
  ctx: CanvasRenderingContext2D,
  offsetY: number,
  width: number,
  height: number,
  emblem: HTMLImageElement | null,
  qrImg: HTMLImageElement | null,
  info: {
    fullName: string;
    birthDisplay: string;
    jobTitle: string;
    institution: string;
    memberRole: string;
    socialSecurityNumber: string;
    nationalId: string;
    city: string;
    municipality: string;
    verificationCode: string;
  }
) {
  ctx.save();
  ctx.translate(0, offsetY);

  // Background clip
  ctx.save();
  drawRoundedRect(ctx, 0, 0, width, height, 28);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Top-left & bottom-left subtle navy/gold corner waves
  ctx.fillStyle = '#0b244e';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(130, 0);
  ctx.quadraticCurveTo(40, 48, 0, 140);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0b244e';
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(290, height);
  ctx.quadraticCurveTo(95, height - 48, 0, height - 180);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c59b43';
  ctx.beginPath();
  ctx.moveTo(290, height);
  ctx.lineTo(318, height);
  ctx.quadraticCurveTo(108, height - 54, 0, height - 196);
  ctx.lineTo(0, height - 180);
  ctx.quadraticCurveTo(95, height - 48, 290, height);
  ctx.fill();

  ctx.fillStyle = '#006233';
  ctx.beginPath();
  ctx.moveTo(318, height);
  ctx.lineTo(334, height);
  ctx.quadraticCurveTo(170, height - 22, 90, height - 86);
  ctx.closePath();
  ctx.fill();

  // Watermark emblem in center
  if (emblem) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.drawImage(emblem, width / 2 - 190, height / 2 - 205, 380, 380);
    ctx.restore();
  }
  ctx.restore();

  // Gold Frame Border
  ctx.strokeStyle = '#b9933c';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 18, 18, width - 36, height - 36, 22);
  ctx.stroke();

  // 8 Official Fields matching back template
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'الاسم واللقب:', value: info.fullName },
    { label: 'تاريخ ومكان الازدياد:', value: info.birthDisplay },
    { label: 'الوظيفة:', value: info.jobTitle },
    { label: 'مكان العمل:', value: info.institution },
    { label: 'الصفة:', value: info.memberRole },
    { label: 'رقم الضمان الاجتماعي:', value: info.socialSecurityNumber, mono: true },
    { label: 'الرقم التعريفي الوطني (NIN):', value: info.nationalId, mono: true },
    { label: 'الولاية / البلدية:', value: `${info.city}  —  البلدية: ${info.municipality}` },
  ];

  rows.forEach((row, idx) => {
    const y = 78 + idx * 54;
    // Navy-gold circular bullet badge
    ctx.beginPath();
    ctx.arc(width - 66, y - 8, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#0b244e';
    ctx.fill();
    ctx.strokeStyle = '#c59b43';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#e6c26e';
    ctx.beginPath();
    ctx.arc(width - 66, y - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(row.label, width - 96, y);

    // Value + subtle underline rule
    ctx.fillStyle = '#0b244e';
    ctx.font = row.mono
      ? '700 21px "IBM Plex Mono", monospace'
      : '600 21px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(row.value, width - 385, y);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(64, y + 10);
    ctx.lineTo(width - 385, y + 10);
    ctx.stroke();
  });

  // Footer: Signatures + Official Circular Stamp + Mini QR Verification
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 22px "Cairo", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('إمضاء المنخرط', width - 96, 548);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width - 280, 594);
  ctx.lineTo(width - 96, 594);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 21px "Cairo", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('ختم وتوقيع رئيس الفرع / التعاضدية', 440, 546);

  // Circular Official Stamp
  ctx.save();
  ctx.beginPath();
  ctx.arc(440, 606, 42, 0, Math.PI * 2);
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(440, 606, 34, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#1d4ed8';
  ctx.font = '700 11px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('MUTNATEC', 440, 602);
  ctx.font = '600 10px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('اعتماد 96 / 04', 440, 618);
  ctx.restore();

  // Back Mini QR
  if (qrImg) {
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 52, 514, 134, 134, 12);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.drawImage(qrImg, 62, 522, 114, 114);
  }

  ctx.restore();
}

export function DigitalCardExtractor({
  member,
  dependents,
  initialMode = 'card',
}: DigitalCardExtractorProps) {
  const [mode, setMode] = useState<'card' | 'attestation'>(initialMode);
  const [cardSide, setCardSide] = useState<'both' | 'front' | 'back'>('both');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyPreview, setVerifyPreview] = useState<CardVerificationResult | null>(null);

  const activeDependents = useMemo(
    () => dependents.filter((d) => d.active),
    [dependents]
  );

  const enrollmentYear = member.enrollmentYear || '2026';
  const verificationCode = member.cardQrSig
    ? `${member.membershipNumber}-${member.cardQrSig.slice(0, 6)}`
    : `MUT-${member.membershipNumber}-${member.nationalId.slice(-4) || '2026'}`;

  const birthDisplay = useMemo(() => {
    const bd = member.birthDate?.trim();
    const bp = member.birthPlace?.trim() || member.city;
    if (bd && bp) return `${bd} — ${bp}`;
    if (bd) return bd;
    return `الولاية: ${bp}`;
  }, [member.birthDate, member.birthPlace, member.city]);

  const jobTitle = member.jobTitle?.trim() || member.sector;
  const institution = member.institution?.trim() || member.sector;
  const memberRole =
    member.memberRole?.trim() ||
    (member.status === 'نشط' ? 'منخرط نشط' : member.status);
  const socialSecurityNumber =
    member.socialSecurityNumber?.trim() || member.nationalId;
  const municipality = member.municipality?.trim() || member.city;

  const qrPayload = useMemo(() => {
    if (member.cardQrSig && typeof window !== 'undefined') {
      return `${window.location.origin}/?verifyCard=${encodeURIComponent(
        member.membershipNumber
      )}&sig=${encodeURIComponent(member.cardQrSig)}`;
    }
    return JSON.stringify({
      org: 'MUTNATEC',
      accreditation: '96/04',
      cardNo: member.membershipNumber,
      year: enrollmentYear,
      name: member.fullName,
      nin: member.nationalId,
      nss: socialSecurityNumber,
      wilaya: member.city,
      municipality,
      status: member.status,
    });
  }, [
    member.cardQrSig,
    member.membershipNumber,
    member.fullName,
    member.nationalId,
    member.city,
    member.status,
    enrollmentYear,
    socialSecurityNumber,
    municipality,
  ]);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0b244e',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (mounted) setQrDataUrl('');
      });
    return () => {
      mounted = false;
    };
  }, [qrPayload]);

  const issueDate = new Date().toISOString().slice(0, 10);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleLiveVerifyTest = async () => {
    if (!member.cardQrSig) {
      setVerifyError('التحقق المباشر عبر السيرفر متاح لبطاقات الملف الداخلي الموقّعة إلكترونياً.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    setVerifyPreview(null);
    try {
      const res = await verifyElectronicCardQr(
        member.membershipNumber,
        member.cardQrSig
      );
      setVerifyPreview(res);
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : 'تعذر إجراء فحص التحقق الإلكتروني.'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDownloadCardPng = async (target: 'front' | 'back' | 'both' | 'attestation') => {
    setDownloading(target);
    setDownloadNotice('');
    try {
      const [emblem, qrImg] = await Promise.all([
        loadImageSafe(EMBLEM_IMAGE_PATH),
        loadImageSafe(qrDataUrl),
      ]);
      const canvas = document.createElement('canvas');

      if (target === 'attestation') {
        canvas.width = 1100;
        canvas.height = 1420;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#b9933c';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

        if (emblem) {
          ctx.drawImage(emblem, 910, 74, 108, 108);
        }
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0b244e';
        ctx.font = '700 32px "Cairo", "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC)', 890, 120);

        ctx.fillStyle = '#475569';
        ctx.font = '500 20px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('الجمهورية الجزائرية الديمقراطية الشعبية · اعتماد 96 / 04', 890, 162);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(74, 214);
        ctx.lineTo(1026, 214);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#0b244e';
        ctx.font = '700 36px "Cairo", "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('شهادة انخراط إلكترونية موثقة', canvas.width / 2, 290);

        ctx.fillStyle = '#f8fafc';
        drawRoundedRect(ctx, 74, 340, 952, 490, 20);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        const rows = [
          ['الاسم واللقب للمنخرط:', member.fullName],
          ['رقم بطاقة الانخراط:', member.membershipNumber],
          ['رقم الضمان الاجتماعي (NSS):', socialSecurityNumber],
          ['الرقم التعريفي الوطني (NIN):', member.nationalId],
          ['الوظيفة ومكان العمل:', `${jobTitle} — ${institution}`],
          ['الولاية والبلدية:', `${member.city} — ${municipality}`],
          ['صيغة التغطية وسقفها:', `${member.coveragePlan} (${formatCurrency(member.annualCeiling)})`],
          ['سنة الانخراط والوضعية:', `${enrollmentYear} — ${member.status}`],
        ];

        rows.forEach(([label, val], idx) => {
          const y = 400 + idx * 54;
          ctx.textAlign = 'right';
          ctx.fillStyle = '#475569';
          ctx.font = '600 19px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText(label, 990, y);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#0f172a';
          ctx.font = '700 19px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText(val, 110, y);
        });

        ctx.textAlign = 'right';
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(`ذوو الحقوق المسجلون والنشطون (${activeDependents.length}):`, 1020, 894);

        if (activeDependents.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = '500 19px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillText('لا يوجد ذوو حقوق مسجلون حالياً في الملف العائلي.', 1020, 940);
        } else {
          activeDependents.slice(0, 5).forEach((dep, idx) => {
            const y = 940 + idx * 42;
            ctx.fillStyle = '#334155';
            ctx.font = '500 19px "IBM Plex Sans Arabic", sans-serif';
            ctx.fillText(`• ${dep.fullName} (${dep.relationship}) — ${dep.coverageCode}`, 1000, y);
          });
        }

        if (qrImg) {
          ctx.drawImage(qrImg, 80, 1170, 160, 160);
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '500 18px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(`حُررت بتاريخ: ${issueDate}`, 1020, 1230);
        ctx.fillText(`مرجع QR الإلكتروني: ${verificationCode}`, 1020, 1270);
        ctx.fillStyle = '#047857';
        ctx.font = '700 20px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText('وثيقة إلكترونية موثقة عبر البوابة الرقمية للتعاضدية الوطنية', 1020, 1315);
      } else {
        const cardW = 1140;
        const cardH = 680;
        const gap = 36;
        canvas.width = cardW;
        canvas.height = target === 'both' ? cardH * 2 + gap : cardH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (target === 'both') {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (target === 'front' || target === 'both') {
          drawCardFrontToCanvas(ctx, 0, cardW, cardH, emblem, qrImg, {
            membershipNumber: member.membershipNumber,
            enrollmentYear,
            fullName: member.fullName,
            verificationCode,
          });
        }

        if (target === 'back' || target === 'both') {
          drawCardBackToCanvas(
            ctx,
            target === 'both' ? cardH + gap : 0,
            cardW,
            cardH,
            emblem,
            qrImg,
            {
              fullName: member.fullName,
              birthDisplay,
              jobTitle,
              institution,
              memberRole,
              socialSecurityNumber,
              nationalId: member.nationalId,
              city: member.city,
              municipality,
              verificationCode,
            }
          );
        }
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('تعذر توليد ملف الصورة.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix =
        target === 'attestation'
          ? 'Attestation'
          : target === 'front'
          ? 'Card-Front'
          : target === 'back'
          ? 'Card-Back'
          : 'Card-Full-QR';
      a.download = `MUTNATEC-${suffix}-${member.membershipNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadNotice(
        target === 'attestation'
          ? 'تم استخراج وتحميل شهادة الانخراط الإلكترونية بنجاح.'
          : 'تم استخراج وتحميل نموذج البطاقة الإلكترونية برمز QR بنجاح.'
      );
    } catch {
      setDownloadNotice('تعذر تحميل الصورة. يمكنك استخدام زر الطباعة لحفظ الوثيقة بصيغة PDF.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Toolbar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
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
              <span>نموذج البطاقة الإلكترونية (QR)</span>
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

          {mode === 'card' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCardSide('both')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                  cardSide === 'both'
                    ? 'bg-white text-[#0b244e] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الوجهان معاً
              </button>
              <button
                type="button"
                onClick={() => setCardSide('front')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                  cardSide === 'front'
                    ? 'bg-white text-[#0b244e] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الوجه الأمامي
              </button>
              <button
                type="button"
                onClick={() => setCardSide('back')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                  cardSide === 'back'
                    ? 'bg-white text-[#0b244e] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الوجه الخلفي
              </button>
            </div>
          )}
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
                <span className="text-emerald-700">تم نسخ رابط التحقق</span>
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
            onClick={handleLiveVerifyTest}
            disabled={verifyLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-blue-300 text-blue-900 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{verifyLoading ? 'جاري الفحص...' : 'فحص كود QR إلكترونياً'}</span>
          </button>

          {mode === 'card' ? (
            <>
              <button
                type="button"
                onClick={() => void handleDownloadCardPng('front')}
                disabled={Boolean(downloading)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>الوجه الأمامي</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadCardPng('back')}
                disabled={Boolean(downloading)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>الوجه الخلفي</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadCardPng('both')}
                disabled={Boolean(downloading)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {downloading ? 'جاري الاستخراج...' : 'تحميل البطاقة كاملة (PNG)'}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleDownloadCardPng('attestation')}
              disabled={Boolean(downloading)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{downloading ? 'جاري الاستخراج...' : 'تحميل الشهادة (PNG)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div className="no-print p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
          {downloadNotice}
        </div>
      )}

      {verifyError && (
        <div className="no-print p-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          {verifyError}
        </div>
      )}

      {verifyPreview && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-emerald-900">
                نتيجة مسح رمز QR الإلكتروني: البطاقة موثقة وصالحة ({verifyPreview.status})
              </p>
              <p className="text-emerald-800">
                {verifyPreview.fullName} · رقم البطاقة:{' '}
                <strong className="font-mono-tabular">{verifyPreview.membershipNumber}</strong> ·
                اعتماد {verifyPreview.accreditationNumber} · {verifyPreview.city} (
                {verifyPreview.municipality})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerifyPreview(null)}
            className="text-xs font-medium text-emerald-800 hover:underline self-start cursor-pointer"
          >
            إغلاق الفحص
          </button>
        </div>
      )}

      {mode === 'card' ? (
        <div className="space-y-6">
          {/* FRONT OF ELECTRONIC CARD */}
          {(cardSide === 'front' || cardSide === 'both') && (
            <div className="relative rounded-2xl overflow-hidden bg-white border-2 border-[#b9933c] shadow-sm">
              {/* Decorative corner waves matching uploaded front image */}
              <svg
                viewBox="0 0 1140 680"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none select-none"
              >
                <path d="M0,0 L640,0 Q310,70 0,215 Z" fill="#0b244e" />
                <path d="M640,0 L690,0 Q340,78 0,228 L0,215 Q310,70 640,0 Z" fill="#006233" />
                <path d="M550,0 L590,0 Q285,68 0,198 L0,184 Q260,62 550,0 Z" fill="#c59b43" />
                <path d="M1140,0 L820,0 Q1000,56 1140,165 Z" fill="#0b244e" />
                <path d="M810,0 L842,0 Q1010,54 1140,152 L1140,165 Q1000,56 810,0 Z" fill="#c59b43" />
                <path d="M1140,680 L700,680 Q980,620 1140,475 Z" fill="#0b244e" />
                <path d="M700,680 L658,680 Q960,614 1140,460 L1140,475 Q980,620 700,680 Z" fill="#c59b43" />
                <path d="M625,680 L595,680 Q820,652 980,588 L956,600 Z" fill="#006233" />
                <path d="M595,680 L565,680 Q795,658 956,600 L934,610 Z" fill="#d21034" />
              </svg>

              <div className="relative z-10 p-5 sm:p-7 space-y-5">
                {/* Top Header with Twin Circular Emblems */}
                <div className="flex items-center justify-between gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0b244e] p-1 border-2 border-[#c59b43] shadow-xs shrink-0 flex items-center justify-center">
                    <BrandImage
                      src={EMBLEM_IMAGE_PATH}
                      alt="شعار التعاضدية الوطنية"
                      fallbackLabel="MUTNATEC"
                      className="w-full h-full rounded-full object-contain bg-white"
                    />
                  </div>

                  <div className="text-center space-y-1 flex-1 px-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      الجمهورية الجزائرية الديمقراطية الشعبية
                    </p>
                    <h3 className="text-sm sm:text-lg font-extrabold text-slate-900">
                      التعاضدية الوطنية لعمال التربية والثقافة
                    </h3>
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <span className="h-[2px] w-10 sm:w-16 bg-[#c59b43]" />
                      <span
                        dir="ltr"
                        className="font-mono-tabular text-xs sm:text-sm font-bold tracking-[0.2em] text-slate-900"
                      >
                        M.U.N.A.T.E.C
                      </span>
                      <span className="h-[2px] w-10 sm:w-16 bg-[#c59b43]" />
                    </div>
                  </div>

                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0b244e] p-1 border-2 border-[#c59b43] shadow-xs shrink-0 flex items-center justify-center">
                    <BrandImage
                      src={EMBLEM_IMAGE_PATH}
                      alt="شعار التعاضدية الوطنية"
                      fallbackLabel="MUTNATEC"
                      className="w-full h-full rounded-full object-contain bg-white"
                    />
                  </div>
                </div>

                {/* Ribbon Banner "بطاقة انخراط" + Gold Accreditation Pill */}
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-md bg-gradient-to-l from-[#091c3e] via-[#123874] to-[#091c3e] border-2 border-[#c59b43] rounded-2xl py-3 px-6 text-center shadow-sm">
                    <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                      بطاقة انخراط
                    </p>
                  </div>
                  <div className="-mt-3 px-5 py-1 bg-[#d3aa52] border border-[#9a7322] rounded-full shadow-xs">
                    <p className="text-xs sm:text-sm font-bold text-[#0b1e3b] font-mono-tabular">
                      رقم الاعتماد: 96 / 04
                    </p>
                  </div>
                </div>

                {/* Card Number / Enrollment Year + Real Scannable Electronic QR */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-5 pt-2">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-7 rounded-md bg-[#7f1d1d] text-white flex items-center justify-center shrink-0">
                        <IdCard className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        رقم البطاقة:
                      </span>
                      <span className="font-mono-tabular text-sm sm:text-base font-extrabold text-[#0b244e]">
                        {member.membershipNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-7 rounded-md bg-[#7f1d1d] text-white flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        سنة الانخراط:
                      </span>
                      <span className="font-mono-tabular text-sm sm:text-base font-extrabold text-[#0b244e]">
                        {enrollmentYear}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-7 rounded-md bg-[#0b244e] text-[#e6c26e] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        المنخرط(ة):
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900">
                        {member.fullName}
                      </span>
                    </div>
                  </div>

                  {/* Real Scannable Electronic QR Code Box */}
                  <div className="bg-white/95 border border-slate-300 rounded-xl p-2.5 text-center self-center sm:self-end shrink-0 shadow-xs space-y-1">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`كود QR الإلكتروني للبطاقة ${member.membershipNumber}`}
                        className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-md"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 rounded-md flex items-center justify-center text-[10px] text-slate-400">
                        QR...
                      </div>
                    )}
                    <p className="font-mono-tabular text-[10px] font-bold text-[#0b244e]">
                      {verificationCode}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      كود QR الإلكتروني
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BACK OF ELECTRONIC CARD */}
          {(cardSide === 'back' || cardSide === 'both') && (
            <div className="relative rounded-2xl overflow-hidden bg-white border-2 border-[#b9933c] shadow-sm">
              {/* Decorative corner waves matching uploaded back image */}
              <svg
                viewBox="0 0 1140 680"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none select-none"
              >
                <path d="M0,0 L130,0 Q40,48 0,140 Z" fill="#0b244e" />
                <path d="M0,680 L290,680 Q95,632 0,500 Z" fill="#0b244e" />
                <path d="M290,680 L318,680 Q108,626 0,484 L0,500 Q95,632 290,680 Z" fill="#c59b43" />
                <path d="M318,680 L334,680 Q170,658 90,594 Z" fill="#006233" />
              </svg>

              {/* Watermark emblem in center */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              >
                <BrandImage
                  src={EMBLEM_IMAGE_PATH}
                  alt=""
                  fallbackLabel="MUTNATEC"
                  className="w-56 h-56 sm:w-72 sm:h-72 object-contain opacity-[0.09]"
                />
              </div>

              <div className="relative z-10 p-5 sm:p-7 space-y-5">
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">الاسم واللقب:</span>
                    <span className="font-bold text-[#0b244e]">{member.fullName}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">
                      تاريخ ومكان الازدياد:
                    </span>
                    <span className="font-semibold text-[#0b244e] font-mono-tabular">
                      {birthDisplay}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">الوظيفة:</span>
                    <span className="font-semibold text-[#0b244e]">{jobTitle}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">مكان العمل:</span>
                    <span className="font-semibold text-[#0b244e]">{institution}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">الصفة:</span>
                    <span className="font-semibold text-[#0b244e]">{memberRole}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">
                      رقم الضمان الاجتماعي:
                    </span>
                    <span className="font-mono-tabular font-bold text-[#0b244e]">
                      {socialSecurityNumber}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <IdCard className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">
                      الرقم التعريفي الوطني (NIN):
                    </span>
                    <span className="font-mono-tabular font-bold text-[#0b244e]">
                      {member.nationalId}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b244e] border border-[#c59b43] text-[#e6c26e] flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-bold text-slate-900 min-w-[140px]">
                      الولاية / البلدية:
                    </span>
                    <span className="font-semibold text-[#0b244e]">
                      {member.city} — البلدية: {municipality}
                    </span>
                  </div>
                </div>

                {/* Footer: Member Signature + Official Branch Seal + Electronic QR */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900">
                      <PenTool className="w-4 h-4 text-[#0b244e]" aria-hidden="true" />
                      <span>إمضاء المنخرط</span>
                    </div>
                    <div className="w-32 h-9 border-b border-dashed border-slate-400" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-900">
                        ختم وتوقيع رئيس الفرع / التعاضدية
                      </p>
                      <div className="w-16 h-16 mx-auto rounded-full border-2 border-blue-700/80 flex flex-col items-center justify-center text-[9px] font-bold text-blue-800 bg-blue-50/30">
                        <span>MUTNATEC</span>
                        <span className="font-mono-tabular">96 / 04</span>
                      </div>
                    </div>

                    {qrDataUrl && (
                      <div className="bg-white border border-slate-200 rounded-lg p-1.5 shrink-0">
                        <img
                          src={qrDataUrl}
                          alt="رمز التحقق الإلكتروني QR"
                          className="w-16 h-16"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
                  الجمهورية الجزائرية الديمقراطية الشعبية · اعتماد رقم 96 / 04
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
              السيد(ة) <strong>{member.fullName}</strong>، المولود(ة) في{' '}
              <span className="font-mono-tabular font-semibold">{birthDisplay}</span>،
              والحامل(ة) للرقم التعريفي الوطني{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {member.nationalId}
              </span>{' '}
              ورقم الضمان الاجتماعي{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {socialSecurityNumber}
              </span>
              ، منخرط(ة) بصفة نظامية تحت رقم البطاقة{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {member.membershipNumber}
              </span>{' '}
              بصفته <strong>{jobTitle}</strong> بمقر العمل <strong>{institution}</strong>{' '}
              (ولاية <strong>{member.city}</strong> — بلدية <strong>{municipality}</strong>).
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

          <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="رمز التحقق الإلكتروني QR"
                  className="w-16 h-16 border border-slate-200 rounded-md p-0.5"
                />
              )}
              <div>
                <p>
                  مرجع التحقق الإلكتروني:{' '}
                  <strong className="font-mono-tabular text-slate-800">
                    {verificationCode}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  امسح الرمز للتحقق الفوري عبر بوابة التعاضدية
                </p>
              </div>
            </div>
            <span>صالحة للسنة المالية {enrollmentYear}</span>
          </div>
        </div>
      )}
    </div>
  );
}
