const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

function normalizeHeader(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeOrigem(orig) {
  if (!orig) return '';
  const o = orig.trim().toUpperCase();
  if (o === 'DO' || o === 'DIARIO OFICIAL' || o === 'DIÁRIO OFICIAL') {
    return 'DIÁRIO OFICIAL';
  }
  return orig.trim();
}

function computeMesAno(periodoRef) {
  if (!periodoRef) return '';
  const str = String(periodoRef).trim();
  if (str.length < 10) return '';
  const first10 = str.substring(0, 10);
  let month = '';
  let year = '';
  if (first10.includes('/')) {
    const parts = first10.split('/');
    if (parts.length >= 3) {
      month = parts[1];
      year = parts[2];
    }
  } else if (first10.includes('-')) {
    const parts = first10.split('-');
    if (parts.length >= 3) {
      year = parts[0];
      month = parts[1];
    }
  }
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    return `${m}/${y}`;
  }
  return '';
}

try {
  const workbook = XLSX.readFile(filePath);
  
  // 1. Carregar DE_PARA
  const deParaSheet = workbook.Sheets['DE_PARA'];
  const deParaRaw = XLSX.utils.sheet_to_json(deParaSheet, { header: 1, defval: null });
  const mainDeParaMap = new Map();

  for (let i = 1; i < deParaRaw.length; i++) {
    const row = deParaRaw[i];
    if (!row) continue;
    if (row[1] && row[5]) { // Tem razao social e origem
      const rs = String(row[1]).trim();
      const numContrato = row[2] ? String(row[2]).trim() : '';
      const praca = row[3] ? String(row[3]).trim() : '';
      const objeto = row[4] ? String(row[4]).trim() : '';
      const orig = String(row[5]).trim();

      const key = (rs + numContrato + praca + objeto).trim().toUpperCase();
      mainDeParaMap.set(key, orig);
    }
  }

  // 2. Carregar Base ERP_Geral
  const geralSheet = workbook.Sheets['Base ERP_Geral'];
  const rawGeral = XLSX.utils.sheet_to_json(geralSheet, { header: 1, defval: null });
  const headers = rawGeral[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  const get = (row, col) => {
    const idx = normalizedHeaders.indexOf(normalizeHeader(col));
    return idx >= 0 ? row[idx] : null;
  };

  const sums = {};
  const counts = {};

  for (let i = 1; i < rawGeral.length; i++) {
    const row = rawGeral[i];
    if (!row || row.every(v => v === null)) continue;

    const rs = String(get(row, 'Razao Social') || '');
    const numNF = get(row, 'Num Nota Fiscal');
    if (!rs && !numNF) continue;

    const status = String(get(row, 'Status Nota Fiscal') || 'ABERTA').trim();
    if (status !== 'ABERTA') continue;

    const val = parseFloat(String(get(row, 'Valor Nota Fiscal') || 0));
    
    // Obter campos de cálculo
    const numContrato = String(get(row, 'Num Contrato') || '');
    const pracaFaturamento = String(get(row, 'Praça Faturamento') || '');
    const objetoEspecificacao = String(get(row, 'Objeto_da_Especificacao') || get(row, 'Objeto da Especificação') || '');

    // Calcular Origem
    let origem = get(row, 'Origem');
    if (origem) {
      origem = normalizeOrigem(String(origem));
    } else {
      const key = (rs + numContrato + pracaFaturamento + objetoEspecificacao).trim().toUpperCase();
      if (mainDeParaMap.has(key)) {
        origem = normalizeOrigem(mainDeParaMap.get(key));
      } else {
        // Regra de Fallback inteligente para Diário Oficial
        const objUpper = objetoEspecificacao.toUpperCase();
        const pracaUpper = pracaFaturamento.toUpperCase();
        const rsUpper = rs.toUpperCase();

        if (objUpper === 'DO' || objUpper === 'DIARIO OFICIAL' || objUpper === 'DIÁRIO OFICIAL' ||
            pracaUpper.includes('IMESP') || pracaUpper.includes('DIARIO') || pracaUpper.includes('DIÁRIO') ||
            rsUpper.includes('IMESP')) {
          origem = 'DIÁRIO OFICIAL';
        } else {
          origem = 'DRC';
        }
      }
    }

    sums[origem] = (sums[origem] || 0) + val;
    counts[origem] = (counts[origem] || 0) + 1;
  }

  console.log('=== SOMAS SIMULADAS DE NOTA FISCAL (ABERTAS) ===');
  let total = 0;
  for (const [orig, val] of Object.entries(sums)) {
    console.log(`  ${orig}: R$ ${val.toLocaleString('pt-BR')} (Qtd: ${counts[orig]})`);
    total += val;
  }
  console.log(`Total Notas Fiscais Abertas: R$ ${total.toLocaleString('pt-BR')}`);

} catch(e) {
  console.error(e);
}
