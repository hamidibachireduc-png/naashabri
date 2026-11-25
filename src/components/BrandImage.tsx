import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface BrandImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function BrandImage({ src, alt, className = '', fallbackLabel }: BrandImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
        role="img"
        aria-label={alt}
      >
        <ShieldCheck className="w-7 h-7 text-emerald-700" aria-hidden="true" />
        {fallbackLabel && (
          <span className="mt-1.5 text-xs font-medium text-slate-700 px-2 text-center">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
