const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  
  // 1. Analisar status na Base ERP_Geral
  const generalSheet = workbook.Sheets['Base ERP_Geral'];
  const rawGen = XLSX.utils.sheet_to_json(generalSheet, { header: 1, defval: null });
  
  let headerRowIdx = 0;
  let maxNonNull = 0;
  for (let i = 0; i < Math.min(10, rawGen.length); i++) {
    const nonNull = (rawGen[i] || []).filter(v => v !== null && v !== '').length;
    if (nonNull > maxNonNull) { maxNonNull = nonNull; headerRowIdx = i; }
  }
  
  const headersGen = rawGen[headerRowIdx].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const valIdxGen = headersGen.indexOf('Valor Nota Fiscal');
  const statusIdxGen = headersGen.indexOf('Status Nota Fiscal');

  const statusSummary = {};
  for (let i = headerRowIdx + 1; i < rawGen.length; i++) {
    const row = rawGen[i];
    if (!row) continue;
    const val = parseFloat(row[valIdxGen] || 0);
    const status = String(row[statusIdxGen] || 'ABERTA').trim();
    
    if (!statusSummary[status]) {
      statusSummary[status] = { total: 0, count: 0 };
    }
    statusSummary[status].total += val;
    statusSummary[status].count += 1;
  }

  console.log('=== SUMMARY STATUS IN EXCEL (Base ERP_Geral) ===');
  Object.keys(statusSummary).forEach(s => {
    console.log(`Status: "${s.padEnd(12)}" | Total: R$ ${statusSummary[s].total.toLocaleString('pt-BR')} (${statusSummary[s].count} linhas)`);
  });

  // 2. Analisar status na Base ERP_ND
  const ndSheet = workbook.Sheets['Base ERP_ND'];
  const rawNd = XLSX.utils.sheet_to_json(ndSheet, { header: 1, defval: null });
  const headersNd = rawNd[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const valIdxNd = headersNd.indexOf('Valor');
  const statusIdxNd = headersNd.indexOf('Status');

  const statusSummaryNd = {};
  for (let i = 1; i < rawNd.length; i++) {
    const row = rawNd[i];
    if (!row) continue;
    const val = parseFloat(row[valIdxNd] || 0);
    const status = String(row[statusIdxNd] || 'ABERTA').trim();
    
    if (!statusSummaryNd[status]) {
      statusSummaryNd[status] = { total: 0, count: 0 };
    }
    statusSummaryNd[status].total += val;
    statusSummaryNd[status].count += 1;
  }

  console.log('\n=== SUMMARY STATUS IN EXCEL (Base ERP_ND) ===');
  Object.keys(statusSummaryNd).forEach(s => {
    console.log(`Status: "${s.padEnd(12)}" | Total: R$ ${statusSummaryNd[s].total.toLocaleString('pt-BR')} (${statusSummaryNd[s].count} linhas)`);
  });

} catch (e) {
  console.error(e);
}
