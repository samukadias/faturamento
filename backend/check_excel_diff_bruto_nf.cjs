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
  const valBrutoIdx = headers.indexOf('Valor Bruto');
  const valNfIdx = headers.indexOf('Valor Nota Fiscal');

  let diffCount = 0;
  let sumBrutoExcel = 0;
  let sumNfExcel = 0;

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    
    const bruto = parseFloat(row[valBrutoIdx] || 0);
    const nf = parseFloat(row[valNfIdx] || 0);

    sumBrutoExcel += bruto;
    sumNfExcel += nf;

    if (Math.abs(bruto - nf) > 0.01) {
      diffCount++;
      if (diffCount <= 15) {
        console.log(`Excel Diff #${diffCount}: Row: ${i+1}, NF#: ${row[22]}, Razao: ${String(row[6]).substring(0,20)}, NF: ${nf}, Bruto: ${bruto}`);
      }
    }
  }

  console.log(`\nSoma Valor Bruto no Excel: R$ ${sumBrutoExcel.toLocaleString('pt-BR')}`);
  console.log(`Soma Valor Nota Fiscal no Excel: R$ ${sumNfExcel.toLocaleString('pt-BR')}`);
  console.log(`Total de linhas com diferença no Excel: ${diffCount}`);

} catch(e) {
  console.error(e);
}
