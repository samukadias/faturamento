const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = '/Users/macbookair/Downloads/202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx';
const workbook = XLSX.readFile(filePath, { defval: null });

// === PARSE BASE ERP_Geral ===
function parseERPGeral(workbook) {
  const sheet = workbook.Sheets['Base ERP_Geral'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = raw[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(v => v === null)) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : null; });
    // Only include rows with a valid NF number
    if (obj['Num Nota Fiscal'] || obj['Razao Social']) rows.push(obj);
    if (rows.length >= 2000) break; // limit for json-server
  }
  return rows;
}

// === PARSE BASE ERP_ND ===
function parseERPND(workbook) {
  const sheet = workbook.Sheets['Base ERP_ND'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = raw[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(v => v === null)) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : null; });
    if (obj['Contrato'] || obj['Razao Social']) rows.push(obj);
    if (rows.length >= 500) break;
  }
  return rows;
}

// === PARSE BASE APONTAMENTO ===
function parseApontamento(workbook) {
  const sheet = workbook.Sheets['Base apontamento'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  // Header is at row 4 (index 4)
  const headers = raw[4].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`).slice(0, 15);
  const rows = [];
  for (let i = 5; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(v => v === null)) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      if (!h.startsWith('COL_')) obj[h] = row[idx] !== undefined ? row[idx] : null;
    });
    if (obj['SIGLA'] || obj['Cliente']) rows.push(obj);
    if (rows.length >= 2000) break;
  }
  return rows;
}

// === PARSE DE_PARA ===
function parseDePara(workbook) {
  const sheet = workbook.Sheets['DE_PARA'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  // Header is row 0
  const headers = ['chave', 'Razao Social', 'Num Contrato', 'Praca Faturamento', 'Objeto_da_Especificacao', 
                   'Origem', 'Classificacao_PPT', 'DETRAN_Tipo'];
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[1]) continue;
    rows.push({
      chave: row[0],
      razaoSocial: row[1],
      numContrato: row[2],
      pracaFaturamento: row[3],
      objetoEsp: row[4],
      origem: row[5],
      classificacaoPPT: row[6],
      detranTipo: row[7]
    });
    if (rows.length >= 500) break;
  }
  // Also parse DETRAN/DETRAN-Terceiros from cols 15-16
  const detranMap = {};
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[15]) continue;
    detranMap[String(row[15]).trim()] = String(row[16] || 'DETRAN').trim();
  }
  return { rows, detranMap };
}

// Excel serial date to ISO string
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const epoch = new Date(1900, 0, 1);
  epoch.setDate(epoch.getDate() + serial - 2);
  return epoch.toISOString().split('T')[0];
}

console.log('Parsing Excel...');
const erpGeral = parseERPGeral(workbook);
console.log(`ERP Geral: ${erpGeral.length} registros`);

const erpND = parseERPND(workbook);
console.log(`ERP ND: ${erpND.length} registros`);

const { rows: apontamento, detranMap } = (() => { try { return parseDePara(workbook); } catch(e) { return { rows: [], detranMap: {} }; } })();
const apontamentoData = parseApontamento(workbook);
console.log(`Apontamento: ${apontamentoData.length} registros`);

// Build DE_PARA lookup
const { rows: dePara, detranMap: detranMapFinal } = parseDePara(workbook);

// Add IDs to all records
const notas = erpGeral.map((r, i) => ({
  id: i + 1,
  razaoSocial: r['Razao Social'] || '',
  mesAno: r['Mês &ANO'] || '',
  origem: r['Origem'] || 'DRC',
  classificacao: r['Classificação PPT'] || 'DEMAIS',
  detran: r['DETRAN'] || 'GERAL',
  grupoCliente: r['Grupo Cliente'] || '',
  periodoReferencia: r['Periodo Referência da  Receita'] || '',
  numContrato: r['Num Contrato'] || '',
  numESP: r['Num ESP'] || '',
  pracaFaturamento: r['Praça Faturamento'] || '',
  numNotaFiscal: r['Num Nota Fiscal'] || '',
  dataEmissao: excelDateToISO(r['Data Emissão NF Prefeitura']) || excelDateToISO(r['Data Emissão RPS']) || '',
  statusNF: r['Status Nota Fiscal'] || 'ABERTA',
  valorNotaFiscal: parseFloat(r['Valor Nota Fiscal']) || 0,
  dataVencimento: excelDateToISO(r['Data de Vencimento']) || '',
  saldoParcelas: parseFloat(r['Saldo Parcelas']) || 0,
  valorRecebido: parseFloat(r['Valor Recebido'] || 0),
  retencaoINSS: parseFloat(r['Valor Retenção INSS'] || 0),
  retencaoISS: parseFloat(r['Valor Retenção ISS'] || 0),
  retencaoIRRF: parseFloat(r['Valor Retenção IRRF'] || 0),
  retencaoPASEP: parseFloat(r['Valor Retenção PASEP'] || 0),
  retencaoCOFINS: parseFloat(r['Valor Retenção COFINS'] || 0),
  retencaoCSSL: parseFloat(r['Valor Retenção CSLL'] || 0),
  objetoEspecificacao: r['Objeto_da_Especificacao'] || '',
  valorBruto: parseFloat(r['Valor Bruto'] || r['Valor Nota Fiscal'] || 0),
  tipoServico: r['Tipo_Serviço'] || '',
}));

const notasDebito = erpND.map((r, i) => ({
  id: i + 1,
  recurso: r['Recurso'] || '',
  contrato: r['Contrato'] || '',
  razaoSocial: r['Razao Social'] || '',
  grupoCliente: r['Grupo Cliente'] || '',
  tipoND: r['Tipo ND'] || '',
  tipoCriacao: r['Tipo criação'] || '',
  numero: r['Número'] || '',
  dataEmissao: excelDateToISO(r['Data Emissão']) || '',
  status: r['Status'] || 'ABERTA',
  valor: parseFloat(r['Valor']) || 0,
  ultimaDataVencimento: excelDateToISO(r['Última Data Vencimento']) || '',
  valorRecebido: parseFloat(r['Valor Recebido'] || 0),
  saldoParcelas: parseFloat(r['Saldo Parcelas'] || 0),
  mesReferencia: excelDateToISO(r['Mês Referência']) || '',
  termo: r['Termo'] || '',
}));

const apontamentoRecords = apontamentoData.map((r, i) => ({
  id: i + 1,
  sigla: r['SIGLA'] || '',
  tipoApontamento: r['Tipo de Apontamento'] || '',
  mes: parseInt(r['Mês']) || 0,
  ano: parseInt(r['Ano']) || 0,
  cliente: r['Cliente'] || '',
  pdContrato: r['PD Contrato'] || '',
  nroESP: r['Nro ESP'] || '',
  termo: r['Termo'] || '',
  item: r['Item'] || '',
  subItem: r['SubItem'] || '',
  descricao: r['Descrição'] || '',
  sufixo: r['Sufixo'] || '',
  qtdeApontada: parseFloat(r['Qtde Apontada'] || 0),
  precoUnitario: parseFloat(r['Preço Unitário'] || 0),
  valorTotal: parseFloat(r['Valor Total'] || 0),
}));

// Build summary stats
const totalNF = notas.filter(n => n.statusNF === 'ABERTA').reduce((s, n) => s + n.valorNotaFiscal, 0);
const totalND = notasDebito.filter(n => n.status === 'ABERTA').reduce((s, n) => s + n.valor, 0);
const totalApontamento = apontamentoRecords.reduce((s, r) => s + r.valorTotal, 0);

const dePararRecords = dePara.map((r, i) => ({ id: i + 1, ...r }));

// Create users for auth
const users = [
  { id: 1, email: 'admin@prodesp.sp.gov.br', password: 'admin123', nome: 'Administrador', perfil: 'ADMIN', ativo: true },
  { id: 2, email: 'visualizador@prodesp.sp.gov.br', password: 'vis123', nome: 'Visualizador', perfil: 'VISUALIZADOR', ativo: true },
];

// Historico
const historico = [
  {
    id: 1,
    mesReferencia: '04/2026',
    dataImportacao: new Date().toISOString(),
    totalNF: Math.round(totalNF),
    totalND: Math.round(totalND),
    totalApontamento: Math.round(totalApontamento),
    faturamentoTotal: Math.round(totalNF + totalND),
    usuario: 'admin@prodesp.sp.gov.br',
    status: 'COMPLETO'
  }
];

const db = {
  users,
  notas,
  notasDebito,
  apontamento: apontamentoRecords,
  dePara: dePararRecords,
  historico
};

fs.writeFileSync('/Users/macbookair/.gemini/antigravity/scratch/faturamento-app/db.json', 
  JSON.stringify(db, null, 2), 'utf8');

console.log('\n✅ db.json gerado com sucesso!');
console.log(`  - ${notas.length} notas fiscais`);
console.log(`  - ${notasDebito.length} notas de débito`);
console.log(`  - ${apontamentoRecords.length} registros de apontamento`);
console.log(`  - ${dePararRecords.length} registros DE_PARA`);
console.log(`  - Total NF (aberta): R$ ${(totalNF/1e6).toFixed(1)}M`);
console.log(`  - Total ND (aberta): R$ ${(totalND/1e6).toFixed(1)}M`);
console.log(`  - Total Apontamento: R$ ${(totalApontamento/1e6).toFixed(1)}M`);
