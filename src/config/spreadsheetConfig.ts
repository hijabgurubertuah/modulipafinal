/**
 * Konfigurasi Langsung Spreadsheet & Link CSV Siswa
 * 
 * Anda dapat menanam Spreadsheet ID atau Link CSV langsung di sini
 * tanpa perlu bergantung pada panel admin ataupun database eksternal.
 */
/**
 * Konfigurasi Langsung Spreadsheet & Link CSV Siswa
 * 
 * Anda dapat menanam Spreadsheet ID atau Link CSV langsung di sini
 * tanpa perlu bergantung pada panel admin ataupun database eksternal.
 */
export const SPREADSHEET_CONFIG = {
  /**
   * 1. ID Spreadsheet Utama (antara /d/ dan /edit):
   * 15u_RpWrMHwTRDau0H5fwiM_EAAOHKe0dwVPVLIOzA9Y
   * 
   * 2. ID Publikasi CSV Web (Publish to Web):
   * 2PACX-1vTdvhYPq3aVHpE643ezl4Vpx0JnztLdNx2YbG5RSQJSalpe6u6dvkdli-FCAz4T_oTtw-Myrq1_s3sM
   */
  spreadsheetId: "15u_RpWrMHwTRDau0H5fwiM_EAAOHKe0dwVPVLIOzA9Y",
  publishId: "2PACX-1vTdvhYPq3aVHpE643ezl4Vpx0JnztLdNx2YbG5RSQJSalpe6u6dvkdli-FCAz4T_oTtw-Myrq1_s3sM",

  /**
   * Link CSV langsung yang aktif digunakan:
   */
  studentCsvOrSheetId: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTdvhYPq3aVHpE643ezl4Vpx0JnztLdNx2YbG5RSQJSalpe6u6dvkdli-FCAz4T_oTtw-Myrq1_s3sM/pub?output=csv"
};

/**
 * Helper untuk mendapatkan URL CSV yang valid dari konfigurasi di atas
 */
export function getDirectCsvUrl(): string {
  const val = (SPREADSHEET_CONFIG.studentCsvOrSheetId || '').trim();
  if (!val) {
    if (SPREADSHEET_CONFIG.publishId) {
      return `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_CONFIG.publishId}/pub?output=csv`;
    }
    if (SPREADSHEET_CONFIG.spreadsheetId) {
      return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_CONFIG.spreadsheetId}/export?format=csv`;
    }
    return '';
  }
  
  // Jika sudah berupa URL lengkap
  if (val.startsWith('http://') || val.startsWith('https://')) {
    if (val.includes('docs.google.com/spreadsheets') && !val.includes('export?format=csv') && !val.includes('output=csv')) {
      const idMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
      }
    }
    return val;
  }
  
  // Jika berupa Publish to Web ID (diawali 2PACX-)
  if (val.startsWith('2PACX-')) {
    return `https://docs.google.com/spreadsheets/d/e/${val}/pub?output=csv`;
  }

  // Jika berupa Spreadsheet ID biasa (misal: 15u_RpWr...)
  return `https://docs.google.com/spreadsheets/d/${val}/export?format=csv`;
}
