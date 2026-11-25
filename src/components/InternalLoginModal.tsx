import { useState } from 'react';
import { Eye, EyeOff, FileKey2, Lock, LogIn, ShieldCheck, UserCheck, X } from 'lucide-react';
import { EMBLEM_IMAGE_PATH } from '../data/mutualCatalog';
import { loginAdminAccount, loginInternalMember } from '../lib/internalApi';
import type { MemberProfile } from '../types/mutual';
import { BrandImage } from './BrandImage';

export type LoginModalMode = 'internal' | 'google' | 'admin';

interface InternalLoginModalProps {
  initialMode?: LoginModalMode;
  onClose: () => void;
  onGoogleSignIn: () => void;
  googleSigningIn: boolean;
  onInternalSuccess: (token: string, member: MemberProfile) => void;
  onAdminSuccess: (token: string, username: string) => void;
}

export function InternalLoginModal({
  initialMode = 'internal',
  onClose,
  onGoogleSignIn,
  googleSigningIn,
  onInternalSuccess,
  onAdminSuccess,
}: InternalLoginModalProps) {
  const [mode, setMode] = useState<LoginModalMode>(initialMode);
  const [membershipNumber, setMembershipNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await loginInternalMember(membershipNumber.trim(), accessCode.trim());
      onInternalSuccess(res.token, res.member);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تسجيل الدخول بالملف الداخلي.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await loginAdminAccount(adminUsername.trim(), adminPassword.trim());
      onAdminSuccess(res.token, res.username);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر التحقق من بيانات مدير الموقع.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="تسجيل الدخول إلى البوابة"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandImage
              src={EMBLEM_IMAGE_PATH}
              alt="شعار التعاضدية الوطنية"
              fallbackLabel="MUTNATEC"
              className="w-9 h-9 rounded-full object-contain border border-slate-200 shrink-0"
            />
            <h2 className="text-base font-bold text-slate-900">
              {mode === 'admin' ? 'دخول مدير البوابة' : 'دخول فضاء المنخرط'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('internal');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'internal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الملف الداخلي
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('google');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'google'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              حساب Google
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('admin');
                setErrorMsg('');
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دخول المدير
            </button>
          </div>

          {mode === 'internal' && (
            <form onSubmit={handleInternalSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رقم الانخراط التعاضدي
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={membershipNumber}
                  onChange={(e) => setMembershipNumber(e.target.value)}
                  placeholder="مثال: MUT-2026-1001"
                  dir="ltr"
                  className="w-full px-3 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رمز الدخول الخاص
                </label>
                <div className="relative">
                  <input
                    type={showAccessCode ? 'text' : 'password'}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full pl-10 pr-3 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode((v) => !v)}
                    aria-label={showAccessCode ? 'إخفاء رمز الدخول' : 'إظهار رمز الدخول'}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileKey2 className="w-3.5 h-3.5 text-blue-800" aria-hidden="true" />
                  <span>التحقق عبر الملف الداخلي المدار من طرف الإدارة</span>
                </p>
                <p>
                  يُمنح رقم الانخراط ورمز الدخول للمنخرط عبر مصالح التعاضدية الوطنية.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'جاري التحقق...' : 'دخول إلى فضاء المنخرط'}</span>
              </button>
            </form>
          )}

          {mode === 'google' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2 leading-relaxed">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-800" aria-hidden="true" />
                  <span>الدخول السحابي للمنخرطين عبر حساب Google</span>
                </p>
                <p>
                  مخصص للمنخرطين الراغبين في مزامنة ملفاتهم الطبية وطلبات التكفل عبر الحساب السحابي.
                </p>
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={googleSigningIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {googleSigningIn ? 'جاري فتح نافذة Google...' : 'متابعة عبر حساب Google'}
                </span>
              </button>
            </div>
          )}

          {mode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <UserCheck
                    className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="habrinaas"
                    dir="ltr"
                    className="w-full pr-9 pl-3 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الرقم السري
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full pr-9 pl-10 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    aria-label={showAdminPassword ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-800" aria-hidden="true" />
                  <span>بوابة إدارة مستقلة تماماً عن حسابات Google</span>
                </p>
                <p>
                  تتيح لمدير الموقع مراقبة الملفات، اعتماد التعويضات، وإدارة الملف الداخلي للمنخرطين.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'جاري التحقق...' : 'دخول إلى لوحة الإدارة'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
