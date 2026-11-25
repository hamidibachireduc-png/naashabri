import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Phone,
  RefreshCw,
  Save,
  Search,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { EMBLEM_IMAGE_PATH, formatCurrency } from '../data/mutualCatalog';
import {
  changeWilayaHeadPassword,
  exportWilayaBackupBlob,
  exportWilayaExcelBlob,
  fetchWilayaHeadWorkspace,
  importWilayaExcelDatabase,
  restoreWilayaBackup,
  updateWilayaHeadProfile,
} from '../lib/internalApi';
import type {
  MedicalClaim,
  PublicWilayaMapEntry,
  WilayaHeadAccount,
  WilayaHeadWorkspaceData,
} from '../types/mutual';
import { BrandImage } from './BrandImage';
import { ClaimProcessingTimeline } from './ClaimProcessingTimeline';
import { ClaimsStatusPieChart } from './ClaimsStatusPieChart';
import { StatusLabel } from './StatusLabel';
import { WilayaInteractiveMap } from './WilayaInteractiveMap';
import { WilayaOfficesDirectory } from './WilayaOfficesDirectory';

interface WilayaHeadWorkspaceProps {
  token: string;
  initialAccount: WilayaHeadAccount;
  onSignOut: () => void;
}

type WilayaHeadSection =
  | 'overview'
  | 'profile'
  | 'members'
  | 'claims'
  | 'enrollments'
  | 'backup'
  | 'network_map';

export function WilayaHeadWorkspace({
  token,
  initialAccount,
  onSignOut,
}: WilayaHeadWorkspaceProps) {
  const [section, setSection] = useState<WilayaHeadSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WilayaHeadWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  // Editable profile fields
  const [fullName, setFullName] = useState(initialAccount.fullName);
  const [title, setTitle] = useState(initialAccount.title);
  const [phone, setPhone] = useState(initialAccount.phone);
  const [email, setEmail] = useState(initialAccount.email);
  const [officeName, setOfficeName] = useState(initialAccount.officeName);
  const [accountInfo, setAccountInfo] = useState(initialAccount.accountInfo);
  const [socialUrl, setSocialUrl] = useState(initialAccount.socialUrl);
  const [address, setAddress] = useState(initialAccount.address);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialAccount.googleMapsUrl);
  const [secondaryMapsUrl, setSecondaryMapsUrl] = useState(
    initialAccount.secondaryMapsUrl || ''
  );
  const [latStr, setLatStr] = useState(
    typeof initialAccount.lat === 'number' ? String(initialAccount.lat) : ''
  );
  const [lngStr, setLngStr] = useState(
    typeof initialAccount.lng === 'number' ? String(initialAccount.lng) : ''
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Search & Timeline inspection
  const [memberSearch, setMemberSearch] = useState('');
  const [timelineClaim, setTimelineClaim] = useState<MedicalClaim | null>(null);

  // Per-wilaya JSON Backup / Restore & Excel Export / Import
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [backupRestoreMode, setBackupRestoreMode] = useState<'merge' | 'replace_wilaya'>('merge');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelImportMode, setExcelImportMode] = useState<'merge' | 'replace_wilaya'>('merge');
  const backupFileRef = useRef<HTMLInputElement | null>(null);
  const excelFileRef = useRef<HTMLInputElement | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchWilayaHeadWorkspace(token);
      setWorkspace(data);
      const acc = data.account;
      setFullName(acc.fullName);
      setTitle(acc.title);
      setPhone(acc.phone);
      setEmail(acc.email);
      setOfficeName(acc.officeName);
      setAccountInfo(acc.accountInfo);
      setSocialUrl(acc.socialUrl);
      setAddress(acc.address);
      setGoogleMapsUrl(acc.googleMapsUrl);
      setSecondaryMapsUrl(acc.secondaryMapsUrl || '');
      setLatStr(typeof acc.lat === 'number' ? String(acc.lat) : '');
      setLngStr(typeof acc.lng === 'number' ? String(acc.lng) : '');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل بيانات التعاضدية الولائية.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const activeAccount = workspace?.account || initialAccount;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');
    setSavingProfile(true);
    try {
      const parsedLat = latStr.trim() ? Number(latStr.trim()) : undefined;
      const parsedLng = lngStr.trim() ? Number(lngStr.trim()) : undefined;
      await updateWilayaHeadProfile(token, {
        fullName: fullName.trim(),
        title: title.trim(),
        phone: phone.trim(),
        email: email.trim(),
        officeName: officeName.trim(),
        accountInfo: accountInfo.trim(),
        socialUrl: socialUrl.trim(),
        address: address.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        secondaryMapsUrl: secondaryMapsUrl.trim(),
        lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
        lng: Number.isFinite(parsedLng) ? parsedLng : undefined,
      });
      setNoticeMsg('تم تحديث بيانات رئيس التعاضدية الولائية والمقر وإحداثيات الخريطة بنجاح.');
      await loadWorkspace();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حفظ التغييرات.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');
    setSavingPassword(true);
    try {
      await changeWilayaHeadPassword(token, currentPassword.trim(), newPassword.trim());
      setCurrentPassword('');
      setNewPassword('');
      setNoticeMsg('تم تحديث كلمة المرور بنجاح.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تغيير كلمة المرور.');
    } finally {
      setSavingPassword(false);
    }
  };

  const syncFormFieldsFromWorkspace = (data: WilayaHeadWorkspaceData) => {
    const acc = data.account;
    setFullName(acc.fullName);
    setTitle(acc.title);
    setPhone(acc.phone);
    setEmail(acc.email);
    setOfficeName(acc.officeName);
    setAccountInfo(acc.accountInfo);
    setSocialUrl(acc.socialUrl);
    setAddress(acc.address);
    setGoogleMapsUrl(acc.googleMapsUrl);
    setSecondaryMapsUrl(acc.secondaryMapsUrl || '');
    setLatStr(typeof acc.lat === 'number' ? String(acc.lat) : '');
    setLngStr(typeof acc.lng === 'number' ? String(acc.lng) : '');
  };

  const handleExportBackup = async () => {
    setErrorMsg('');
    setNoticeMsg('');
    setExportingBackup(true);
    try {
      const blob = await exportWilayaBackupBlob(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MUTNATEC-Wilaya-${activeAccount.wilayaCode}-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNoticeMsg(
        `تم حفظ وتنزيل النسخة الاحتياطية الكاملة لولاية ${activeAccount.wilayaName} (${activeAccount.wilayaCode}) بنجاح.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تصدير النسخة الاحتياطية للولاية.');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMsg('يرجى اختيار ملف نسخة احتياطية بصيغة JSON فقط.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('حجم ملف النسخة الاحتياطية يجب أن لا يتجاوز 4 ميغابايت.');
      return;
    }

    setRestoringBackup(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('ملف النسخة الاحتياطية غير صالح (صيغة JSON غير صحيحة).');
      }

      const res = await restoreWilayaBackup(token, parsed, backupRestoreMode);
      setWorkspace(res.workspace);
      syncFormFieldsFromWorkspace(res.workspace);
      setNoticeMsg(
        `تمت استعادة بيانات ولاية ${activeAccount.wilayaName} بنجاح: ${res.restored.membersCount} منخرط، ${res.restored.dependentsCount} ذوي حقوق، ${res.restored.claimsCount} ملف مرض، ${res.restored.authorizationsCount} تكفل، ${res.restored.enrollmentsCount} طلب انخراط.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر استعادة النسخة الاحتياطية للولاية.');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleExportWilayaExcel = async () => {
    setErrorMsg('');
    setNoticeMsg('');
    setExportingExcel(true);
    try {
      const blob = await exportWilayaExcelBlob(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MUTNATEC-Wilaya-${activeAccount.wilayaCode}-Members.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNoticeMsg(
        `تم تصدير قاعدة بيانات Excel الخاصة بمنخرطي ولاية ${activeAccount.wilayaName} (${activeAccount.wilayaCode}) بنجاح.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تحميل ملف Excel للولاية.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleImportWilayaExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMsg('يرجى اختيار ملف Excel بصيغة (.xlsx) فقط.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('حجم ملف Excel يجب أن لا يتجاوز 4 ميغابايت.');
      return;
    }

    setImportingExcel(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('تعذر قراءة الملف من الجهاز.'));
        reader.readAsDataURL(file);
      });

      const res = await importWilayaExcelDatabase(token, {
        fileBase64,
        mode: excelImportMode,
      });
      setWorkspace(res.workspace);
      syncFormFieldsFromWorkspace(res.workspace);
      setNoticeMsg(
        `تمت استعادة وتحديث ${res.importedCount} منخرط لولاية ${activeAccount.wilayaName} ومزامنة المخزن الوطني تلقائياً.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر استيراد ملف Excel للولاية.');
    } finally {
      setImportingExcel(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const list = workspace?.members || [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.membershipNumber.toLowerCase().includes(q) ||
        (m.municipality || '').toLowerCase().includes(q) ||
        (m.institution || '').toLowerCase().includes(q)
    );
  }, [workspace?.members, memberSearch]);

  const ownMapEntry: PublicWilayaMapEntry[] = useMemo(() => {
    const parsedLat = latStr.trim() ? Number(latStr.trim()) : activeAccount.lat;
    const parsedLng = lngStr.trim() ? Number(lngStr.trim()) : activeAccount.lng;
    return [
      {
        code: activeAccount.wilayaCode,
        wilayaName: activeAccount.wilayaName,
        officeName,
        representativeName: fullName,
        headTitle: title,
        headUsername: activeAccount.username,
        headStatus: activeAccount.status,
        hasActiveAccount: true,
        phone,
        email,
        accountInfo,
        socialUrl,
        address,
        googleMapsUrl,
        secondaryMapsUrl,
        lat: typeof parsedLat === 'number' && Number.isFinite(parsedLat) ? parsedLat : undefined,
        lng: typeof parsedLng === 'number' && Number.isFinite(parsedLng) ? parsedLng : undefined,
        updatedAt: activeAccount.updatedAt,
      },
    ];
  }, [
    activeAccount,
    officeName,
    fullName,
    title,
    phone,
    email,
    accountInfo,
    socialUrl,
    address,
    googleMapsUrl,
    secondaryMapsUrl,
    latStr,
    lngStr,
  ]);

  const navItems: Array<{
    id: WilayaHeadSection;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'overview', label: 'لوحة الولاية والخريطة', icon: LayoutDashboard },
    { id: 'profile', label: 'تحديث بيانات المقر والحساب', icon: Building2 },
    { id: 'members', label: 'منخرطو الولاية', icon: Users },
    { id: 'claims', label: 'ملفات المرض بالولاية', icon: FileText },
    { id: 'enrollments', label: 'طلبات الانخراط بالولاية', icon: UserPlus },
    { id: 'backup', label: 'الحفظ والاستعادة والمخزن', icon: Database },
    { id: 'network_map', label: 'خريطة الرؤساء عبر الوطن (96)', icon: MapPinned },
  ];

  const sectionTitle =
    navItems.find((item) => item.id === section)?.label || 'لوحة رئيس التعاضدية الولائية';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="no-print hidden lg:flex lg:flex-col w-64 bg-white border-l border-slate-200 shrink-0 sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-slate-200 flex items-center gap-3">
          <BrandImage
            src={EMBLEM_IMAGE_PATH}
            alt="شعار التعاضدية الوطنية لعمال التربية والثقافة"
            fallbackLabel="MUTNATEC"
            className="w-10 h-10 rounded-full object-contain bg-white border border-slate-200 shrink-0"
          />
          <span className="font-display font-bold text-sm text-slate-900 whitespace-nowrap truncate">
            التعاضدية الوطنية
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">
              {activeAccount.fullName || `رئيس ولاية ${activeAccount.wilayaName}`}
            </p>
            <p className="font-mono-tabular text-slate-500 mt-0.5">
              {activeAccount.wilayaCode} — {activeAccount.wilayaName}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/50 flex">
          <div className="w-72 bg-white h-full flex flex-col border-l border-slate-200">
            <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display font-bold text-base text-slate-900">
                التعاضدية الوطنية
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg cursor-pointer ${
                      active
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="فتح القائمة"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-emerald-700 font-semibold hidden sm:inline">
                رئيس التعاضدية الولائية ({activeAccount.wilayaCode} — {activeAccount.wilayaName})
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-bold text-slate-900 truncate">{sectionTitle}</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {errorMsg && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}
          {noticeMsg && (
            <div className="p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {noticeMsg}
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              جاري تحميل فضاء رئيس التعاضدية الولائية...
            </div>
          ) : section === 'overview' && workspace ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">منخرطو الولاية</p>
                  <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                    {workspace.stats.membersCount}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    نشط: {workspace.stats.activeMembersCount}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">ملفات المرض بالولاية</p>
                  <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                    {workspace.stats.claimsCount}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    قيد الدراسة: {workspace.stats.pendingClaimsCount}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">التعويضات المعتمدة</p>
                  <p className="text-2xl font-bold font-mono-tabular text-emerald-700 mt-1">
                    {formatCurrency(workspace.stats.totalApprovedAmount)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">طلبات الانخراط الفردي</p>
                  <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                    {workspace.stats.enrollmentsCount}
                  </p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    قيد التدقيق: {workspace.stats.pendingEnrollmentsCount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-xs font-mono-tabular text-slate-500">
                        حساب رئيس ولاية رقم {activeAccount.wilayaCode}
                      </p>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {activeAccount.wilayaName}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('profile')}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      تعديل البيانات
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">
                          {activeAccount.fullName || 'يرجى استكمال الاسم الكامل'}
                        </p>
                        <p className="text-slate-500">{activeAccount.title}</p>
                      </div>
                    </div>
                    {activeAccount.officeName && (
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{activeAccount.officeName}</span>
                      </div>
                    )}
                    {activeAccount.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-mono-tabular" dir="ltr">
                          {activeAccount.phone}
                        </span>
                      </div>
                    )}
                    {activeAccount.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{activeAccount.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4">
                  <WilayaInteractiveMap
                    entries={ownMapEntry}
                    selectedCode={activeAccount.wilayaCode}
                    heightClassName="h-[340px]"
                  />
                </div>
              </div>

              <ClaimsStatusPieChart
                claims={workspace.claims}
                title={`توزيع ملفات المرض في ولاية ${activeAccount.wilayaName} حسب الحالة`}
                subtitle="توزيع ملفات الولاية بين: قيد الدراسة، مقبول، مرفوض"
              />

              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-slate-900">
                      حفظ واستعادة بيانات ولاية {activeAccount.wilayaName} ومزامنة المخزن الوطني
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    يمكنك تنزيل نسخة احتياطية كاملة للولاية أو تصدير سجل منخرطيها بصيغة Excel، مع
                    مزامنة فورية لبيانات الولاية داخل المخزن الوطني الموحد (96 ولاية).
                  </p>
                  {workspace.warehouseSync?.lastSyncedAt && (
                    <p className="text-[11px] font-mono-tabular text-slate-500">
                      آخر مزامنة مع المخزن الوطني:{' '}
                      {workspace.warehouseSync.lastSyncedAt.slice(0, 19).replace('T', ' ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={exportingBackup}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{exportingBackup ? 'جاري الحفظ...' : 'نسخة احتياطية (JSON)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportWilayaExcel}
                    disabled={exportingExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{exportingExcel ? 'جاري التصدير...' : 'Excel الولاية (.xlsx)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection('backup')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer"
                  >
                    <span>إدارة الاستعادة</span>
                  </button>
                </div>
              </div>
            </div>
          ) : section === 'profile' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveProfile}
                className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900">
                  تحديث بيانات رئيس التعاضدية والمقر الولائي
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الاسم الكامل للرئيس الولائي
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الصفة الرسمية
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الهاتف
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      اسم المقر الولائي
                    </label>
                    <input
                      type="text"
                      value={officeName}
                      onChange={(e) => setOfficeName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الحسابات (CCP / RIB)
                    </label>
                    <input
                      type="text"
                      value={accountInfo}
                      onChange={(e) => setAccountInfo(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    العنوان التفصيلي للمقر
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      رابط خرائط قوقل
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      رابط الحساب الرسمي
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={socialUrl}
                      onChange={(e) => setSocialUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      تحديد موقع المقر على الخريطة التفاعلية
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        dir="ltr"
                        value={latStr}
                        onChange={(e) => setLatStr(e.target.value)}
                        placeholder="Lat"
                        className="w-24 px-2 py-1 text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={lngStr}
                        onChange={(e) => setLngStr(e.target.value)}
                        placeholder="Lng"
                        className="w-24 px-2 py-1 text-xs font-mono-tabular bg-white border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <WilayaInteractiveMap
                    entries={ownMapEntry}
                    pickerMode={true}
                    pickedLat={latStr ? Number(latStr) : undefined}
                    pickedLng={lngStr ? Number(lngStr) : undefined}
                    onPickCoords={(lat, lng, formattedAddr) => {
                      setLatStr(String(lat));
                      setLngStr(String(lng));
                      if (formattedAddr && !address.trim()) setAddress(formattedAddr);
                    }}
                    heightClassName="h-[260px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'جاري الحفظ...' : 'حفظ ونشر البيانات على الخريطة'}</span>
                </button>
              </form>

              <form
                onSubmit={handleChangePassword}
                className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4 self-start"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">تغيير كلمة المرور</h3>
                </div>
                <p className="text-xs text-slate-500">
                  اسم المستخدم:{' '}
                  <strong className="font-mono-tabular text-slate-800">
                    {activeAccount.username}
                  </strong>
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    كلمة المرور الحالية
                  </label>
                  <input
                    type="password"
                    required
                    dir="ltr"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    كلمة المرور الجديدة (6 أحرف على الأقل)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                >
                  {savingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </button>
              </form>
            </div>
          ) : section === 'members' && workspace ? (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="ابحث في منخرطي الولاية بالاسم، رقم الانخراط، رقم التعريف الوطني، البلدية أو المؤسسة..."
                    className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportWilayaExcel}
                  disabled={exportingExcel}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                  <span>{exportingExcel ? 'جاري التصدير...' : 'تصدير سجل الولاية (.xlsx)'}</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {filteredMembers.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    لا يوجد منخرطون مسجلون حالياً ضمن نطاق ولاية {activeAccount.wilayaName}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4">رقم الانخراط والهوية</th>
                          <th className="py-3 px-4">المنخرط والرتبة</th>
                          <th className="py-3 px-4">البلدية والمؤسسة</th>
                          <th className="py-3 px-4">الاتصال والحساب البنكي</th>
                          <th className="py-3 px-4">الصيغة والسقف السنوي</th>
                          <th className="py-3 px-4">الوضعية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredMembers.map((m) => (
                          <tr key={m.membershipNumber} className="hover:bg-slate-50/80 align-top">
                            <td className="py-3 px-4 font-mono-tabular text-xs">
                              <div className="font-semibold text-slate-900">
                                {m.membershipNumber}
                              </div>
                              <div className="text-slate-500 mt-0.5">
                                NIN: {m.nationalId || '—'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {m.gender || '—'} · أقدمية {m.seniorityYears} س
                                {m.enrollmentYear ? ` (${m.enrollmentYear})` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{m.fullName}</div>
                              <div className="text-xs text-slate-500">{m.jobTitle || m.sector}</div>
                              <div className="text-[11px] text-slate-500">{m.sector}</div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="text-slate-900 font-medium">
                                {m.municipality || m.city}
                              </div>
                              <div className="text-slate-500">{m.institution || '—'}</div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="font-mono-tabular text-slate-800" dir="ltr">
                                {m.phone || '—'}
                              </div>
                              <div className="font-mono-tabular text-slate-500 mt-0.5" dir="ltr">
                                {m.email || '—'}
                              </div>
                              <div className="font-mono-tabular text-[11px] text-slate-500 mt-0.5" dir="ltr">
                                RIB: {m.rib || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="font-medium text-slate-900">{m.coveragePlan}</div>
                              <div className="font-mono-tabular text-emerald-700 font-semibold mt-0.5">
                                {formatCurrency(m.annualCeiling)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <StatusLabel status={m.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : section === 'claims' && workspace ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {workspace.claims.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  لا توجد ملفات مرض مسجلة حالياً ضمن نطاق ولاية {activeAccount.wilayaName}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">المرجع</th>
                        <th className="py-3 px-4">المنخرط</th>
                        <th className="py-3 px-4">الأداء</th>
                        <th className="py-3 px-4 text-left">المبلغ</th>
                        <th className="py-3 px-4 text-left">المعتمد</th>
                        <th className="py-3 px-4">الوضعية</th>
                        <th className="py-3 px-4">مسار الملف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {workspace.claims.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono-tabular text-xs">{c.referenceCode}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{c.memberName}</div>
                            <div className="text-xs font-mono-tabular text-slate-500">
                              {c.membershipNumber}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs">{c.careType}</td>
                          <td className="py-3 px-4 font-mono-tabular text-left">
                            {formatCurrency(c.totalAmount)}
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-emerald-700 font-semibold text-left">
                            {formatCurrency(c.approvedAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusLabel status={c.status} />
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setTimelineClaim(c)}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                            >
                              المسار
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : section === 'enrollments' && workspace ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {workspace.enrollments.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  لا توجد طلبات انخراط فردي مسجلة حالياً في ولاية {activeAccount.wilayaName}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">رقم التتبع</th>
                        <th className="py-3 px-4">المترشح</th>
                        <th className="py-3 px-4">البلدية والمؤسسة</th>
                        <th className="py-3 px-4">الهاتف</th>
                        <th className="py-3 px-4">الوضعية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {workspace.enrollments.map((enr) => (
                        <tr key={enr.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono-tabular text-xs font-semibold">
                            {enr.trackingCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{enr.fullName}</div>
                            <div className="text-xs text-slate-500">{enr.coveragePlan}</div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <div>{enr.municipality || enr.city}</div>
                            <div className="text-slate-500">{enr.workplace}</div>
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-xs" dir="ltr">
                            {enr.phone}
                          </td>
                          <td className="py-3 px-4">
                            <StatusLabel status={enr.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : section === 'backup' && workspace ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card 1: Complete Wilaya JSON Backup & Restore */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg text-slate-800 shrink-0">
                      <HardDriveDownload className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        الحفظ والاستعادة الكاملة لبيانات الولاية (JSON)
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        احفظ نسخة احتياطية كاملة تخص ولاية{' '}
                        <strong>
                          {activeAccount.wilayaName} ({activeAccount.wilayaCode})
                        </strong>{' '}
                        تشمل بيانات المقر، حساب الرئيس، المنخرطين، ذوي الحقوق، ملفات المرض، طلبات
                        التكفل وطلبات الانخراط الفردي، مع إمكانية استعادتها في أي وقت.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-[11px] text-slate-500">المنخرطون</p>
                      <p className="text-base font-bold font-mono-tabular text-slate-900">
                        {workspace.stats.membersCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">ملفات المرض</p>
                      <p className="text-base font-bold font-mono-tabular text-slate-900">
                        {workspace.stats.claimsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">المنخرطون النشطون</p>
                      <p className="text-base font-bold font-mono-tabular text-emerald-700">
                        {workspace.stats.activeMembersCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">طلبات الانخراط</p>
                      <p className="text-base font-bold font-mono-tabular text-slate-900">
                        {workspace.stats.enrollmentsCount}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={exportingBackup}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {exportingBackup
                          ? 'جاري إعداد النسخة الاحتياطية...'
                          : `حفظ وتنزيل نسخة الولاية (${activeAccount.wilayaCode} — JSON)`}
                      </span>
                    </button>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        وضع الاستعادة عند رفع ملف النسخة الاحتياطية:
                      </label>
                      <select
                        value={backupRestoreMode}
                        onChange={(e) =>
                          setBackupRestoreMode(e.target.value as 'merge' | 'replace_wilaya')
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                      >
                        <option value="merge">
                          دمج وتحديث سجلات ولاية {activeAccount.wilayaName} (يحافظ على السجلات القائمة)
                        </option>
                        <option value="replace_wilaya">
                          استبدال كامل بيانات ولاية {activeAccount.wilayaName} من النسخة
                        </option>
                      </select>

                      <input
                        ref={backupFileRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleRestoreBackupFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => backupFileRef.current?.click()}
                        disabled={restoringBackup}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-900 cursor-pointer disabled:opacity-60"
                      >
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {restoringBackup
                            ? 'جاري استعادة بيانات الولاية...'
                            : 'استعادة بيانات الولاية من ملف JSON'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    حماية الصلاحيات: يتحقق الخادم من رمز الولاية ({activeAccount.wilayaCode}) ويرفض
                    استيراد أي ملف يخص ولاية أخرى، كما تبقى رموز الدخول السرية للمنخرطين وكلمات
                    المرور محمية ولا تُصدر داخل ملفات النسخ الاحتياطي.
                  </p>
                </div>

                {/* Card 2: Wilaya Excel Export/Import & National Warehouse Sync */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        ملف Excel الخاص بالولاية والمخزن الوطني (.xlsx)
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        تصدير واستيراد قاعدة بيانات منخرطي ولاية{' '}
                        <strong>{activeAccount.wilayaName}</strong> بصيغة Excel، مع مزامنة تلقائية
                        داخل ملف المخزن الوطني للمنخرطين حسب الولايات (96 ولاية).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        حالة المزامنة مع المخزن الوطني
                      </span>
                      <span className="font-mono-tabular text-[11px] px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-800">
                        متصل آلياً
                      </span>
                    </div>
                    <p className="text-slate-700 font-mono-tabular">
                      الملف الوطني: <strong>{workspace.warehouseSync?.fileName || 'national-members-warehouse.xlsx'}</strong>
                    </p>
                    {workspace.warehouseSync?.lastSyncedAt && (
                      <p className="text-slate-600 font-mono-tabular">
                        آخر تحديث:{' '}
                        {workspace.warehouseSync.lastSyncedAt.slice(0, 19).replace('T', ' ')} · إجمالي
                        منخرطي المخزن: {workspace.warehouseSync.nationalTotalMembers}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={handleExportWilayaExcel}
                      disabled={exportingExcel}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {exportingExcel
                          ? 'جاري تجهيز ملف Excel...'
                          : `تحميل سجل ولاية ${activeAccount.wilayaName} بصيغة Excel (.xlsx)`}
                      </span>
                    </button>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        استعادة أو استيراد منخرطي الولاية من ملف Excel (.xlsx):
                      </label>
                      <select
                        value={excelImportMode}
                        onChange={(e) =>
                          setExcelImportMode(e.target.value as 'merge' | 'replace_wilaya')
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                      >
                        <option value="merge">
                          دمج وتحديث منخرطي الولاية من ملف Excel
                        </option>
                        <option value="replace_wilaya">
                          استبدال سجل منخرطي الولاية من ملف Excel
                        </option>
                      </select>

                      <input
                        ref={excelFileRef}
                        type="file"
                        accept=".xlsx"
                        onChange={handleImportWilayaExcel}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => excelFileRef.current?.click()}
                        disabled={importingExcel}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 cursor-pointer disabled:opacity-60"
                      >
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {importingExcel
                            ? 'جاري قراءة واستعادة ملف Excel...'
                            : 'رفع واستعادة من ملف Excel الولاية (.xlsx)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : section === 'network_map' ? (
            <WilayaOfficesDirectory />
          ) : null}
        </main>
      </div>

      {timelineClaim && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                مسار معالجة الملف — {timelineClaim.referenceCode}
              </h3>
              <button
                type="button"
                onClick={() => setTimelineClaim(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ClaimProcessingTimeline claim={timelineClaim} />
          </div>
        </div>
      )}
    </div>
  );
}
