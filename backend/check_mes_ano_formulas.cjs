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
  const mesAnoIdx = headers.indexOf('Mês &ANO') >= 0 ? headers.indexOf('Mês &ANO') : headers.indexOf('Mês&ANO');
  const refReceitaIdx = headers.indexOf('Periodo Referência da  Receita'); // note the non-breaking space or normal space!
  const pracaIdx = headers.indexOf('Praça Faturamento');
  const emissaoIdx = headers.indexOf('Data Emissão NF Prefeitura');
  const origemIdx = headers.indexOf('Origem');

  console.log(`Indices - Mês&ANO: ${mesAnoIdx}, RefReceita: ${refReceitaIdx}, Emissão: ${emissaoIdx}, Origem: ${origemIdx}`);

  let count = 0;
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;

    count++;
    if (count <= 25) {
      console.log(`Row ${i+1}:`);
      console.log(`  Mês & ANO: ${row[mesAnoIdx]}`);
      console.log(`  Ref Receita Raw: ${row[9]} | Ref Receita Header: ${row[refReceitaIdx]}`);
      console.log(`  Data Emissao: ${row[emissaoIdx]}`);
      console.log(`  Origem: ${row[origemIdx]}`);
    }
  }

} catch(e) {
  console.error(e);
}
