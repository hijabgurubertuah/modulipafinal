/**
 * Konfigurasi Langsung Spreadsheet & Link CSV Siswa
 * 
 * Anda dapat menanam Spreadsheet ID atau Link CSV langsung di sini
 * tanpa perlu bergantung pada panel admin ataupun database eksternal.
 */
export const SPREADSHEET_CONFIG = {
  /**
   * Masukkan Spreadsheet ID Anda di sini (deretan huruf & angka antara /d/ dan /edit di link Google Sheets)
   * Contoh: '1y8MREQ6tr497vX_3MiO5EJeZK7ufbHH--xfhUUAOADU'
   * ATAU Anda juga bisa menempelkan link CSV lengkap di sini.
   */
  studentCsvOrSheetId: ""
};

/**
 * Helper untuk mendapatkan URL CSV yang valid dari konfigurasi di atas
 */
export function getDirectCsvUrl(): string {
  const val = (SPREADSHEET_CONFIG.studentCsvOrSheetId || '').trim();
  if (!val) return '';
  
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
  
  // Jika berupa Spreadsheet ID saja (misal: 1AbcXYZ...)
  return `https://docs.google.com/spreadsheets/d/${val}/export?format=csv`;
}
