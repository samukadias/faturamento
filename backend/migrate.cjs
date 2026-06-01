const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const path = require('path');

const prisma = new PrismaClient();
const filePath = '/Users/macbookair/Downloads/202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx';

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const epoch = new Date(1900, 0, 1);
  epoch.setDate(epoch.getDate() + serial - 2);
  return epoch.toISOString().split('T')[0];
}

async function main() {
  console.log('📖 Lendo planilha Excel em:', filePath);
  let workbook;
  try {
    workbook = XLSX.readFile(filePath, { defval: null });
  } catch (err) {
    console.error('❌ Não foi possível carregar a planilha. Verifique se o caminho existe:', filePath);
    process.exit(1);
  }

  console.log('🧹 Limpando dados antigos do banco...');
  await prisma.notaFiscal.deleteMany();
  await prisma.notaDebito.deleteMany();
  await prisma.apontamento.deleteMany();
  await prisma.dePara.deleteMany();
  await prisma.historicoImportacao.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Criando usuários padrão...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const visualizadorPassword = await bcrypt.hash('vis123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@prodesp.sp.gov.br',
      password: adminPassword,
      nome: 'Administrador',
      perfil: 'ADMIN',
      ativo: true
    }
  });

  await prisma.user.create({
    data: {
      email: 'visualizador@prodesp.sp.gov.br',
      password: visualizadorPassword,
      nome: 'Visualizador',
      perfil: 'VISUALIZADOR',
      ativo: true
    }
  });

  // --- PARSE E INSERÇÃO DE_PARA ---
  console.log('📌 Importando DE_PARA...');
  const deParaSheet = workbook.Sheets['DE_PARA'];
  if (deParaSheet) {
    const raw = XLSX.utils.sheet_to_json(deParaSheet, { header: 1, defval: null });
    const deParas = [];
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row) continue;

      // 1. Tabela Principal (Colunas A-H, com Razao Social na Coluna B / index 1)
      if (row[1]) {
        deParas.push({
          razaoSocial: String(row[1] || '').trim(),
          numContrato: row[2] ? String(row[2]).trim() : null,
          pracaFaturamento: row[3] ? String(row[3]).trim() : null,
          objetoEsp: row[4] ? String(row[4]).trim() : null,
          origem: row[5] ? String(row[5]).trim() : null,
          classificacaoPPT: row[6] ? String(row[6]).trim() : null,
          detranTipo: row[7] ? String(row[7]).trim() : null,
        });
      }

      // 2. Mapeamento DETRAN (Colunas P-Q, com Razao Social no index 15 e tipo no index 16)
      if (row[15]) {
        deParas.push({
          razaoSocial: String(row[15] || '').trim(),
          numContrato: null,
          pracaFaturamento: null,
          objetoEsp: null,
          origem: null,
          classificacaoPPT: null,
          detranTipo: row[16] ? String(row[16]).trim() : null,
        });
      }

      // 3. Mapeamento Classificação PPT (Colunas U-V, com Razao Social no index 20 e classe no index 21)
      if (row[20]) {
        deParas.push({
          razaoSocial: String(row[20] || '').trim(),
          numContrato: null,
          pracaFaturamento: null,
          objetoEsp: null,
          origem: null,
          classificacaoPPT: row[21] ? String(row[21]).trim() : null,
          detranTipo: null,
        });
      }
    }
    await prisma.dePara.createMany({ data: deParas });
    console.log(`✅ ${deParas.length} registros DE_PARA importados.`);
  }

  // --- PARSE E INSERÇÃO BASE ERP_Geral ---
  console.log('📊 Importando Base ERP_Geral...');
  const geralSheet = workbook.Sheets['Base ERP_Geral'];
  let totalNFVal = 0;
  let countNF = 0;
  if (geralSheet) {
    const raw = XLSX.utils.sheet_to_json(geralSheet, { header: 1, defval: null });
    const headers = raw[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
    
    const get = (row, col) => {
      const idx = headers.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    };

    const nfs = [];
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || row.every(v => v === null)) continue;
      const rs = String(get(row, 'Razao Social') || '');
      const numNF = get(row, 'Num Nota Fiscal');
      if (!rs && !numNF) continue;

      const val = parseFloat(String(get(row, 'Valor Nota Fiscal') || 0));
      const statusNF = String(get(row, 'Status Nota Fiscal') || 'ABERTA');
      if (statusNF === 'ABERTA') {
        totalNFVal += val;
      }

      nfs.push({
        razaoSocial: rs,
        mesAno: String(get(row, 'Mês &ANO') || get(row, 'Mês&ANO') || ''),
        origem: String(get(row, 'Origem') || 'DRC'),
        classificacao: String(get(row, 'Classificação PPT') || 'DEMAIS'),
        detran: String(get(row, 'DETRAN') || 'GERAL'),
        grupoCliente: String(get(row, 'Grupo Cliente') || ''),
        periodoReferencia: String(get(row, 'Periodo Referência da  Receita') || ''),
        numContrato: String(get(row, 'Num Contrato') || ''),
        numESP: String(get(row, 'Num ESP') || ''),
        pracaFaturamento: String(get(row, 'Praça Faturamento') || ''),
        numNotaFiscal: numNF ? String(numNF) : null,
        dataEmissao: excelDateToISO(get(row, 'Data Emissão NF Prefeitura')) || excelDateToISO(get(row, 'Data Emissão RPS')),
        statusNF,
        valorNotaFiscal: val,
        dataVencimento: excelDateToISO(get(row, 'Data de Vencimento')),
        saldoParcelas: parseFloat(String(get(row, 'Saldo Parcelas') || 0)),
        valorRecebido: parseFloat(String(get(row, 'Valor Recebido') || 0)),
        retencaoINSS: parseFloat(String(get(row, 'Valor Retenção INSS') || 0)),
        retencaoISS: parseFloat(String(get(row, 'Valor Retenção ISS') || 0)),
        retencaoIRRF: parseFloat(String(get(row, 'Valor Retenção IRRF') || 0)),
        retencaoPASEP: parseFloat(String(get(row, 'Valor Retenção PASEP') || 0)),
        retencaoCOFINS: parseFloat(String(get(row, 'Valor Retenção COFINS') || 0)),
        retencaoCSSL: parseFloat(String(get(row, 'Valor Retenção CSLL') || 0)),
        objetoEspecificacao: String(get(row, 'Objeto_da_Especificacao') || ''),
        valorBruto: (() => {
          const rawB = get(row, 'Valor Bruto');
          return (rawB !== null && rawB !== undefined && rawB !== '') ? parseFloat(String(rawB)) : parseFloat(String(get(row, 'Valor Nota Fiscal') || 0));
        })(),
        tipoServico: String(get(row, 'Tipo_Serviço') || ''),
      });
    }

    // Usar lotes de 500 para evitar erros no Postgres
    for (let i = 0; i < nfs.length; i += 500) {
      await prisma.notaFiscal.createMany({ data: nfs.slice(i, i + 500) });
    }
    countNF = nfs.length;
    console.log(`✅ ${countNF} notas fiscais importadas.`);
  }

  // --- PARSE E INSERÇÃO BASE ERP_ND ---
  console.log('💵 Importando Base ERP_ND...');
  const ndSheet = workbook.Sheets['Base ERP_ND'];
  let totalNDVal = 0;
  let countND = 0;
  if (ndSheet) {
    const raw = XLSX.utils.sheet_to_json(ndSheet, { header: 1, defval: null });
    const headers = raw[0].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
    
    const get = (row, col) => {
      const idx = headers.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    };

    const nds = [];
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || row.every(v => v === null)) continue;
      const contrato = String(get(row, 'Contrato') || '');
      const rs = String(get(row, 'Razao Social') || '');
      if (!contrato && !rs) continue;

      const val = parseFloat(String(get(row, 'Valor') || 0));
      const status = String(get(row, 'Status') || 'ABERTA');
      if (status === 'ABERTA') {
        totalNDVal += val;
      }

      nds.push({
        recurso: String(get(row, 'Recurso') || ''),
        contrato,
        razaoSocial: rs,
        grupoCliente: String(get(row, 'Grupo Cliente') || ''),
        tipoND: String(get(row, 'Tipo ND') || ''),
        tipoCriacao: String(get(row, 'Tipo criação') || ''),
        numero: String(get(row, 'Número') || ''),
        dataEmissao: excelDateToISO(get(row, 'Data Emissão')),
        status,
        valor: val,
        ultimaDataVencimento: excelDateToISO(get(row, 'Última Data Vencimento')),
        valorRecebido: parseFloat(String(get(row, 'Valor Recebido') || 0)),
        saldoParcelas: parseFloat(String(get(row, 'Saldo Parcelas') || 0)),
        mesReferencia: excelDateToISO(get(row, 'Mês Referência')),
        termo: String(get(row, 'Termo') || ''),
      });
    }

    for (let i = 0; i < nds.length; i += 500) {
      await prisma.notaDebito.createMany({ data: nds.slice(i, i + 500) });
    }
    countND = nds.length;
    console.log(`✅ ${countND} notas de débito importadas.`);
  }

  // --- PARSE E INSERÇÃO BASE APONTAMENTO ---
  console.log('📝 Importando Base Apontamento...');
  const apSheet = workbook.Sheets['Base apontamento'];
  let totalApVal = 0;
  let countAp = 0;
  if (apSheet) {
    const raw = XLSX.utils.sheet_to_json(apSheet, { header: 1, defval: null });
    
    const headerRow = 4;
    const headers = raw[headerRow].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`).slice(0, 15);
    
    const get = (row, col) => {
      const idx = headers.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    };

    const aps = [];
    for (let i = headerRow + 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || row.every(v => v === null)) continue;
      const sigla = String(get(row, 'SIGLA') || '');
      const cliente = String(get(row, 'Cliente') || '');
      if (!sigla && !cliente) continue;

      const val = parseFloat(String(get(row, 'Valor Total') || 0));
      totalApVal += val;

      aps.push({
        sigla,
        tipoApontamento: String(get(row, 'Tipo de Apontamento') || ''),
        mes: parseInt(String(get(row, 'Mês') || 0)) || null,
        ano: parseInt(String(get(row, 'Ano') || 0)) || null,
        cliente,
        pdContrato: String(get(row, 'PD Contrato') || ''),
        nroESP: String(get(row, 'Nro ESP') || ''),
        termo: String(get(row, 'Termo') || ''),
        item: String(get(row, 'Item') || ''),
        subItem: String(get(row, 'SubItem') || ''),
        descricao: String(get(row, 'Descrição') || ''),
        sufixo: String(get(row, 'Sufixo') || ''),
        qtdeApontada: parseFloat(String(get(row, 'Qtde Apontada') || 0)),
        precoUnitario: parseFloat(String(get(row, 'Preço Unitário') || 0)),
        valorTotal: val,
      });
    }

    for (let i = 0; i < aps.length; i += 500) {
      await prisma.apontamento.createMany({ data: aps.slice(i, i + 500) });
    }
    countAp = aps.length;
    console.log(`✅ ${countAp} registros de apontamento importados.`);
  }

  // --- CRIAR HISTÓRICO ---
  console.log('⏰ Criando registro de histórico...');
  await prisma.historicoImportacao.create({
    data: {
      mesReferencia: '04/2026',
      totalNF: totalNFVal,
      totalND: totalNDVal,
      totalApontamento: totalApVal,
      faturamentoTotal: totalNFVal + totalNDVal,
      usuario: admin.email,
      status: 'COMPLETO',
      observacao: 'Importação inicial da planilha de demonstração.'
    }
  });

  console.log('🎉 Migração concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
