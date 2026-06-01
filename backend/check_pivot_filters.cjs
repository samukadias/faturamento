const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const geralSheet = workbook.Sheets['Base ERP_Geral'];
  const rawGeral = XLSX.utils.sheet_to_json(geralSheet, { header: 1, defval: null });

  // Get headers
  const headers = rawGeral[0];
  const origIdx = headers.indexOf('Origem');
  const statusIdx = headers.indexOf('Status Nota Fiscal');
  const mesAnoIdx = headers.indexOf('Mês &ANO') >= 0 ? headers.indexOf('Mês &ANO') : headers.indexOf('Mês&ANO');
  const valIdx = headers.indexOf('Valor Nota Fiscal');

  // Let's load the Pivot Table values from Faturamento Geral
  // DIÁRIO OFICIAL: 3/2026, 4/2026, 5/2026
  // FINANCEIRA: 3/2026, 4/2026, 5/2026
  // DRC: 3/2025, 12/2024, 7/2025, 8/2025, 10/2025, 11/2025, 12/2025, 1/2026, 2/2026, 3/2026, 4/2026, 5/2026
  // DETRAN: 3/2026, 4/2026, 5/2026

  let countFilteredOut = 0;
  let valFilteredOut = 0;

  console.log('Analisando notas ativas (ABERTA)...');
  
  const skippedMonthsByOrigem = {
    'DIÁRIO OFICIAL': new Set(),
    'FINANCEIRA': new Set(),
    'DRC': new Set(),
    'DETRAN': new Set()
  };

  const allowedMonthsByOrigem = {
    'DIÁRIO OFICIAL': ['3/2026', '4/2026', '5/2026'],
    'FINANCEIRA': ['3/2026', '4/2026', '5/2026'],
    'DRC': ['3/2025', '12/2024', '7/2025', '8/2025', '10/2025', '11/2025', '12/2025', '1/2026', '2/2026', '3/2026', '4/2026', '5/2026'],
    'DETRAN': ['3/2026', '4/2026', '5/2026']
  };

  let totalActive = 0;
  let totalAllowed = 0;

  for (let i = 1; i < rawGeral.length; i++) {
    const row = rawGeral[i];
    if (!row) continue;

    const val = parseFloat(row[valIdx] || 0);
    const status = String(row[statusIdx] || 'ABERTA').trim();
    const orig = String(row[origIdx] || '').trim();
    const mesAno = String(row[mesAnoIdx] || '').trim();

    if (status === 'ABERTA') {
      totalActive += val;
      const allowed = allowedMonthsByOrigem[orig];
      if (allowed && allowed.includes(mesAno)) {
        totalAllowed += val;
      } else {
        countFilteredOut++;
        valFilteredOut += val;
        if (orig) {
          skippedMonthsByOrigem[orig].add(mesAno);
        }
      }
    }
  }

  console.log(`Faturamento Total de Abertas na Base: R$ ${totalActive.toLocaleString('pt-BR')}`);
  console.log(`Faturamento das que constam no Pivot do Excel: R$ ${totalAllowed.toLocaleString('pt-BR')}`);
  console.log(`Diferença (Não mostradas no Pivot): R$ ${valFilteredOut.toLocaleString('pt-BR')} (Qtd: ${countFilteredOut})`);
  console.log('Meses ignorados por Origem:');
  console.log(skippedMonthsByOrigem);

} catch (e) {
  console.error(e);
}
