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
  headers.forEach((h, idx) => {
    console.log(`${idx}: "${h}"`);
  });

} catch(e) {
  console.error(e);
}
