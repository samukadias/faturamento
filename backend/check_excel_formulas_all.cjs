const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Base ERP_Geral'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  let headerRowIdx = 0;
  let maxNonNull = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const nonNull = (raw[i] || []).filter(v => v !== null && v !== '').length;
    if (nonNull > maxNonNull) { maxNonNull = nonNull; headerRowIdx = i; }
  }

  const headers = raw[headerRowIdx].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const origIdx = headers.indexOf('Origem');

  console.log(`Origem column index: ${origIdx}`);

  const counts = {};
  const formulaTypes = {};

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: i, c: origIdx });
    const cell = sheet[cellAddress];
    
    let valStr = 'Vazio';
    let hasFormula = false;

    if (cell) {
      valStr = String(cell.v).trim();
      if (cell.f) hasFormula = true;
    }

    counts[valStr] = (counts[valStr] || 0) + 1;
    const fKey = hasFormula ? 'Com Formula' : 'Sem Formula';
    formulaTypes[fKey] = (formulaTypes[fKey] || 0) + 1;
  }

  console.log('=== DISTRIBUTION OF VALUES IN ORIGEM COLUMN (EXCEL) ===');
  console.log(counts);
  console.log('=== FORMULA PRESENCE ===');
  console.log(formulaTypes);

} catch (e) {
  console.error(e);
}
