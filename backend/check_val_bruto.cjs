const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const nfs = await prisma.notaFiscal.findMany();
    const nds = await prisma.notaDebito.findMany();

    // 1. Filtrar conforme regras
    const abertasNF = nfs.filter(n => n.statusNF === 'ABERTA');
    const todasNF = nfs; // inclui CANCEL
    const abertasND = nds.filter(n => n.status === 'ABERTA'); // ND só tem ABERTA na planilha anyway

    const isPertinenteNF = (n) => n.mesAno === '4/2026' || n.mesAno === '5/2026';
    const isPertinenteND = (nd) => {
      const ref = nd.mesReferencia || '';
      return ref.includes('2026-04') || ref.includes('2026-05') || ref.includes('4/2026') || ref.includes('5/2026');
    };

    console.log('=== SOMAS USANDO VALOR NOTA FISCAL (NFs ABERTAS + NDs) ===');
    {
      const totalNF = abertasNF.reduce((s, n) => s + n.valorNotaFiscal, 0);
      const totalND = abertasND.reduce((s, n) => s + n.valor, 0);
      console.log(`Faturamento Total NF+ND (Abertas): R$ ${(totalNF + totalND).toLocaleString('pt-BR')}`);

      const drcDO_Pert = abertasNF.filter(n => (n.origem === 'DRC' || n.origem === 'DIÁRIO OFICIAL') && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
      const drcDO_Retro = abertasNF.filter(n => (n.origem === 'DRC' || n.origem === 'DIÁRIO OFICIAL') && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
      
      const detran_Pert = abertasNF.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
      const detran_Retro = abertasNF.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);

      const fin_Pert = abertasNF.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
      const fin_Retro = abertasNF.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);

      console.log(`DRC + DO Pertinente: R$ ${drcDO_Pert.toLocaleString('pt-BR')}`);
      console.log(`DRC + DO Retroativo: R$ ${drcDO_Retro.toLocaleString('pt-BR')}`);
      console.log(`DETRAN Pertinente: R$ ${detran_Pert.toLocaleString('pt-BR')}`);
      console.log(`DETRAN Retroativo: R$ ${detran_Retro.toLocaleString('pt-BR')}`);
      console.log(`FINANCEIRA Pertinente: R$ ${fin_Pert.toLocaleString('pt-BR')}`);
      console.log(`FINANCEIRA Retroativo: R$ ${fin_Retro.toLocaleString('pt-BR')}`);
    }

    console.log('\n=== SOMAS USANDO VALOR BRUTO (TODAS NFs + NDs) ===');
    {
      const totalNF = todasNF.reduce((s, n) => s + n.valorBruto, 0);
      const totalND = abertasND.reduce((s, n) => s + n.valor, 0);
      console.log(`Faturamento Total NF+ND (Todas): R$ ${(totalNF + totalND).toLocaleString('pt-BR')}`);

      const drcDO_Pert = todasNF.filter(n => (n.origem === 'DRC' || n.origem === 'DIÁRIO OFICIAL') && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      const drcDO_Retro = todasNF.filter(n => (n.origem === 'DRC' || n.origem === 'DIÁRIO OFICIAL') && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      
      const detran_Pert = todasNF.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      const detran_Retro = todasNF.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

      const fin_Pert = todasNF.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      const fin_Retro = todasNF.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

      console.log(`DRC + DO Pertinente: R$ ${drcDO_Pert.toLocaleString('pt-BR')}`);
      console.log(`DRC + DO Retroativo: R$ ${drcDO_Retro.toLocaleString('pt-BR')}`);
      console.log(`DETRAN Pertinente: R$ ${detran_Pert.toLocaleString('pt-BR')}`);
      console.log(`DETRAN Retroativo: R$ ${detran_Retro.toLocaleString('pt-BR')}`);
      console.log(`FINANCEIRA Pertinente: R$ ${fin_Pert.toLocaleString('pt-BR')}`);
      console.log(`FINANCEIRA Retroativo: R$ ${fin_Retro.toLocaleString('pt-BR')}`);
    }

    console.log('\n=== SOMAS USANDO VALOR BRUTO (APENAS NFs ABERTAS + NDs) ===');
    {
      const totalNF = abertasNF.reduce((s, n) => s + n.valorBruto, 0);
      const totalND = abertasND.reduce((s, n) => s + n.valor, 0);
      console.log(`Faturamento Total NF+ND (Abertas): R$ ${(totalNF + totalND).toLocaleString('pt-BR')}`);

      const drcDO_Pert = abertasNF.filter(n => (n.origem === 'DRC' || n.origem === 'DIÁRIO OFICIAL') && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      const drcDO_Retro = abertasNF.filter(n => (n.origem === 'DRC' || n.origem === 'DIÁRIO OFICIAL') && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      
      const detran_Pert = abertasNF.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      const detran_Retro = abertasNF.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

      const fin_Pert = abertasNF.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
      const fin_Retro = abertasNF.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

      console.log(`DRC + DO Pertinente: R$ ${drcDO_Pert.toLocaleString('pt-BR')}`);
      console.log(`DRC + DO Retroativo: R$ ${drcDO_Retro.toLocaleString('pt-BR')}`);
      console.log(`DETRAN Pertinente: R$ ${detran_Pert.toLocaleString('pt-BR')}`);
      console.log(`DETRAN Retroativo: R$ ${detran_Retro.toLocaleString('pt-BR')}`);
      console.log(`FINANCEIRA Pertinente: R$ ${fin_Pert.toLocaleString('pt-BR')}`);
      console.log(`FINANCEIRA Retroativo: R$ ${fin_Retro.toLocaleString('pt-BR')}`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
