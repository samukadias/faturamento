const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Faturamento Geral'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log('=== FATURAMENTO GERAL LAYOUT (ROWS 1-45) ===');
  for (let i = 0; i < Math.min(45, raw.length); i++) {
    const row = raw[i];
    console.log(`L${i+1}:`, JSON.stringify(row.slice(0, 10)));
  }

} catch(e) {
  console.error(e);
}
