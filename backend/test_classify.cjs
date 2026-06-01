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

async function run() {
  try {
    const workbook = XLSX.readFile(filePath);
    
    // Load dePara directly from Excel
    const deParaSheet = workbook.Sheets['DE_PARA'];
    const deParaRaw = XLSX.utils.sheet_to_json(deParaSheet, { header: 1, defval: null });
    const mainDeParaMap = new Map();
    const detranMap = new Map();
    const classifMap = new Map();

    for (let i = 1; i < deParaRaw.length; i++) {
      const row = deParaRaw[i];
      if (!row) continue;
      
      if (row[1] && row[5]) {
        const rs = String(row[1]).trim().toUpperCase();
        const numContrato = row[2] ? String(row[2]).trim() : '';
        const praca = row[3] ? String(row[3]).trim() : '';
        const objeto = row[4] ? String(row[4]).trim() : '';
        const orig = String(row[5]).trim();
        
        const key = (rs + numContrato + praca + objeto).trim().toUpperCase();
        mainDeParaMap.set(key, orig);
      }
      
      if (row[15]) {
        const rs = String(row[15]).trim().toUpperCase();
        if (row[16]) {
          detranMap.set(rs, String(row[16]).trim());
        }
      }
      
      if (row[20]) {
        const rs = String(row[20]).trim().toUpperCase();
        if (row[21]) {
          classifMap.set(rs, String(row[21]).trim());
        }
      }
    }

    // 1. Process NFs
    const sheet = workbook.Sheets['Base ERP_Geral'];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = raw[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
    const normalizedHeaders = headers.map(h => normalizeHeader(h));
    
    const get = (row, col) => {
      const idx = normalizedHeaders.indexOf(normalizeHeader(col));
      return idx >= 0 ? row[idx] : null;
    };

    const notas = [];

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || row.every(v => v === null)) continue;
      
      const razaoSocial = String(get(row, 'Razao Social') || '');
      const numNotaFiscal = get(row, 'Num Nota Fiscal');
      if (!razaoSocial && !numNotaFiscal) continue;

      const val = parseFloat(String(get(row, 'Valor Nota Fiscal') || 0));
      const statusNF = String(get(row, 'Status Nota Fiscal') || 'ABERTA');
      
      const numContrato = String(get(row, 'Num Contrato') || '');
      const pracaFaturamento = String(get(row, 'Praça Faturamento') || '');
      const objetoEspecificacao = String(get(row, 'Objeto_da_Especificacao') || get(row, 'Objeto da Especificação') || '');
      
      let origem = get(row, 'Origem');
      if (origem) {
        origem = normalizeOrigem(String(origem));
      } else {
        const key = (
          razaoSocial +
          numContrato +
          pracaFaturamento +
          objetoEspecificacao
        ).trim().toUpperCase();
        const match = mainDeParaMap.get(key);
        origem = match ? normalizeOrigem(match) : 'DRC';
      }

      const periodRef = get(row, 'Periodo Referência da  Receita') || get(row, 'Periodo Referência da Receita') || get(row, 'Período Referencia da Receita') || get(row, 'Periodo Referencia da Receita');
      const periodoReferencia = periodRef ? String(periodRef).trim() : '';
      
      let mesAno = get(row, 'Mês &ANO') || get(row, 'Mês&ANO');
      if (!mesAno) {
        mesAno = computeMesAno(periodoReferencia);
      }

      const valorBruto = parseFloat(String(get(row, 'Valor Bruto') || val || 0));

      notas.push({
        razaoSocial,
        mesAno,
        origem,
        valorBruto,
        statusNF
      });
    }

    // 2. Process NDs
    const ndName = workbook.SheetNames.find(s => s.includes('ERP_ND') || s.includes('ERP ND') || s.includes('ND'));
    const ndSheet = workbook.Sheets[ndName];
    const rawNd = XLSX.utils.sheet_to_json(ndSheet, { header: 1, defval: null });
    const headersNd = rawNd[0];
    const valIdx = headersNd.indexOf('Valor');
    const statusIdx = headersNd.indexOf('Status');
    const refIdx = headersNd.indexOf('Mês Referência');
    
    let ndBrutoTotal = 0;
    for(let i=1; i<rawNd.length; i++) {
      const row = rawNd[i];
      if (row && String(row[statusIdx]).trim() === 'ABERTA') {
        ndBrutoTotal += parseFloat(row[valIdx] || 0);
      }
    }

    // 3. Compute Metrics
    const isPertinenteNF = (n) => n.mesAno === '4/2026' || n.mesAno === '5/2026';
    const nfBrutoTotal = notas.reduce((s, n) => s + n.valorBruto, 0);
    const totalBruto = nfBrutoTotal + ndBrutoTotal;

    console.log('--- METRICS ---');
    console.log('Total Bruto (NFs + NDs Abertas):', totalBruto);
    console.log('nfBrutoTotal:', nfBrutoTotal);
    console.log('ndBrutoTotal:', ndBrutoTotal);

    const drc_Bruto_Pert = notas.filter(n => n.origem === 'DRC' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const drc_Bruto_Retro = notas.filter(n => n.origem === 'DRC' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const do_Bruto_Pert = notas.filter(n => n.origem === 'DIÁRIO OFICIAL' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const do_Bruto_Retro = notas.filter(n => n.origem === 'DIÁRIO OFICIAL' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const detran_Bruto_Pert = notas.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const detran_Bruto_Retro = notas.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const fin_Bruto_Pert = notas.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const fin_Bruto_Retro = notas.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    console.log('DRC Pert:', drc_Bruto_Pert, 'Retro:', drc_Bruto_Retro);
    console.log('DO Pert:', do_Bruto_Pert, 'Retro:', do_Bruto_Retro);
    console.log('DETRAN Pert:', detran_Bruto_Pert, 'Retro:', detran_Bruto_Retro);
    console.log('FINANCEIRA Pert:', fin_Bruto_Pert, 'Retro:', fin_Bruto_Retro);

  } catch (e) {
    console.error(e);
  }
}

run();
