const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Base ERP_Geral'];
  
  console.log('=== FORMULAS IN COLUMNS A-F ===');
  for (let r = 2; r <= 15; r++) {
    console.log(`Row ${r}:`);
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
      const cell = sheet[`${col}${r}`];
      if (cell) {
        console.log(`  ${col}: Val="${cell.v}" | Form="${cell.f || ''}"`);
      }
    });
  }

} catch(e) {
  console.error(e);
}
