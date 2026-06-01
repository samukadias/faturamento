const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  
  // 1. Somar coluna 'Valor Nota Fiscal' na aba 'Base ERP_Geral'
  const generalSheet = workbook.Sheets['Base ERP_Geral'];
  const rawGen = XLSX.utils.sheet_to_json(generalSheet, { header: 1, defval: null });
  
  // Encontrar o cabeçalho dinamicamente (primeiras 10 linhas)
  let headerRowIdx = 0;
  let maxNonNull = 0;
  for (let i = 0; i < Math.min(10, rawGen.length); i++) {
    const nonNull = (rawGen[i] || []).filter(v => v !== null && v !== '').length;
    if (nonNull > maxNonNull) { maxNonNull = nonNull; headerRowIdx = i; }
  }
  
  const headersGen = rawGen[headerRowIdx].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const valIdxGen = headersGen.indexOf('Valor Nota Fiscal');
  const statusIdxGen = headersGen.indexOf('Status Nota Fiscal');
  const mesAnoIdxGen = headersGen.indexOf('Mês &ANO') >= 0 ? headersGen.indexOf('Mês &ANO') : headersGen.indexOf('Mês&ANO');

  console.log(`Linha do cabeçalho encontrada na linha ${headerRowIdx+1}`);
  console.log(`Índice do Valor: ${valIdxGen}, Índice do Status: ${statusIdxGen}, Índice do Mês: ${mesAnoIdxGen}`);

  let totalNfExcelAll = 0;
  let totalNfExcelAbertas = 0;
  let totalNfExcelCancel = 0;
  
  let totalNfExcelAllAbril = 0;
  let totalNfExcelAbertasAbril = 0;
  let totalNfExcelCancelAbril = 0;

  for (let i = headerRowIdx + 1; i < rawGen.length; i++) {
    const row = rawGen[i];
    if (!row) continue;
    const val = parseFloat(row[valIdxGen] || 0);
    const status = String(row[statusIdxGen] || 'ABERTA').trim();
    const mesAno = String(row[mesAnoIdxGen] || '').trim();
    
    totalNfExcelAll += val;
    if (status === 'ABERTA') {
      totalNfExcelAbertas += val;
    } else if (status === 'CANCEL') {
      totalNfExcelCancel += val;
    }

    if (mesAno === '4/2026') {
      totalNfExcelAllAbril += val;
      if (status === 'ABERTA') {
        totalNfExcelAbertasAbril += val;
      } else if (status === 'CANCEL') {
        totalNfExcelCancelAbril += val;
      }
    }
  }

  // 2. Somar coluna 'Valor' na aba 'Base ERP_ND'
  const ndSheet = workbook.Sheets['Base ERP_ND'];
  const rawNd = XLSX.utils.sheet_to_json(ndSheet, { header: 1, defval: null });
  const headersNd = rawNd[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const valIdxNd = headersNd.indexOf('Valor');
  const statusIdxNd = headersNd.indexOf('Status');
  
  let totalNdExcelAll = 0;
  let totalNdExcelAbertas = 0;

  for (let i = 1; i < rawNd.length; i++) {
    const row = rawNd[i];
    if (!row) continue;
    const val = parseFloat(row[valIdxNd] || 0);
    const status = String(row[statusIdxNd] || 'ABERTA').trim();
    
    totalNdExcelAll += val;
    if (status === 'ABERTA') {
      totalNdExcelAbertas += val;
    }
  }

  console.log('\n=== SOMAS DIRETAS DA PLANILHA EXCEL (DINÂMICO) ===');
  console.log(`Base ERP_Geral - Total Geral (Todos os meses, qualquer status): R$ ${totalNfExcelAll.toLocaleString('pt-BR')}`);
  console.log(`Base ERP_Geral - Abertas (Todos os meses): R$ ${totalNfExcelAbertas.toLocaleString('pt-BR')}`);
  console.log(`Base ERP_Geral - Canceladas (Todos os meses): R$ ${totalNfExcelCancel.toLocaleString('pt-BR')}`);
  
  console.log(`\nBase ERP_Geral (Abril/2026) - Total Geral: R$ ${totalNfExcelAllAbril.toLocaleString('pt-BR')}`);
  console.log(`Base ERP_Geral (Abril/2026) - Abertas: R$ ${totalNfExcelAbertasAbril.toLocaleString('pt-BR')}`);
  console.log(`Base ERP_Geral (Abril/2026) - Canceladas: R$ ${totalNfExcelCancelAbril.toLocaleString('pt-BR')}`);

  console.log(`\nBase ERP_ND - Total Geral (Todos os meses): R$ ${totalNdExcelAll.toLocaleString('pt-BR')}`);
  console.log(`Base ERP_ND - Abertas (Todos os meses): R$ ${totalNdExcelAbertas.toLocaleString('pt-BR')}`);

  console.log('\n--- COM PARA O TOTAL GERAL DO BANCO (TODOS OS MESES) ---');
  console.log(`Soma (NF Abertas Global + ND Abertas Global): R$ ${(totalNfExcelAbertas + totalNdExcelAbertas).toLocaleString('pt-BR')}`);
  console.log(`Soma (NF Qualquer Status Global + ND Abertas Global): R$ ${(totalNfExcelAll + totalNdExcelAbertas).toLocaleString('pt-BR')}`);
  console.log(`Soma (NF Sem Canceladas Global + ND Abertas Global): R$ ${(totalNfExcelAll - totalNfExcelCancel + totalNdExcelAbertas).toLocaleString('pt-BR')}`);

  console.log('\n--- COMPARATIVO PROCURADO ---');
  console.log(`Valor Procurado: R$ 288.022.273,57`);
  
} catch (e) {
  console.error(e);
}
