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
  const valIdx = headers.indexOf('Valor Nota Fiscal');
  const statusIdx = headers.indexOf('Status Nota Fiscal');
  const origIdx = headers.indexOf('Origem');
  const mesIdx = headers.indexOf('Mês &ANO') >= 0 ? headers.indexOf('Mês &ANO') : headers.indexOf('Mês&ANO');

  console.log(`Headers found: Origem idx=${origIdx}, Mes idx=${mesIdx}, Val idx=${valIdx}`);

  const groups = {};

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;

    const status = String(row[statusIdx] || 'ABERTA').trim();
    if (status !== 'ABERTA') continue;

    const val = parseFloat(row[valIdx] || 0);
    const orig = String(row[origIdx] || 'Vazio').trim();
    const mes = String(row[mesIdx] || 'Sem Mes').trim();

    const key = `${orig} | ${mes}`;
    groups[key] = (groups[key] || 0) + val;
  }

  console.log('=== SOMAS DO EXCEL RAW (ABERTAS) POR ORIGEM E MÊS ===');
  const sortedKeys = Object.keys(groups).sort();
  sortedKeys.forEach(k => {
    console.log(`  ${k}: R$ ${groups[k].toLocaleString('pt-BR')}`);
  });

} catch(e) {
  console.error(e);
}
