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

  console.log(`Val Bruto index: ${valBrutoIdx}, Val NF index: ${valNfIdx}`);

  let sumBrutoExcel = 0;
  let sumNfExcel = 0;
  let fallbackCount = 0;

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    
    const brutoRaw = row[valBrutoIdx];
    const bruto = brutoRaw !== null && brutoRaw !== undefined ? parseFloat(brutoRaw) : null;
    const nf = parseFloat(row[valNfIdx] || 0);

    if (bruto === null || isNaN(bruto)) {
      fallbackCount++;
    } else {
      sumBrutoExcel += bruto;
    }
    sumNfExcel += nf;
  }

  console.log(`Soma Coluna AY (Valor Bruto) excluindo fallbacks: R$ ${sumBrutoExcel.toLocaleString('pt-BR')}`);
  console.log(`Soma Coluna AC (Valor Nota Fiscal): R$ ${sumNfExcel.toLocaleString('pt-BR')}`);
  console.log(`Quantidade de linhas com Valor Bruto nulo/vazio: ${fallbackCount}`);

} catch(e) {
  console.error(e);
}
