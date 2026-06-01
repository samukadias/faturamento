const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');
const workbook = XLSX.readFile(filePath, { type: 'file', defval: null });

const targetSheets = ['Base apontamento', 'Base ERP_Geral', 'Base ERP_ND', 'DE_PARA'];
const output = {};

for (const sheetName of targetSheets) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) { output[sheetName] = null; continue; }
  
  // Get rows as array of arrays
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  // Find the header row (first row with most non-null values in first 10 rows)
  let headerRow = 0;
  let maxNonNull = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const nonNull = (raw[i] || []).filter(v => v !== null && v !== '').length;
    if (nonNull > maxNonNull) { maxNonNull = nonNull; headerRow = i; }
  }
  
  const headers = (raw[headerRow] || []).map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  
  // Get 5 data rows after header
  const dataRows = raw.slice(headerRow + 1, headerRow + 6).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h && row[i] !== null) obj[h] = row[i]; });
    return obj;
  });
  
  output[sheetName] = {
    headerRow,
    headers: headers.filter(h => !h.startsWith('COL_') || true),
    totalRows: raw.length,
    sampleData: dataRows
  };
  
  console.log(`\n=== ${sheetName} (header at row ${headerRow}) ===`);
  console.log('Headers:', JSON.stringify(headers.slice(0, 25)));
  console.log('Sample row 1:', JSON.stringify(dataRows[0]));
}

fs.writeFileSync('/Users/macbookair/.gemini/antigravity/scratch/faturamento-app/excel_columns.json', 
  JSON.stringify(output, null, 2), 'utf8');
console.log('\nSalvo em excel_columns.json');
