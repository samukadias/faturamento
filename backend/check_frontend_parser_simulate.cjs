const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

function normalizeHeader(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  const str = periodoRef.trim();
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
  const wb = XLSX.readFile(filePath);
  
  // 1. Simular deParaList como vazio (como estaria no frontend se não estivesse carregado)
  const deParaListEmpty = [];
  
  // 2. Simular deParaList preenchido (carregando do sheet DE_PARA)
  const deParaSheet = wb.Sheets['DE_PARA'];
  const deParaRaw = XLSX.utils.sheet_to_json(deParaSheet, { header: 1, defval: null });
  const deParaListPopulated = [];
  for (let i = 1; i < deParaRaw.length; i++) {
    const row = deParaRaw[i];
    if (!row) continue;
    if (row[1]) {
      deParaListPopulated.push({
        razaoSocial: String(row[1] || '').trim(),
        numContrato: row[2] ? String(row[2]).trim() : null,
        pracaFaturamento: row[3] ? String(row[3]).trim() : null,
        objetoEsp: row[4] ? String(row[4]).trim() : null,
        origem: row[5] ? String(row[5]).trim() : null,
        classificacaoPPT: row[6] ? String(row[6]).trim() : null,
        detranTipo: row[7] ? String(row[7]).trim() : null,
      });
    }
  }

  // Função do frontend para simular parse
  function runParse(deParaList) {
    const sheetName = wb.SheetNames.find(s => s.includes('ERP_Geral') || s.includes('ERP Geral')) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = raw[0].map(h => String(h || '').trim());
    const normalizedHeaders = headers.map(h => normalizeHeader(h));

    const get = (row, col) => {
      const idx = normalizedHeaders.indexOf(normalizeHeader(col));
      return idx >= 0 ? row[idx] : null;
    };

    const mainDeParaMap = new Map();
    const detranMap = new Map();
    const classifMap = new Map();

    for (const dp of deParaList || []) {
      const rs = (dp.razaoSocial || '').trim().toUpperCase();
      if (dp.origem) {
        const key = (
          (dp.razaoSocial || '') +
          (dp.numContrato || '') +
          (dp.pracaFaturamento || '') +
          (dp.objetoEsp || '')
        ).trim().toUpperCase();
        mainDeParaMap.set(key, dp);
      }
      if (dp.detranTipo && !dp.origem) {
        detranMap.set(rs, dp.detranTipo.trim());
      }
      if (dp.classificacaoPPT && !dp.origem) {
        classifMap.set(rs, dp.classificacaoPPT.trim());
      }
    }

    const parsed = raw.slice(1)
      .filter(row => get(row, 'Razao Social') || get(row, 'Num Nota Fiscal'))
      .map((row, i) => {
        const razaoSocial = String(get(row, 'Razao Social') || '');
        const numNotaFiscal = Number(get(row, 'Num Nota Fiscal') || 0);
        const numContrato = String(get(row, 'Num Contrato') || '');
        const pracaFaturamento = String(get(row, 'Praça Faturamento') || '');
        const objetoEspecificacao = String(get(row, 'Objeto_da_Especificacao') || get(row, 'Objeto da Especificação') || '');
        
        let origem = get(row, 'Origem');
        if (origem) {
          origem = normalizeOrigem(String(origem));
        } else {
          const key = (razaoSocial + numContrato + pracaFaturamento + objetoEspecificacao).trim().toUpperCase();
          const match = mainDeParaMap.get(key);
          origem = match ? normalizeOrigem(match.origem) : 'DRC';
        }

        const periodRef = get(row, 'Periodo Referência da  Receita') || get(row, 'Periodo Referência da Receita') || get(row, 'Período Referencia da Receita') || get(row, 'Periodo Referencia da Receita');
        const periodoReferencia = periodRef ? String(periodRef).trim() : '';
        let mesAno = get(row, 'Mês &ANO') || get(row, 'Mês&ANO');
        if (!mesAno) {
          mesAno = computeMesAno(periodoReferencia);
        }

        const valorBruto = parseFloat(String(get(row, 'Valor Bruto') || get(row, 'Valor Nota Fiscal') || 0));

        return {
          origem,
          mesAno,
          valorBruto
        };
      });

    return parsed;
  }

  console.log('--- CASO A: DE_PARA VAZIO ---');
  const notasA = runParse(deParaListEmpty);
  printStats(notasA);

  console.log('\n--- CASO B: DE_PARA PREENCHIDO ---');
  const notasB = runParse(deParaListPopulated);
  printStats(notasB);

  function printStats(notas) {
    const isPertinenteNF = (n) => n.mesAno === '4/2026' || n.mesAno === '5/2026';
    
    const drc_Pert = notas.filter(n => n.origem === 'DRC' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const drc_Retro = notas.filter(n => n.origem === 'DRC' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    
    const do_Pert = notas.filter(n => n.origem === 'DIÁRIO OFICIAL' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const do_Retro = notas.filter(n => n.origem === 'DIÁRIO OFICIAL' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const detran_Pert = notas.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const detran_Retro = notas.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const fin_Pert = notas.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const fin_Retro = notas.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const total = notas.reduce((s, n) => s + n.valorBruto, 0);

    console.log(`Faturamento Total Bruto (sem NDs): R$ ${total.toLocaleString('pt-BR')}`);
    console.log(`DRC Pert: R$ ${drc_Pert.toLocaleString('pt-BR')} | DRC Retro: R$ ${drc_Retro.toLocaleString('pt-BR')}`);
    console.log(`DO Pert: R$ ${do_Pert.toLocaleString('pt-BR')} | DO Retro: R$ ${do_Retro.toLocaleString('pt-BR')}`);
    console.log(`DETRAN Pert: R$ ${detran_Pert.toLocaleString('pt-BR')} | DETRAN Retro: R$ ${detran_Retro.toLocaleString('pt-BR')}`);
    console.log(`FINANCEIRA Pert: R$ ${fin_Pert.toLocaleString('pt-BR')} | FINANCEIRA Retro: R$ ${fin_Retro.toLocaleString('pt-BR')}`);
  }

} catch(e) {
  console.error(e);
}
