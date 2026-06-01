const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Faturamento Geral'];
  
  console.log('=== FORMULAS IN FATURAMENTO GERAL ===');
  for (let r = 2; r <= 32; r++) {
    const cellE = sheet[`E${r}`];
    const cellF = sheet[`F${r}`];
    console.log(`Row ${r}:`);
    if (cellE) console.log(`  E: Val="${cellE.v}" | Form="${cellE.f || ''}"`);
    if (cellF) console.log(`  F: Val="${cellF.v}" | Form="${cellF.f || ''}"`);
  }

} catch(e) {
  console.error(e);
}
