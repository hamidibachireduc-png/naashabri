import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

export interface ExcelRosterRecord {
  membershipNumber: string;
  accessCode: string;
  fullName: string;
  email: string;
  nationalId: string;
  gender?: 'ذكر' | 'أنثى';
  seniorityYears?: number;
  sector: string;
  city: string;
  municipality?: string;
  institution?: string;
  phone: string;
  rib: string;
  coveragePlan: string;
  annualCeiling: number;
  status: string;
}

export interface ExcelDependentRecord {
  id: string;
  ownerId: string;
  fullName: string;
  relationship: string;
  birthDate: string;
  coverageCode: string;
  active: boolean;
}

export interface ExcelClaimRecord {
  id: string;
  ownerId: string;
  memberName: string;
  membershipNumber: string;
  referenceCode: string;
  beneficiaryName: string;
  beneficiaryRelation: string;
  careType: string;
  providerName: string;
  careDate: string;
  totalAmount: number;
  estimatedReimbursement: number;
  approvedAmount: number;
  status: string;
  notes: string;
  reviewerNote: string;
}

export interface ExcelAuthRecord {
  id: string;
  ownerId: string;
  memberName: string;
  referenceCode: string;
  beneficiaryName: string;
  procedureType: string;
  facilityName: string;
  expectedDate: string;
  estimatedCost: number;
  status: string;
  notes: string;
  reviewerNote: string;
}

export interface ExcelWilayaRecord {
  code: string;
  wilayaName: string;
  officeName: string;
  representativeName: string;
  phone: string;
  accountInfo: string;
  socialUrl: string;
  address: string;
  googleMapsUrl: string;
  secondaryMapsUrl?: string;
  updatedAt: string;
}

export interface ExcelEnrollmentRecord {
  id: string;
  trackingCode: string;
  fullName: string;
  socialSecurityNumber?: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  sector: string;
  city: string;
  municipality?: string;
  workplace: string;
  gender?: 'ذكر' | 'أنثى';
  seniorityYears?: number;
  rib: string;
  coveragePlan: string;
  notes: string;
  status: string;
  statusMessage: string;
  assignedMembershipNumber: string;
  assignedAccessCode: string;
  reviewerNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSnapshot {
  roster: ExcelRosterRecord[];
  dependents: ExcelDependentRecord[];
  claims: ExcelClaimRecord[];
  authorizations: ExcelAuthRecord[];
  enrollments: ExcelEnrollmentRecord[];
  wilayas: ExcelWilayaRecord[];
}

export interface ExcelSyncMeta {
  fileName: string;
  lastSyncedAt: string;
  fileSizeBytes: number;
  syncedCounts: {
    roster: number;
    claims: number;
    authorizations: number;
    enrollments: number;
    dependents: number;
    wilayasActive: number;
  };
}

export interface AdminReportsSummary {
  generatedAt: string;
  kpis: {
    totalMembers: number;
    activeMembers: number;
    pendingOrSuspendedMembers: number;
    totalAnnualCeiling: number;
    totalClaims: number;
    totalClaimedAmount: number;
    totalEstimatedAmount: number;
    totalApprovedAmount: number;
    paidClaimsCount: number;
    pendingClaimsCount: number;
    totalAuthorizations: number;
    pendingAuthorizationsCount: number;
    totalEnrollments: number;
    pendingEnrollmentsCount: number;
    approvedEnrollmentsCount: number;
    activeWilayaCenters: number;
  };
  byCareType: Array<{
    careType: string;
    claimsCount: number;
    totalClaimed: number;
    totalApproved: number;
  }>;
  byWilaya: Array<{
    city: string;
    membersCount: number;
    claimsCount: number;
    totalApproved: number;
  }>;
  byMonth: Array<{
    month: string;
    claimsCount: number;
    totalClaimed: number;
    totalApproved: number;
  }>;
  excelSync: ExcelSyncMeta;
}

export function getExcelPaths(dataDir: string) {
  return {
    excelFile: path.join(dataDir, 'mutnatec-database.xlsx'),
    metaFile: path.join(dataDir, 'excel-sync-meta.json'),
  };
}

function safeExcelCell(value: unknown): string {
  const str = typeof value === 'string' ? value : String(value ?? '');
  if (!str) return '';
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function readCellText(cellValue: ExcelJS.CellValue): string {
  if (cellValue === null || cellValue === undefined) return '';
  let text = '';
  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    text = String(cellValue);
  } else if (cellValue instanceof Date) {
    text = cellValue.toISOString().slice(0, 10);
  } else if (typeof cellValue === 'object') {
    if ('text' in cellValue && typeof cellValue.text === 'string') {
      text = cellValue.text;
    } else if ('richText' in cellValue && Array.isArray(cellValue.richText)) {
      text = cellValue.richText.map((part) => part.text || '').join('');
    } else if ('result' in cellValue && cellValue.result !== undefined) {
      text = String(cellValue.result);
    }
  }
  return text.replace(/^'/, '').trim();
}

export function readExcelSyncMeta(dataDir: string): ExcelSyncMeta {
  const { excelFile, metaFile } = getExcelPaths(dataDir);
  try {
    if (fs.existsSync(metaFile)) {
      const raw = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as Partial<ExcelSyncMeta>;
      const fileSizeBytes = fs.existsSync(excelFile)
        ? fs.statSync(excelFile).size
        : raw.fileSizeBytes ?? 0;
      return {
        fileName: 'mutnatec-database.xlsx',
        lastSyncedAt: raw.lastSyncedAt || '',
        fileSizeBytes,
        syncedCounts: {
          roster: raw.syncedCounts?.roster ?? 0,
          claims: raw.syncedCounts?.claims ?? 0,
          authorizations: raw.syncedCounts?.authorizations ?? 0,
          enrollments: raw.syncedCounts?.enrollments ?? 0,
          dependents: raw.syncedCounts?.dependents ?? 0,
          wilayasActive: raw.syncedCounts?.wilayasActive ?? 0,
        },
      };
    }
  } catch {
    // ignore malformed meta file
  }
  return {
    fileName: 'mutnatec-database.xlsx',
    lastSyncedAt: '',
    fileSizeBytes: fs.existsSync(excelFile) ? fs.statSync(excelFile).size : 0,
    syncedCounts: {
      roster: 0,
      claims: 0,
      authorizations: 0,
      enrollments: 0,
      dependents: 0,
      wilayasActive: 0,
    },
  };
}

export function computeReportsData(
  snapshot: DatabaseSnapshot,
  excelSync: ExcelSyncMeta
): AdminReportsSummary {
  const activeMembers = snapshot.roster.filter((m) => m.status === 'نشط').length;
  const totalAnnualCeiling = snapshot.roster.reduce(
    (sum, m) => sum + (Number(m.annualCeiling) || 0),
    0
  );

  let totalClaimedAmount = 0;
  let totalEstimatedAmount = 0;
  let totalApprovedAmount = 0;
  let paidClaimsCount = 0;
  let pendingClaimsCount = 0;

  const careMap = new Map<
    string,
    { claimsCount: number; totalClaimed: number; totalApproved: number }
  >();
  const monthMap = new Map<
    string,
    { claimsCount: number; totalClaimed: number; totalApproved: number }
  >();
  const memberCityByNumber = new Map<string, string>();
  const wilayaMap = new Map<
    string,
    { membersCount: number; claimsCount: number; totalApproved: number }
  >();

  for (const m of snapshot.roster) {
    const city = m.city || 'غير محددة';
    memberCityByNumber.set(m.membershipNumber, city);
    const w = wilayaMap.get(city) || { membersCount: 0, claimsCount: 0, totalApproved: 0 };
    w.membersCount += 1;
    wilayaMap.set(city, w);
  }

  for (const c of snapshot.claims) {
    const claimed = Number(c.totalAmount) || 0;
    const est = Number(c.estimatedReimbursement) || 0;
    const app = Number(c.approvedAmount) || 0;
    totalClaimedAmount += claimed;
    totalEstimatedAmount += est;
    totalApprovedAmount += app;

    if (c.status === 'تم الصرف' || c.status === 'تمت الموافقة') {
      paidClaimsCount += 1;
    } else if (c.status === 'قيد الدراسة' || c.status === 'وثائق ناقصة') {
      pendingClaimsCount += 1;
    }

    const careKey = c.careType || 'أخرى';
    const ce = careMap.get(careKey) || { claimsCount: 0, totalClaimed: 0, totalApproved: 0 };
    ce.claimsCount += 1;
    ce.totalClaimed += claimed;
    ce.totalApproved += app;
    careMap.set(careKey, ce);

    const monthKey = (c.careDate || '').slice(0, 7) || 'غير محدد';
    const me = monthMap.get(monthKey) || { claimsCount: 0, totalClaimed: 0, totalApproved: 0 };
    me.claimsCount += 1;
    me.totalClaimed += claimed;
    me.totalApproved += app;
    monthMap.set(monthKey, me);

    const city = memberCityByNumber.get(c.membershipNumber) || 'غير محددة';
    const we = wilayaMap.get(city) || { membersCount: 0, claimsCount: 0, totalApproved: 0 };
    we.claimsCount += 1;
    we.totalApproved += app;
    wilayaMap.set(city, we);
  }

  const pendingAuthorizationsCount = snapshot.authorizations.filter(
    (a) => a.status === 'قيد الدراسة'
  ).length;
  const pendingEnrollmentsCount = snapshot.enrollments.filter(
    (e) => e.status === 'جاري التدقيق والموافقة'
  ).length;
  const approvedEnrollmentsCount = snapshot.enrollments.filter(
    (e) => e.status === 'تمت الموافقة والتسجيل'
  ).length;
  const activeWilayaCenters = snapshot.wilayas.filter(
    (w) => Boolean(w.address || w.phone || w.googleMapsUrl || w.officeName)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalMembers: snapshot.roster.length,
      activeMembers,
      pendingOrSuspendedMembers: snapshot.roster.length - activeMembers,
      totalAnnualCeiling,
      totalClaims: snapshot.claims.length,
      totalClaimedAmount,
      totalEstimatedAmount,
      totalApprovedAmount,
      paidClaimsCount,
      pendingClaimsCount,
      totalAuthorizations: snapshot.authorizations.length,
      pendingAuthorizationsCount,
      totalEnrollments: snapshot.enrollments.length,
      pendingEnrollmentsCount,
      approvedEnrollmentsCount,
      activeWilayaCenters,
    },
    byCareType: Array.from(careMap.entries())
      .map(([careType, stats]) => ({ careType, ...stats }))
      .sort((a, b) => b.totalClaimed - a.totalClaimed),
    byWilaya: Array.from(wilayaMap.entries())
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.membersCount - a.membersCount || b.totalApproved - a.totalApproved),
    byMonth: Array.from(monthMap.entries())
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    excelSync,
  };
}

function styleTableSheet(
  sheet: ExcelJS.Worksheet,
  columns: Array<{ header: string; key: string; width: number; numFmt?: string }>,
  rows: Array<Record<string, unknown>>
) {
  sheet.views = [{ rightToLeft: true }];
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  for (const rowObj of rows) {
    const safeRow: Record<string, unknown> = {};
    for (const col of columns) {
      const val = rowObj[col.key];
      safeRow[col.key] = typeof val === 'number' ? val : safeExcelCell(val);
    }
    const added = sheet.addRow(safeRow);
    added.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  }

  for (const col of columns) {
    if (col.numFmt) {
      sheet.getColumn(col.key).numFmt = col.numFmt;
    }
  }
}

let syncChain: Promise<ExcelSyncMeta> = Promise.resolve({
  fileName: 'mutnatec-database.xlsx',
  lastSyncedAt: '',
  fileSizeBytes: 0,
  syncedCounts: {
    roster: 0,
    claims: 0,
    authorizations: 0,
    enrollments: 0,
    dependents: 0,
    wilayasActive: 0,
  },
});

export function syncExcelDatabaseWorkbook(
  dataDir: string,
  getSnapshot: () => DatabaseSnapshot
): Promise<ExcelSyncMeta> {
  syncChain = syncChain
    .catch(() => readExcelSyncMeta(dataDir))
    .then(async () => {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const snapshot = getSnapshot();
      const nowIso = new Date().toISOString();
      const { excelFile, metaFile } = getExcelPaths(dataDir);

      const provisionalMeta: ExcelSyncMeta = {
        fileName: 'mutnatec-database.xlsx',
        lastSyncedAt: nowIso,
        fileSizeBytes: 0,
        syncedCounts: {
          roster: snapshot.roster.length,
          claims: snapshot.claims.length,
          authorizations: snapshot.authorizations.length,
          enrollments: snapshot.enrollments.length,
          dependents: snapshot.dependents.length,
          wilayasActive: snapshot.wilayas.filter((w) =>
            Boolean(w.address || w.phone || w.googleMapsUrl || w.officeName)
          ).length,
        },
      };
      const reports = computeReportsData(snapshot, provisionalMeta);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MUTNATEC Algeria Portal';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Sheet 1: Executive Administrative & Financial Report
      const reportSheet = workbook.addWorksheet('التقرير الإداري والمالي');
      reportSheet.views = [{ rightToLeft: true }];
      reportSheet.columns = [
        { key: 'col1', width: 34 },
        { key: 'col2', width: 22 },
        { key: 'col3', width: 24 },
        { key: 'col4', width: 24 },
      ];

      const titleRow = reportSheet.addRow([
        'التعاضدية الوطنية لعمال التربية والثقافة (MUTNATEC) — التقرير الإداري والمالي المزامَن',
      ]);
      titleRow.font = { bold: true, size: 13, color: { argb: 'FF1E3A8A' } };
      reportSheet.mergeCells('A1:D1');
      reportSheet.addRow(['تاريخ التحديث والمزامنة', nowIso.slice(0, 19).replace('T', ' ')]);
      reportSheet.addRow([]);

      const kpiHeader = reportSheet.addRow(['المؤشر الإداري والمالي', 'القيمة / العدد', 'ملاحظات']);
      kpiHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      kpiHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

      const kpiRows: Array<[string, number, string]> = [
        ['إجمالي المنخرطين في القاعدة', reports.kpis.totalMembers, 'منخرط'],
        ['المنخرطون النشطون', reports.kpis.activeMembers, 'حساب مفعل'],
        ['منخرطون قيد المراجعة / معلقون', reports.kpis.pendingOrSuspendedMembers, 'حساب'],
        ['إجمالي السقف السنوي المخصص (د.ج)', reports.kpis.totalAnnualCeiling, 'دينار جزائري'],
        ['إجمالي ملفات المرض المودعة', reports.kpis.totalClaims, 'ملف'],
        ['إجمالي المصاريف المصرح بها (د.ج)', reports.kpis.totalClaimedAmount, 'دينار جزائري'],
        ['إجمالي التعويضات المقدرة (د.ج)', reports.kpis.totalEstimatedAmount, 'دينار جزائري'],
        ['إجمالي التعويضات المعتمدة / المصروفة (د.ج)', reports.kpis.totalApprovedAmount, 'دينار جزائري'],
        ['طلبات التكفل المسبق (الإجمالي)', reports.kpis.totalAuthorizations, 'طلب'],
        ['طلبات الانخراط الفردي الإلكتروني', reports.kpis.totalEnrollments, 'طلب'],
        ['طلبات الانخراط قيد التدقيق والموافقة', reports.kpis.pendingEnrollmentsCount, 'طلب'],
        ['المراكز الولائية المفعّلة (من أصل 96)', reports.kpis.activeWilayaCenters, 'مركز ولائي'],
      ];
      for (const r of kpiRows) {
        const added = reportSheet.addRow(r);
        added.getCell(2).numFmt = '#,##0';
      }

      reportSheet.addRow([]);
      const careHeader = reportSheet.addRow([
        'نوع الأداء / المنحة',
        'عدد الملفات',
        'المبلغ المصرح به (د.ج)',
        'المبلغ المعتمد (د.ج)',
      ]);
      careHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      careHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      for (const item of reports.byCareType) {
        const r = reportSheet.addRow([
          safeExcelCell(item.careType),
          item.claimsCount,
          item.totalClaimed,
          item.totalApproved,
        ]);
        r.getCell(3).numFmt = '#,##0.00';
        r.getCell(4).numFmt = '#,##0.00';
      }

      reportSheet.addRow([]);
      const wilayaHeader = reportSheet.addRow([
        'الولاية',
        'عدد المنخرطين',
        'عدد ملفات المرض',
        'إجمالي التعويضات المعتمدة (د.ج)',
      ]);
      wilayaHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wilayaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      for (const item of reports.byWilaya) {
        const r = reportSheet.addRow([
          safeExcelCell(item.city),
          item.membersCount,
          item.claimsCount,
          item.totalApproved,
        ]);
        r.getCell(4).numFmt = '#,##0.00';
      }

      // Sheet 2: Members Roster
      styleTableSheet(
        workbook.addWorksheet('قاعدة بيانات المنخرطين'),
        [
          { header: 'رقم الانخراط', key: 'membershipNumber', width: 20 },
          { header: 'رمز الدخول', key: 'accessCode', width: 16 },
          { header: 'الاسم واللقب', key: 'fullName', width: 28 },
          { header: 'رقم التعريف (NIN/ID)', key: 'nationalId', width: 22 },
          { header: 'الجنس', key: 'gender', width: 12 },
          { header: 'الأقدمية (سنوات)', key: 'seniorityYears', width: 16 },
          { header: 'البريد الإلكتروني', key: 'email', width: 24 },
          { header: 'القطاع', key: 'sector', width: 30 },
          { header: 'الولاية', key: 'city', width: 18 },
          { header: 'البلدية', key: 'municipality', width: 20 },
          { header: 'المؤسسة', key: 'institution', width: 28 },
          { header: 'الهاتف', key: 'phone', width: 18 },
          { header: 'الحساب البريدي/البنكي (CCP/RIB)', key: 'rib', width: 26 },
          { header: 'صيغة التغطية', key: 'coveragePlan', width: 24 },
          { header: 'السقف السنوي (د.ج)', key: 'annualCeiling', width: 20, numFmt: '#,##0.00' },
          { header: 'الوضعية', key: 'status', width: 16 },
        ],
        snapshot.roster as unknown as Array<Record<string, unknown>>
      );

      // Sheet 3: Medical Claims
      styleTableSheet(
        workbook.addWorksheet('ملفات المرض والتعويضات'),
        [
          { header: 'المرجع', key: 'referenceCode', width: 24 },
          { header: 'رقم الانخراط', key: 'membershipNumber', width: 18 },
          { header: 'اسم المنخرط', key: 'memberName', width: 24 },
          { header: 'المستفيد', key: 'beneficiaryName', width: 24 },
          { header: 'صلة القرابة', key: 'beneficiaryRelation', width: 16 },
          { header: 'نوع الأداء', key: 'careType', width: 28 },
          { header: 'مقدم العلاج', key: 'providerName', width: 24 },
          { header: 'تاريخ العلاج', key: 'careDate', width: 14 },
          { header: 'المبلغ المصرح به (د.ج)', key: 'totalAmount', width: 20, numFmt: '#,##0.00' },
          { header: 'التعويض المقدر (د.ج)', key: 'estimatedReimbursement', width: 20, numFmt: '#,##0.00' },
          { header: 'المبلغ المعتمد (د.ج)', key: 'approvedAmount', width: 20, numFmt: '#,##0.00' },
          { header: 'الوضعية', key: 'status', width: 16 },
          { header: 'ملاحظة المراقب', key: 'reviewerNote', width: 28 },
        ],
        snapshot.claims as unknown as Array<Record<string, unknown>>
      );

      // Sheet 4: Pre-Authorizations
      styleTableSheet(
        workbook.addWorksheet('طلبات التكفل المسبق'),
        [
          { header: 'المرجع', key: 'referenceCode', width: 24 },
          { header: 'رقم الانخراط', key: 'ownerId', width: 18 },
          { header: 'المنخرط', key: 'memberName', width: 24 },
          { header: 'المستفيد', key: 'beneficiaryName', width: 24 },
          { header: 'نوع الإجراء', key: 'procedureType', width: 28 },
          { header: 'المصحة / المؤسسة', key: 'facilityName', width: 26 },
          { header: 'التاريخ المتوقع', key: 'expectedDate', width: 14 },
          { header: 'الكلفة التقديرية (د.ج)', key: 'estimatedCost', width: 20, numFmt: '#,##0.00' },
          { header: 'الوضعية', key: 'status', width: 16 },
          { header: 'ملاحظة الإدارة', key: 'reviewerNote', width: 28 },
        ],
        snapshot.authorizations as unknown as Array<Record<string, unknown>>
      );

      // Sheet 5: Individual Enrollments
      styleTableSheet(
        workbook.addWorksheet('طلبات الانخراط الفردي'),
        [
          { header: 'رقم التتبع', key: 'trackingCode', width: 18 },
          { header: 'الاسم الكامل', key: 'fullName', width: 26 },
          { header: 'رقم الضمان الاجتماعي (NSS)', key: 'socialSecurityNumber', width: 20 },
          { header: 'رقم التعريف الوطني (NIN)', key: 'nationalId', width: 22 },
          { header: 'تاريخ الميلاد', key: 'birthDate', width: 14 },
          { header: 'الهاتف', key: 'phone', width: 16 },
          { header: 'البريد', key: 'email', width: 22 },
          { header: 'الولاية', key: 'city', width: 16 },
          { header: 'القطاع', key: 'sector', width: 28 },
          { header: 'مؤسسة العمل', key: 'workplace', width: 24 },
          { header: 'الحساب البريدي/البنكي', key: 'rib', width: 24 },
          { header: 'صيغة التغطية', key: 'coveragePlan', width: 22 },
          { header: 'الحالة', key: 'status', width: 22 },
          { header: 'رقم الانخراط الممنوح', key: 'assignedMembershipNumber', width: 20 },
          { header: 'تاريخ الطلب', key: 'createdAt', width: 22 },
        ],
        snapshot.enrollments as unknown as Array<Record<string, unknown>>
      );

      // Sheet 6: Dependents
      styleTableSheet(
        workbook.addWorksheet('ذوي الحقوق'),
        [
          { header: 'رمز السجل', key: 'id', width: 22 },
          { header: 'رقم انخراط ولي الأمر', key: 'ownerId', width: 20 },
          { header: 'الاسم الكامل', key: 'fullName', width: 26 },
          { header: 'الصفة', key: 'relationship', width: 16 },
          { header: 'تاريخ الميلاد', key: 'birthDate', width: 14 },
          { header: 'رمز التغطية', key: 'coverageCode', width: 22 },
          { header: 'نشط', key: 'activeLabel', width: 12 },
        ],
        snapshot.dependents.map((d) => ({
          ...d,
          activeLabel: d.active ? 'نعم' : 'لا',
        }))
      );

      // Sheet 7: 96 Wilaya Offices
      styleTableSheet(
        workbook.addWorksheet('المقرات الولائية'),
        [
          { header: 'الرمز', key: 'code', width: 10 },
          { header: 'الولاية', key: 'wilayaName', width: 22 },
          { header: 'تسمية المركز', key: 'officeName', width: 28 },
          { header: 'الممثل / المكلف', key: 'representativeName', width: 24 },
          { header: 'الهاتف', key: 'phone', width: 18 },
          { header: 'معلومات الحساب', key: 'accountInfo', width: 26 },
          { header: 'العنوان الكامل', key: 'address', width: 40 },
          { header: 'رابط خرائط قوقل 1', key: 'googleMapsUrl', width: 34 },
          { header: 'رابط خرائط قوقل 2', key: 'secondaryMapsUrl', width: 34 },
          { header: 'رابط التواصل', key: 'socialUrl', width: 30 },
        ],
        snapshot.wilayas as unknown as Array<Record<string, unknown>>
      );

      const tmpFile = `${excelFile}.tmp`;
      await workbook.xlsx.writeFile(tmpFile);
      fs.renameSync(tmpFile, excelFile);

      const finalMeta: ExcelSyncMeta = {
        ...provisionalMeta,
        fileSizeBytes: fs.statSync(excelFile).size,
      };
      fs.writeFileSync(metaFile, JSON.stringify(finalMeta, null, 2), 'utf8');
      return finalMeta;
    });

  return syncChain;
}

export async function parseExcelImportWorkbook(
  buffer: Buffer,
  validators: {
    safeIdRegex: RegExp;
    validPlans: Set<string>;
    validStatuses: Set<string>;
    isValidWilayaCode: (code: string) => boolean;
    sanitizeWebUrl: (raw: unknown) => { ok: boolean; value: string };
  }
): Promise<{
  roster: ExcelRosterRecord[];
  wilayas: Array<Partial<ExcelWilayaRecord> & { code: string }>;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const rosterSheet =
    workbook.getWorksheet('قاعدة بيانات المنخرطين') ||
    workbook.worksheets.find((ws) => {
      const h1 = readCellText(ws.getRow(1).getCell(1).value);
      return h1 === 'رقم الانخراط' || h1 === 'membershipNumber';
    });

  const roster: ExcelRosterRecord[] = [];
  if (rosterSheet) {
    const headerMap = new Map<string, number>();
    const headerRow = rosterSheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const key = readCellText(cell.value);
      if (key) headerMap.set(key, colNumber);
    });

    const getCol = (row: ExcelJS.Row, ...names: string[]) => {
      for (const n of names) {
        const idx = headerMap.get(n);
        if (idx) return readCellText(row.getCell(idx).value);
      }
      return '';
    };

    rosterSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const membershipNumber = getCol(row, 'رقم الانخراط', 'membershipNumber');
      const accessCode = getCol(row, 'رمز الدخول', 'accessCode');
      const fullName = getCol(row, 'الاسم واللقب', 'fullName').slice(0, 120);
      const nationalId = getCol(row, 'رقم التعريف (NIN/ID)', 'رقم التعريف الوطني', 'nationalId').slice(0, 32);

      if (
        !validators.safeIdRegex.test(membershipNumber) ||
        membershipNumber.length < 4 ||
        accessCode.length < 4 ||
        fullName.length < 2 ||
        !validators.safeIdRegex.test(nationalId)
      ) {
        return;
      }

      const plan = getCol(row, 'صيغة التغطية', 'coveragePlan');
      const status = getCol(row, 'الوضعية', 'status');
      const rawCeiling = Number(getCol(row, 'السقف السنوي (د.ج)', 'annualCeiling').replace(/,/g, ''));
      const rawGender = getCol(row, 'الجنس', 'gender');
      const gender = rawGender === 'أنثى' ? 'أنثى' : 'ذكر';
      const rawSeniority = Number(getCol(row, 'الأقدمية (سنوات)', 'seniorityYears'));
      const seniorityYears =
        Number.isFinite(rawSeniority) && rawSeniority >= 0 && rawSeniority <= 60
          ? Math.round(rawSeniority)
          : 5;
      const city = getCol(row, 'الولاية', 'city').slice(0, 80) || 'الجزائر';
      const sector =
        getCol(row, 'القطاع', 'sector').slice(0, 100) || 'التربية الوطنية — التعليم الثانوي';
      const municipality = getCol(row, 'البلدية', 'municipality').slice(0, 80) || city;
      const institution = getCol(row, 'المؤسسة', 'institution').slice(0, 140) || sector;

      roster.push({
        membershipNumber,
        accessCode: accessCode.slice(0, 64),
        fullName,
        email: getCol(row, 'البريد الإلكتروني', 'email').slice(0, 160) || 'member@mutnatec.dz',
        nationalId,
        gender,
        seniorityYears,
        sector,
        city,
        municipality,
        institution,
        phone: getCol(row, 'الهاتف', 'phone').slice(0, 30) || '0550000000',
        rib: getCol(row, 'الحساب البريدي/البنكي (CCP/RIB)', 'rib').replace(/\s+/g, '').slice(0, 34) || '00799999000000000000',
        coveragePlan: validators.validPlans.has(plan) ? plan : 'التغطية التكميلية+',
        annualCeiling: Math.max(10000, Math.min(2000000, Number.isFinite(rawCeiling) && rawCeiling > 0 ? rawCeiling : 250000)),
        status: validators.validStatuses.has(status) ? status : 'نشط',
      });
    });
  }

  const wilayaSheet = workbook.getWorksheet('المقرات الولائية');
  const wilayas: Array<Partial<ExcelWilayaRecord> & { code: string }> = [];
  if (wilayaSheet) {
    const headerMap = new Map<string, number>();
    wilayaSheet.getRow(1).eachCell((cell, colNumber) => {
      const key = readCellText(cell.value);
      if (key) headerMap.set(key, colNumber);
    });
    const getCol = (row: ExcelJS.Row, ...names: string[]) => {
      for (const n of names) {
        const idx = headerMap.get(n);
        if (idx) return readCellText(row.getCell(idx).value);
      }
      return '';
    };

    wilayaSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const code = getCol(row, 'الرمز', 'code').padStart(2, '0');
      if (!validators.isValidWilayaCode(code)) return;

      const g1 = validators.sanitizeWebUrl(getCol(row, 'رابط خرائط قوقل 1', 'googleMapsUrl'));
      const g2 = validators.sanitizeWebUrl(getCol(row, 'رابط خرائط قوقل 2', 'secondaryMapsUrl'));
      const social = validators.sanitizeWebUrl(getCol(row, 'رابط التواصل', 'socialUrl'));

      wilayas.push({
        code,
        wilayaName: getCol(row, 'الولاية', 'wilayaName').slice(0, 80),
        officeName: getCol(row, 'تسمية المركز', 'officeName').slice(0, 140),
        representativeName: getCol(row, 'الممثل / المكلف', 'representativeName').slice(0, 120),
        phone: getCol(row, 'الهاتف', 'phone').slice(0, 60),
        accountInfo: getCol(row, 'معلومات الحساب', 'accountInfo').slice(0, 180),
        address: getCol(row, 'العنوان الكامل', 'address').slice(0, 220),
        googleMapsUrl: g1.ok ? g1.value : '',
        secondaryMapsUrl: g2.ok ? g2.value : '',
        socialUrl: social.ok ? social.value : '',
      });
    });
  }

  return { roster, wilayas };
}
