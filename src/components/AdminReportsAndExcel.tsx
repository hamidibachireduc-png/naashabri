import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
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
  downloadAdminNationalWarehouseBlob,
  downloadAdminWilayaExcelBlob,
  fetchAdminNationalWarehouseMeta,
  fetchAdminReportsSummary,
  importAdminExcelDatabase,
  importAdminNationalWarehouseExcel,
  syncAdminExcelDatabase,
  syncAdminNationalWarehouse,
} from '../lib/internalApi';
import type { AdminReportsSummary, NationalWarehouseMeta } from '../types/mutual';

interface AdminReportsAndExcelProps {
  adminToken: string;
}

export function AdminReportsAndExcel({ adminToken }: AdminReportsAndExcelProps) {
  const [reports, setReports] = useState<AdminReportsSummary | null>(null);
  const [warehouseMeta, setWarehouseMeta] = useState<NationalWarehouseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [warehouseSyncing, setWarehouseSyncing] = useState(false);
  const [warehouseDownloading, setWarehouseDownloading] = useState(false);
  const [warehouseImporting, setWarehouseImporting] = useState(false);
  const [warehouseImportMode, setWarehouseImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('01');
  const [wilayaDownloadingCode, setWilayaDownloadingCode] = useState('');
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const warehouseFileRef = useRef<HTMLInputElement | null>(null);

  const loadReports = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [reportsData, metaData] = await Promise.all([
        fetchAdminReportsSummary(adminToken),
        fetchAdminNationalWarehouseMeta(adminToken),
      ]);
      setReports(reportsData);
      setWarehouseMeta(metaData);
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

  const filteredWarehouseWilayas = useMemo(() => {
    const list = warehouseMeta?.byWilaya || [];
    const q = wilayaSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.wilayaName.toLowerCase().includes(q) ||
        (w.headName || '').toLowerCase().includes(q)
    );
  }, [warehouseMeta?.byWilaya, wilayaSearch]);

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

  const handleSyncWarehouse = async () => {
    if (!adminToken) return;
    setWarehouseSyncing(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const meta = await syncAdminNationalWarehouse(adminToken);
      setWarehouseMeta(meta);
      await loadReports();
      setNoticeMsg(
        `تمت مزامنة ملف المخزن الوطني للمنخرطين (${meta.totalMembers} منخرط موزعين عبر ${meta.populatedWilayas} ولاية من أصل ${meta.totalWilayas}).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر مزامنة ملف المخزن الوطني للمنخرطين.'
      );
    } finally {
      setWarehouseSyncing(false);
    }
  };

  const handleDownloadNationalWarehouse = async () => {
    if (!adminToken) return;
    setWarehouseDownloading(true);
    setErrorMsg('');
    try {
      const blob = await downloadAdminNationalWarehouseBlob(adminToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'MUTNATEC-National-Members-Warehouse-96Wilayas.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNoticeMsg(
        'تم تحميل ملف المخزن الوطني الشامل (96 ورقة ولائية + الفهرس + القاعدة الوطنية الموحدة).'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر تحميل ملف المخزن الوطني بصيغة Excel.'
      );
    } finally {
      setWarehouseDownloading(false);
    }
  };

  const handleDownloadSingleWilayaExcel = async (code: string) => {
    if (!adminToken || !code) return;
    setWilayaDownloadingCode(code);
    setErrorMsg('');
    try {
      const blob = await downloadAdminWilayaExcelBlob(adminToken, code);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MUTNATEC-Wilaya-${code}-Members.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNoticeMsg(`تم تحميل ملف قاعدة بيانات منخرطي الولاية رقم ${code} بصيغة Excel.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تحميل ملف Excel للولاية المختارة.');
    } finally {
      setWilayaDownloadingCode('');
    }
  };

  const handleWarehouseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !adminToken) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMsg('يرجى اختيار ملف المخزن الوطني بصيغة (.xlsx) فقط.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('حجم ملف المخزن الوطني يجب أن لا يتجاوز 4 ميغابايت.');
      return;
    }

    setWarehouseImporting(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('تعذر قراءة الملف من الجهاز.'));
        reader.readAsDataURL(file);
      });

      const res = await importAdminNationalWarehouseExcel(adminToken, {
        fileBase64,
        mode: warehouseImportMode,
      });
      setWarehouseMeta(res.meta);
      await loadReports();
      setNoticeMsg(
        `تمت استعادة وتحديث ${res.importedCount} منخرط من ملف المخزن الوطني ومزامنة السجلات بنجاح.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر استيراد ملف المخزن الوطني للمنخرطين.'
      );
    } finally {
      setWarehouseImporting(false);
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

      {/* National Members Warehouse Excel (96 Wilayas Database) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-800" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900">
                المخزن الوطني لقاعدة بيانات المنخرطين بكل ولاية (Excel — 96 ولاية)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ملف قاعدة بيانات وطني مستقل (<code className="font-mono-tabular">national-members-warehouse.xlsx</code>)
              يتضمن فهرساً وطنياً، وورقة موحدة لكل المنخرطين بتفاصيلهم الكاملة، و96 ورقة عمل مخصصة
              لكل ولاية/فرع، وتتزامن تلقائياً مع عمليات الحفظ والاستعادة الولائية.
            </p>
            {warehouseMeta && (
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 font-mono-tabular">
                <span>
                  آخر مزامنة:{' '}
                  <strong className="text-slate-800">
                    {warehouseMeta.lastSyncedAt
                      ? warehouseMeta.lastSyncedAt.slice(0, 19).replace('T', ' ')
                      : 'الآن'}
                  </strong>
                </span>
                <span>
                  الحجم:{' '}
                  <strong className="text-slate-800">
                    {Math.max(1, Math.round((warehouseMeta.fileSizeBytes || 0) / 1024))} KB
                  </strong>
                </span>
                <span>
                  إجمالي المنخرطين:{' '}
                  <strong className="text-emerald-700">
                    {warehouseMeta.totalMembers} ({warehouseMeta.activeMembers} نشط)
                  </strong>
                </span>
                <span>
                  الولايات النشطة بالمنخرطين:{' '}
                  <strong className="text-blue-800">
                    {warehouseMeta.populatedWilayas} / {warehouseMeta.totalWilayas}
                  </strong>
                </span>
                <span>
                  أوراق العمل: <strong className="text-slate-800">{2 + warehouseMeta.totalWilayas}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncWarehouse}
              disabled={warehouseSyncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${warehouseSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{warehouseSyncing ? 'جاري المزامنة...' : 'مزامنة المخزن الوطني'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadNationalWarehouse}
              disabled={warehouseDownloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {warehouseDownloading
                  ? 'جاري التنزيل...'
                  : 'تحميل المخزن الوطني (96 ولاية .xlsx)'}
              </span>
            </button>
          </div>
        </div>

        {/* Warehouse Import + Quick Single-Wilaya Export */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">استعادة من المخزن الوطني:</span>
              <select
                value={warehouseImportMode}
                onChange={(e) => setWarehouseImportMode(e.target.value as 'merge' | 'replace')}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800"
              >
                <option value="merge">دمج وتحديث المنخرطين</option>
                <option value="replace">استبدال سجل المنخرطين</option>
              </select>
            </div>
            <div>
              <input
                ref={warehouseFileRef}
                type="file"
                accept=".xlsx"
                onChange={handleWarehouseFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => warehouseFileRef.current?.click()}
                disabled={warehouseImporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{warehouseImporting ? 'جاري الاستيراد...' : 'رفع واستعادة (.xlsx)'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 text-xs flex-1 min-w-0">
              <span className="font-semibold text-slate-700 whitespace-nowrap">
                ملف ولاية محددة:
              </span>
              <select
                value={selectedWilayaCode}
                onChange={(e) => setSelectedWilayaCode(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 min-w-[160px]"
              >
                {(warehouseMeta?.byWilaya || []).map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} — {w.wilayaName} ({w.membersCount})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadSingleWilayaExcel(selectedWilayaCode)}
              disabled={Boolean(wilayaDownloadingCode)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {wilayaDownloadingCode === selectedWilayaCode
                  ? 'جاري التنزيل...'
                  : 'تحميل Excel للولاية'}
              </span>
            </button>
          </div>
        </div>

        {/* 96-Wilaya Warehouse Directory Breakdown */}
        {warehouseMeta && warehouseMeta.byWilaya.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-800">
                جدول المخزن الوطني حسب الولايات ({filteredWarehouseWilayas.length} من أصل{' '}
                {warehouseMeta.byWilaya.length})
              </h4>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={wilayaSearch}
                  onChange={(e) => setWilayaSearch(e.target.value)}
                  placeholder="تصفية برقم الولاية، اسمها أو الرئيس..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 z-10">
                  <tr>
                    <th className="py-2 px-3">الرمز</th>
                    <th className="py-2 px-3">الولاية / المركز</th>
                    <th className="py-2 px-3">رئيس التعاضدية</th>
                    <th className="py-2 px-3">المنخرطون</th>
                    <th className="py-2 px-3">الملفات</th>
                    <th className="py-2 px-3">طلبات الانخراط</th>
                    <th className="py-2 px-3">تصدير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWarehouseWilayas.map((w) => (
                    <tr key={w.code} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono-tabular font-semibold text-slate-900">
                        {w.code}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">{w.wilayaName}</td>
                      <td className="py-2 px-3 text-slate-600">{w.headName || '—'}</td>
                      <td className="py-2 px-3 font-mono-tabular">
                        <span className="font-semibold text-slate-900">{w.membersCount}</span>
                        <span className="text-emerald-700 mr-1">({w.activeMembersCount} نشط)</span>
                      </td>
                      <td className="py-2 px-3 font-mono-tabular text-slate-700">
                        {w.claimsCount}
                      </td>
                      <td className="py-2 px-3 font-mono-tabular text-slate-700">
                        {w.enrollmentsCount}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleWilayaExcel(w.code)}
                          disabled={wilayaDownloadingCode === w.code}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
                        >
                          <Download className="w-3 h-3" aria-hidden="true" />
                          <span>.xlsx</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
