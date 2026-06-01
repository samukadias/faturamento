const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Searching for 41700655 in sheets...');
  
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    for (let r = 0; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val !== null && val !== undefined) {
          const strVal = String(val);
          if (strVal.includes('41.700.655') || strVal.includes('41700655') || strVal.includes('41.700') || strVal.includes('41700')) {
            console.log(`FOUND! Aba: "${name}", Celula: r${r+1}c${c+1}, Valor: ${val}`);
            console.log(`Row context:`, JSON.stringify(row.slice(Math.max(0, c - 2), c + 5)));
          }
        }
      }
    }
  }

} catch(e) {
  console.error(e);
}
