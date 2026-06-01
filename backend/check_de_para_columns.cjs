const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['DE_PARA'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  console.log('=== DE_PARA HEADER & FIRST ROWS ===');
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    const row = raw[i];
    if (row) {
      // Print columns A-H (indices 0-7), P-Q (indices 15-16), U-V (indices 20-21)
      console.log(`Row ${i+1}:`);
      console.log(`  A-H:`, row.slice(0, 8));
      console.log(`  P-Q (15-16):`, [row[15], row[16]]);
      console.log(`  U-V (20-21):`, [row[20], row[21]]);
    }
  }

} catch(e) {
  console.error(e);
}
