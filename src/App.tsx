import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  BookOpen,
  Building2,
  Calculator,
  ClipboardCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  PhoneCall,
  Plus,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { EMBLEM_IMAGE_PATH } from './data/mutualCatalog';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { fetchInternalWorkspace } from './lib/internalApi';
import type {
  AuthSessionMode,
  AuthorizationRequest,
  CareType,
  Dependent,
  MedicalClaim,
  MemberProfile,
} from './types/mutual';
import { AdminReviewPanel } from './components/AdminReviewPanel';
import { AuthorizationsManager } from './components/AuthorizationsManager';
import { BenefitsCatalog } from './components/BenefitsCatalog';
import { BrandImage } from './components/BrandImage';
import { CardQrVerifyPage } from './components/CardQrVerifyPage';
import { ClaimsManager } from './components/ClaimsManager';
import { ContactSection } from './components/ContactSection';
import { DashboardOverview, type WorkspaceSection } from './components/DashboardOverview';
import { DependentsManager } from './components/DependentsManager';
import { DigitalCardExtractor } from './components/DigitalCardExtractor';
import { DigitalCardModal } from './components/DigitalCardModal';
import { InternalLoginModal, type LoginModalMode } from './components/InternalLoginModal';
import { MemberOnboarding } from './components/MemberOnboarding';
import { ProfileSettings } from './components/ProfileSettings';
import { ProvidersDirectory } from './components/ProvidersDirectory';
import { PublicPortal } from './components/PublicPortal';
import { SimulatorAndGuide } from './components/SimulatorAndGuide';
import { WilayaOfficesDirectory } from './components/WilayaOfficesDirectory';

export default function App() {
  const [verifyCardParams, setVerifyCardParams] = useState<{
    m: string;
    sig: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const m = params.get('verifyCard')?.trim() || '';
    const sig = params.get('sig')?.trim() || '';
    return m && sig ? { m, sig } : null;
  });

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // In-memory Bearer tokens (never written to localStorage/sessionStorage)
  const [internalToken, setInternalToken] = useState<string>('');
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [loginModalMode, setLoginModalMode] = useState<LoginModalMode | null>(null);
  const [postLoginSection, setPostLoginSection] = useState<WorkspaceSection>('overview');

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [memberLoaded, setMemberLoaded] = useState(false);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [claims, setClaims] = useState<MedicalClaim[]>([]);
  const [authorizations, setAuthorizations] = useState<AuthorizationRequest[]>([]);

  const [section, setSection] = useState<WorkspaceSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cardModalMode, setCardModalMode] = useState<'card' | 'attestation' | null>(
    null
  );
  const [newClaimSignal, setNewClaimSignal] = useState(0);
  const [preselectedCareType, setPreselectedCareType] = useState<CareType | undefined>(
    undefined
  );

  const isAdminSession = Boolean(adminToken && adminUsername);
  const memberSessionMode: AuthSessionMode | null = user
    ? 'firebase'
    : internalToken && member
    ? 'internal'
    : null;

  const refreshInternalWorkspace = useCallback(
    async (tokenOverride?: string) => {
      const tokenToUse = tokenOverride ?? internalToken;
      if (!tokenToUse) return;
      try {
        const data = await fetchInternalWorkspace(tokenToUse);
        setMember(data.member);
        setDependents(data.dependents);
        const sortedClaims = [...data.claims].sort((a, b) =>
          b.careDate.localeCompare(a.careDate)
        );
        const sortedAuths = [...data.authorizations].sort((a, b) =>
          b.expectedDate.localeCompare(a.expectedDate)
        );
        setClaims(sortedClaims);
        setAuthorizations(sortedAuths);
        setMemberLoaded(true);
      } catch {
        setInternalToken('');
        setMember(null);
        setDependents([]);
        setClaims([]);
        setAuthorizations([]);
      }
    },
    [internalToken]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setInternalToken('');
        setAdminToken('');
        setAdminUsername('');
        setMember(null);
        setMemberLoaded(false);
        setDependents([]);
        setClaims([]);
        setAuthorizations([]);
      } else {
        setMember((prev) => (internalToken ? prev : null));
        setMemberLoaded((prev) => (internalToken ? prev : false));
        if (!internalToken) {
          setDependents([]);
          setClaims([]);
          setAuthorizations([]);
        }
      }
    });
    return () => unsub();
  }, [internalToken]);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;

    const memberPath = `members/${user.uid}`;
    const unsubMember = onSnapshot(
      doc(db, 'members', user.uid),
      (snap) => {
        if (snap.exists()) {
          setMember(snap.data() as MemberProfile);
        } else {
          setMember(null);
        }
        setMemberLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, memberPath);
      }
    );

    const depsPath = `members/${user.uid}/dependents`;
    const unsubDeps = onSnapshot(
      collection(db, 'members', user.uid, 'dependents'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Dependent, 'id'>),
        }));
        setDependents(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, depsPath);
      }
    );

    const claimsQuery = query(
      collection(db, 'claims'),
      where('ownerId', '==', user.uid)
    );
    const unsubClaims = onSnapshot(
      claimsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MedicalClaim, 'id'>),
        }));
        list.sort((a, b) => b.careDate.localeCompare(a.careDate));
        setClaims(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'claims');
      }
    );

    const authsQuery = query(
      collection(db, 'authorizations'),
      where('ownerId', '==', user.uid)
    );
    const unsubAuths = onSnapshot(
      authsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuthorizationRequest, 'id'>),
        }));
        list.sort((a, b) => b.expectedDate.localeCompare(a.expectedDate));
        setAuthorizations(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'authorizations');
      }
    );

    return () => {
      unsubMember();
      unsubDeps();
      unsubClaims();
      unsubAuths();
    };
  }, [authReady, user]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setLoginModalMode(null);
      setSection(postLoginSection);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'تعذر تسجيل الدخول في الوقت الحالي.';
      setAuthError(
        msg.includes('popup-closed-by-user')
          ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.'
          : 'تعذر تسجيل الدخول عبر حساب Google. يرجى المحاولة مجدداً.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleInternalSuccess = async (token: string, loggedMember: MemberProfile) => {
    setAdminToken('');
    setAdminUsername('');
    setInternalToken(token);
    setMember(loggedMember);
    setMemberLoaded(true);
    setLoginModalMode(null);
    setSection(postLoginSection);
    await refreshInternalWorkspace(token);
  };

  const handleAdminSuccess = (token: string, username: string) => {
    setInternalToken('');
    setMember(null);
    setMemberLoaded(false);
    setDependents([]);
    setClaims([]);
    setAuthorizations([]);
    setAdminToken(token);
    setAdminUsername(username);
    setLoginModalMode(null);
    setSection('admin');
  };

  const handleSignOut = async () => {
    if (user) {
      await signOut(auth);
    }
    setInternalToken('');
    setAdminToken('');
    setAdminUsername('');
    setMember(null);
    setMemberLoaded(false);
    setDependents([]);
    setClaims([]);
    setAuthorizations([]);
    setSection('overview');
  };

  const navItems = useMemo(() => {
    if (isAdminSession) {
      return [
        { id: 'admin' as WorkspaceSection, label: 'إدارة الملف والمراقبة', icon: ShieldAlert },
        { id: 'wilayas' as WorkspaceSection, label: 'المقرات الولائية (96)', icon: MapPinned },
        { id: 'benefits' as WorkspaceSection, label: 'دليل المزايا 2026', icon: BookOpen },
        { id: 'simulator' as WorkspaceSection, label: 'حاسبة التعويضات', icon: Calculator },
        { id: 'providers' as WorkspaceSection, label: 'الشبكة المتعاقدة', icon: Building2 },
        { id: 'contact' as WorkspaceSection, label: 'اتصل بنا', icon: PhoneCall },
      ];
    }
    return [
      { id: 'overview' as WorkspaceSection, label: 'لوحة القيادة', icon: LayoutDashboard },
      { id: 'card' as WorkspaceSection, label: 'استخراج البطاقة الرقمية', icon: CreditCard },
      { id: 'benefits' as WorkspaceSection, label: 'دليل المزايا 2026', icon: BookOpen },
      { id: 'claims' as WorkspaceSection, label: 'ملفات المرض والمنح', icon: FileText },
      { id: 'dependents' as WorkspaceSection, label: 'ذوو الحقوق', icon: Users },
      { id: 'authorizations' as WorkspaceSection, label: 'التكفل المسبق', icon: ClipboardCheck },
      { id: 'simulator' as WorkspaceSection, label: 'حاسبة التعويضات', icon: Calculator },
      { id: 'wilayas' as WorkspaceSection, label: 'المقرات الولائية (96)', icon: MapPinned },
      { id: 'providers' as WorkspaceSection, label: 'الشبكة المتعاقدة', icon: Building2 },
      { id: 'contact' as WorkspaceSection, label: 'اتصل بنا', icon: PhoneCall },
      { id: 'profile' as WorkspaceSection, label: 'الملف والوثائق', icon: UserCog },
    ];
  }, [isAdminSession]);

  const sectionTitle =
    navItems.find((item) => item.id === section)?.label ||
    (isAdminSession ? 'إدارة الملف والمراقبة' : 'لوحة القيادة');

  if (verifyCardParams) {
    return (
      <CardQrVerifyPage
        membershipNumber={verifyCardParams.m}
        sig={verifyCardParams.sig}
        onBackToPortal={() => {
          setVerifyCardParams(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">
          جاري تهيئة بوابة التعاضدية الوطنية...
        </div>
      </div>
    );
  }

  // Dedicated Admin Workspace (Username & Password Only, Separate from Google)
  if (isAdminSession) {
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
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-blue-800' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 space-y-3">
            <div className="text-xs">
              <p className="font-semibold text-slate-900 truncate">
                مدير البوابة ({adminUsername})
              </p>
              <p className="text-slate-500 mt-0.5">دخول إداري مستقل</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
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
                          ? 'bg-blue-50 text-blue-900 font-semibold'
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
                  onClick={handleSignOut}
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
                <span className="text-slate-400 hidden sm:inline">فضاء الإدارة</span>
                <span className="text-slate-300 hidden sm:inline">/</span>
                <h1 className="font-bold text-slate-900 truncate">{sectionTitle}</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج الإدارة</span>
            </button>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {section === 'admin' && (
              <AdminReviewPanel
                adminToken={adminToken}
                adminUsername={adminUsername}
              />
            )}
            {section === 'wilayas' && <WilayaOfficesDirectory />}
            {section === 'benefits' && <BenefitsCatalog />}
            {section === 'simulator' && <SimulatorAndGuide />}
            {section === 'providers' && <ProvidersDirectory />}
            {section === 'contact' && <ContactSection />}
          </main>
        </div>
      </div>
    );
  }

  if (!user && (!internalToken || !member)) {
    return (
      <>
        <PublicPortal
          onOpenLogin={(initial, targetSection) => {
            setPostLoginSection(targetSection || 'overview');
            setLoginModalMode(initial || 'internal');
          }}
          signingIn={signingIn}
          authError={authError}
        />
        {loginModalMode && (
          <InternalLoginModal
            initialMode={loginModalMode}
            onClose={() => setLoginModalMode(null)}
            onGoogleSignIn={handleGoogleSignIn}
            googleSigningIn={signingIn}
            onInternalSuccess={handleInternalSuccess}
            onAdminSuccess={handleAdminSuccess}
          />
        )}
      </>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-900">تأكيد البريد الإلكتروني</h2>
          <p className="text-sm text-slate-600">
            يرجى استخدام حساب بريد إلكتروني موثق للوصول إلى ملفات التعاضدية الوطنية.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg cursor-pointer"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  if (!memberLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">
          جاري تحميل بيانات المنخرط...
        </div>
      </div>
    );
  }

  if (!member && user) {
    return <MemberOnboarding user={user} />;
  }

  if (!member || !memberSessionMode) {
    return null;
  }

  const activeOwnerKey =
    memberSessionMode === 'internal' ? member.membershipNumber : member.uid;
  const ownDependents = dependents.filter((d) => d.ownerId === activeOwnerKey);
  const ownClaims = claims.filter((c) => c.ownerId === activeOwnerKey);
  const ownAuthorizations = authorizations.filter(
    (a) => a.ownerId === activeOwnerKey
  );

  const triggerNewClaim = (careTypeToSelect?: CareType) => {
    setPreselectedCareType(careTypeToSelect);
    setSection('claims');
    setNewClaimSignal((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (256px) */}
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
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-blue-800' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">{member.fullName}</p>
            <p className="font-mono-tabular text-slate-500 mt-0.5">
              {member.membershipNumber} ·{' '}
              {memberSessionMode === 'internal' ? 'ملف داخلي' : 'حساب سحابي'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
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
                        ? 'bg-blue-50 text-blue-900 font-semibold'
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
                onClick={handleSignOut}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Workspace Header */}
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
              <span className="text-slate-400 hidden sm:inline">فضاء المنخرط</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-bold text-slate-900 truncate">{sectionTitle}</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => triggerNewClaim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إيداع ملف جديد</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {section === 'overview' && (
            <DashboardOverview
              member={member}
              dependents={ownDependents}
              claims={ownClaims}
              authorizations={ownAuthorizations}
              sessionMode={memberSessionMode}
              onNavigate={setSection}
              onNewClaim={() => triggerNewClaim()}
              onOpenCard={(mode) => setCardModalMode(mode)}
            />
          )}

          {section === 'card' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  استخراج بطاقة الانخراط الرقمية وشهادة الانخراط
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  معاينة بطاقة الانخراط التعاضدية برمز التحقق الرقمي وتحميلها بصيغة PNG أو طباعتها بصيغة PDF
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <DigitalCardExtractor member={member} dependents={ownDependents} />
              </div>
            </div>
          )}

          {section === 'benefits' && (
            <BenefitsCatalog
              onApplyForBenefit={(careType) => triggerNewClaim(careType)}
            />
          )}

          {section === 'claims' && (
            <ClaimsManager
              member={member}
              dependents={ownDependents}
              claims={ownClaims}
              sessionMode={memberSessionMode}
              internalToken={internalToken}
              onInternalSync={() => refreshInternalWorkspace()}
              preselectedCareType={preselectedCareType}
              openNewModalSignal={newClaimSignal}
            />
          )}

          {section === 'dependents' && (
            <DependentsManager
              member={member}
              dependents={ownDependents}
              sessionMode={memberSessionMode}
              internalToken={internalToken}
              onInternalSync={() => refreshInternalWorkspace()}
            />
          )}

          {section === 'authorizations' && (
            <AuthorizationsManager
              member={member}
              dependents={ownDependents}
              authorizations={ownAuthorizations}
              sessionMode={memberSessionMode}
              internalToken={internalToken}
              onInternalSync={() => refreshInternalWorkspace()}
            />
          )}

          {section === 'simulator' && (
            <SimulatorAndGuide defaultPlan={member.coveragePlan} />
          )}

          {section === 'wilayas' && <WilayaOfficesDirectory />}

          {section === 'providers' && <ProvidersDirectory />}

          {section === 'contact' && <ContactSection />}

          {section === 'profile' && (
            <ProfileSettings
              member={member}
              sessionMode={memberSessionMode}
              internalToken={internalToken}
              onInternalSync={() => refreshInternalWorkspace()}
              onOpenCard={(mode) => setCardModalMode(mode)}
            />
          )}
        </main>
      </div>

      {cardModalMode && (
        <DigitalCardModal
          member={member}
          dependents={ownDependents}
          mode={cardModalMode}
          onClose={() => setCardModalMode(null)}
        />
      )}
    </div>
  );
}
