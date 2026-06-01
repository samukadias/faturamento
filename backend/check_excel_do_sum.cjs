const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Base ERP_Geral'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const headers = raw[0];
  const valIdx = headers.indexOf('Valor Nota Fiscal');
  const statusIdx = headers.indexOf('Status Nota Fiscal');
  const origIdx = headers.indexOf('Origem');

  const sums = {};
  const counts = {};

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    
    const val = parseFloat(row[valIdx] || 0);
    const status = String(row[statusIdx] || 'ABERTA').trim();
    const orig = String(row[origIdx] || 'Vazio').trim();

    if (status === 'ABERTA') {
      sums[orig] = (sums[orig] || 0) + val;
      counts[orig] = (counts[orig] || 0) + 1;
    }
  }

  console.log('Sums of Valor Nota Fiscal for ABERTAS in Excel:');
  console.log(sums);
  console.log('Counts of ABERTAS in Excel:');
  console.log(counts);

} catch(e) {
  console.error(e);
}
