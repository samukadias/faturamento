const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Base ERP_Geral'];
  
  // Imprimir as células A2, B2, C2, D2, E2, F2 com seus valores e fórmulas
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  cols.forEach(col => {
    const cell = sheet[`${col}2`];
    console.log(`Cell ${col}2:`);
    if (cell) {
      console.log(`  Value (v):`, cell.v);
      console.log(`  Formula (f):`, cell.f);
      console.log(`  Type (t):`, cell.t);
      console.log(`  Raw:`, JSON.stringify(cell));
    } else {
      console.log(`  Vazia`);
    }
  });

} catch(e) {
  console.error(e);
}
