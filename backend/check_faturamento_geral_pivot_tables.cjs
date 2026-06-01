const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Faturamento Geral'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log('=== FATURAMENTO GERAL COLUMNS I TO Z (ROWS 1-35) ===');
  for (let i = 0; i < Math.min(35, raw.length); i++) {
    const row = raw[i];
    // Show from index 8 (Column I) to index 25 (Column Z)
    if (row && row.length > 8) {
      const sliced = row.slice(8, 26);
      if (sliced.some(v => v !== '')) {
        console.log(`L${i+1}:`, JSON.stringify(sliced));
      }
    }
  }

} catch(e) {
  console.error(e);
}
