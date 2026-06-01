const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Faturamento Geral'];
  
  console.log('=== FORMULAS IN FATURAMENTO GERAL D-G ===');
  for (let r = 2; r <= 32; r++) {
    console.log(`Row ${r}:`);
    ['D', 'E', 'F', 'G'].forEach(col => {
      const cell = sheet[`${col}${r}`];
      if (cell) {
        console.log(`  ${col}: Val="${cell.v}" | Form="${cell.f || ''}"`);
      }
    });
  }

} catch(e) {
  console.error(e);
}
