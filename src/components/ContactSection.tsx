import { useState } from 'react';
import { Check, Copy, ExternalLink, MessageSquare, UserCheck } from 'lucide-react';
import { CONTACT_REPRESENTATIVE, getSafeExternalUrl } from '../data/mutualCatalog';
import { BrandImage } from './BrandImage';

export function ContactSection() {
  const [copied, setCopied] = useState(false);
  const safeFacebookUrl = getSafeExternalUrl(CONTACT_REPRESENTATIVE.facebookUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_REPRESENTATIVE.facebookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="bg-white border-t border-slate-200 py-12"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-medium text-slate-500">
            التواصل المباشر وخدمة المنخرطين
          </p>
          <h2 id="contact-heading" className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            الاتصال بنا والاستفسار المباشر
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6">
            <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <BrandImage
                src={CONTACT_REPRESENTATIVE.imagePath}
                alt={`${CONTACT_REPRESENTATIVE.name} — ${CONTACT_REPRESENTATIVE.role}`}
                fallbackLabel={CONTACT_REPRESENTATIVE.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>التمثيل الوطني والتواصل الرسمي</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {CONTACT_REPRESENTATIVE.name}
                </h3>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  {CONTACT_REPRESENTATIVE.role}
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                لطرح استفساراتكم حول دليل المزايا والأداءات 2026، شروط تكوين الملف
                القاعدي، متابعة ملفات التعويضات، أو الاستعلام عن عناوين المقرات الولائية
                عبر الوطن، يمكنكم التواصل مباشرة عبر الحساب الرسمي على فيسبوك داخل
                مجموعة التعاضدية.
              </p>

              <div className="pt-2 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">رابط التواصل الرسمي على فيسبوك:</p>
                <p
                  className="font-mono-tabular text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 break-all"
                  dir="ltr"
                >
                  {CONTACT_REPRESENTATIVE.facebookUrl}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {safeFacebookUrl && (
                <a
                  href={safeFacebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>التواصل عبر فيسبوك</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </a>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span className="text-emerald-700">تم نسخ الرابط</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>نسخ رابط التواصل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
