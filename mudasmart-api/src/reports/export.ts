import ExcelJS from 'exceljs';

type DailyReport = ReturnType<typeof import('./service').reportsService.daily>;
type MonthlyReport = ReturnType<typeof import('./service').reportsService.monthly>;

const headerStyle = (sheet: ExcelJS.Worksheet) => {
  sheet.getRow(1).font = { bold: true };
};

export const buildDailyWorkbook = async (report: DailyReport) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Rekap Harian');
  sheet.columns = [
    { header: 'Kelas', key: 'className', width: 18 },
    { header: 'NIS', key: 'nis', width: 14 },
    { header: 'Nama', key: 'fullName', width: 30 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Jam', key: 'time', width: 10 },
  ];
  for (const cls of report.classes) {
    for (const student of cls.students as Array<{ nis: string; fullName: string; status: string | null; scannedAt: number | null }>) {
      sheet.addRow({
        className: cls.className,
        nis: student.nis,
        fullName: student.fullName,
        status: student.status === null ? '-' : student.status === 'tidak hadir' ? 'Tidak Hadir' : student.status === 'hadir' ? 'Hadir' : 'Telat',
        time: student.scannedAt
          ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(student.scannedAt))
          : '',
      });
    }
  }
  headerStyle(sheet);
  return workbook.xlsx.writeBuffer();
};

export const buildMonthlyWorkbook = async (report: MonthlyReport) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Rekap Bulanan');
  sheet.columns = [
    { header: 'Kelas', key: 'className', width: 18 },
    { header: 'NIS', key: 'nis', width: 14 },
    { header: 'Nama', key: 'fullName', width: 30 },
    { header: 'Hadir', key: 'hadir', width: 8 },
    { header: 'Telat', key: 'telat', width: 8 },
    { header: 'Tidak Hadir', key: 'tidakHadir', width: 12 },
  ];
  for (const row of report.rows) sheet.addRow(row);
  headerStyle(sheet);
  return workbook.xlsx.writeBuffer();
};
