import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../data/mutualCatalog';
import {
  downloadAdminExcelDatabase,
  fetchAdminReportsSummary,
  importAdminExcelDatabase,
  syncAdminExcelDatabase,
} from '../lib/internalApi';
import type { AdminReportsSummary } from '../types/mutual';

interface AdminReportsAndExcelProps {
  adminToken: string;
}

export function AdminReportsAndExcel({ adminToken }: AdminReportsAndExcelProps) {
  const [reports, setReports] = useState<AdminReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadReports = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchAdminReportsSummary(adminToken);
      setReports(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل التقارير الإدارية والمالية.'
      );
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleManualSync = async () => {
    if (!adminToken) return;
    setSyncing(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const res = await syncAdminExcelDatabase(adminToken);
      setReports(res.reports);
      setNoticeMsg(
        `تمت مزامنة قاعدة بيانات Excel بنجاح (${res.excelSync.syncedCounts.roster} منخرط، ${res.excelSync.syncedCounts.claims} ملف مرض، ${res.excelSync.syncedCounts.wilayasActive} مركز ولائي).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'فشلت عملية المزامنة.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!adminToken) return;
    setDownloading(true);
    setErrorMsg('');
    try {
      const blob = await downloadAdminExcelDatabase(adminToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'MUTNATEC-Database-Reports.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNoticeMsg(
        'تم تحميل ملف قاعدة البيانات الشامل (MUTNATEC-Database-Reports.xlsx) المتضمن 7 أوراق عمل متزامنة.'
      );
      await loadReports();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل ملف Excel في الوقت الحالي.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !adminToken) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMsg('يرجى اختيار ملف بصيغة Excel الحديثة (.xlsx) فقط.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('حجم ملف Excel يجب أن لا يتجاوز 4 ميغابايت.');
      return;
    }

    setImporting(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('تعذر قراءة الملف من الجهاز.'));
        reader.readAsDataURL(file);
      });

      const res = await importAdminExcelDatabase(adminToken, {
        fileBase64,
        mode: importMode,
      });
      setReports(res.reports);
      setNoticeMsg(
        `تمت المزامنة من ملف Excel بنجاح: ${res.importedRosterCount} منخرط و${res.importedWilayasCount} مركز ولائي.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر استيراد ومزامنة ملف Excel.'
      );
    } finally {
      setImporting(false);
    }
  };

  if (loading && !reports) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        جاري إعداد التقارير الإدارية والمالية ومزامنة قاعدة بيانات Excel...
      </div>
    );
  }

  const kpis = reports?.kpis;
  const sync = reports?.excelSync;
  const sizeKb = sync ? Math.max(1, Math.round(sync.fileSizeBytes / 1024)) : 0;

  return (
    <div className="space-y-6">
      {/* Excel Sync Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900">
                قاعدة بيانات Excel المزامنة تلقائياً (.xlsx)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              تُحفظ وتتزامن جميع بيانات المنخرطين، ملفات المرض، طلبات التكفل، الانخراط الفردي، ذوي
              الحقوق، المقرات الولائية، والتقارير الإدارية والمالية آلياً في ملف Excel موحّد من 7
              أوراق عمل.
            </p>
            {sync && (
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 font-mono-tabular">
                <span>
                  آخر مزامنة:{' '}
                  <strong className="text-slate-800">
                    {sync.lastSyncedAt
                      ? sync.lastSyncedAt.slice(0, 19).replace('T', ' ')
                      : 'الآن'}
                  </strong>
                </span>
                <span>
                  الحجم: <strong className="text-slate-800">{sizeKb} KB</strong>
                </span>
                <span>
                  السجلات المزامنة:{' '}
                  <strong className="text-emerald-700">
                    {sync.syncedCounts.roster} منخرط · {sync.syncedCounts.claims} ملف ·{' '}
                    {sync.syncedCounts.enrollments} انخراط
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {downloading
                  ? 'جاري التصدير...'
                  : 'تحميل ملف Excel (.xlsx)'}
              </span>
            </button>
          </div>
        </div>

        {/* Excel Upload / Re-sync Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">مزامنة عكسية من ملف Excel:</span>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800"
            >
              <option value="merge">دمج وتحديث المنخرطين والمقرات</option>
              <option value="replace">استبدال سجل المنخرطين بالكامل</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {importing ? 'جاري الاستيراد والمزامنة...' : 'رفع ومزامنة ملف Excel (.xlsx)'}
              </span>
            </button>
          </div>
        </div>

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
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>إجمالي المنخرطين</span>
              <Users className="w-4 h-4 text-blue-800" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold font-mono-tabular text-slate-900">
              {kpis.totalMembers}
            </p>
            <p className="text-xs text-emerald-700 font-medium font-mono-tabular">
              {kpis.activeMembers} نشط · {kpis.pendingOrSuspendedMembers} قيد المراجعة/معلق
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>السقف السنوي الإجمالي</span>
              <Wallet className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-slate-900">
              {formatCurrency(kpis.totalAnnualCeiling)}
            </p>
            <p className="text-xs text-slate-500">مجموع الأسقف المخصصة للمنخرطين</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>التعويضات المعتمدة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-emerald-700">
              {formatCurrency(kpis.totalApprovedAmount)}
            </p>
            <p className="text-xs text-slate-500 font-mono-tabular">
              من أصل {formatCurrency(kpis.totalClaimedAmount)} ({kpis.totalClaims} ملف)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الانخراطات والمراكز الولائية</span>
              <Building2 className="w-4 h-4 text-blue-800" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold font-mono-tabular text-slate-900">
              {kpis.activeWilayaCenters} / 96
            </p>
            <p className="text-xs text-slate-600 font-mono-tabular">
              {kpis.pendingEnrollmentsCount} انخراط قيد التدقيق · {kpis.pendingAuthorizationsCount}{' '}
              تكفل منتظر
            </p>
          </div>
        </div>
      )}

      {/* Monthly Financial BarChart */}
      {reports && reports.byMonth.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              التقرير المالي الشهري — المصاريف المصرح بها مقابل التعويضات المعتمدة
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              بيانات متزامنة مباشرة مع ورقة «التقرير الإداري والمالي» في ملف Excel
            </p>
          </div>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports.byMonth} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0) || 0)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="totalClaimed"
                  name="المبلغ المصرح به (د.ج)"
                  fill="#1e3a8a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalApproved"
                  name="التعويض المعتمد (د.ج)"
                  fill="#047857"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed CareType & Wilaya Tables */}
      {reports && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900">
                التقرير المالي حسب نوع الأداء الطبي والاجتماعي
              </h4>
            </div>
            {reports.byCareType.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                لا توجد ملفات مرض مسجلة بعد لعرض التوزيع المالي.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/50">
                      <th className="py-2.5 px-4">نوع الأداء</th>
                      <th className="py-2.5 px-3">الملفات</th>
                      <th className="py-2.5 px-3 text-left">المصرح به</th>
                      <th className="py-2.5 px-4 text-left">المعتمد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.byCareType.map((row) => (
                      <tr key={row.careType}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {row.careType}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700">
                          {row.claimsCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-left text-slate-700">
                          {formatCurrency(row.totalClaimed)}
                        </td>
                        <td className="py-2.5 px-4 font-mono-tabular text-left font-semibold text-emerald-700">
                          {formatCurrency(row.totalApproved)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900">
                التوزيع الإداري والمالي حسب الولاية
              </h4>
            </div>
            {reports.byWilaya.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                لا توجد بيانات منخرطين مسجلة بعد لعرض التوزيع الولائي.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/50">
                      <th className="py-2.5 px-4">الولاية</th>
                      <th className="py-2.5 px-3">المنخرطون</th>
                      <th className="py-2.5 px-3">الملفات</th>
                      <th className="py-2.5 px-4 text-left">التعويضات المعتمدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.byWilaya.map((row) => (
                      <tr key={row.city}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{row.city}</td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700">
                          {row.membersCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700">
                          {row.claimsCount}
                        </td>
                        <td className="py-2.5 px-4 font-mono-tabular text-left font-semibold text-emerald-700">
                          {formatCurrency(row.totalApproved)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
