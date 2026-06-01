const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

async function run() {
  try {
    const workbook = XLSX.readFile(filePath);
    console.log('=== PROCURANDO VALOR R$ 288.022.273,57 NO EXCEL ===');
    
    const targetValue = 288022273.57;
    const tolerance = 5.0; // tolerância de R$ 5,00 para arredondamentos

    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      for (let r = 0; r < raw.length; r++) {
        const row = raw[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          if (typeof val === 'number' && Math.abs(val - targetValue) < tolerance) {
            console.log(`Encontrado na aba "${name}", Linha ${r+1}, Coluna ${c+1}: ${val}`);
            console.log(`Linha completa:`, JSON.stringify(row.slice(0, 10)));
          }
        }
      }
    }

    console.log('\n=== CHECANDO TOTAIS NO POSTGRESQL ===');
    // Faturamento total no DB para Abril/2026 (mesAno = '4/2026')
    // Notas fiscais de todos os status (ABERTA, CANCEL, etc) em '4/2026'
    const nfsTotal = await prisma.notaFiscal.aggregate({
      where: { mesAno: '4/2026' },
      _sum: { valorNotaFiscal: true }
    });
    const nfsAbertas = await prisma.notaFiscal.aggregate({
      where: { mesAno: '4/2026', statusNF: 'ABERTA' },
      _sum: { valorNotaFiscal: true }
    });
    const ndsTotal = await prisma.notaDebito.aggregate({
      _sum: { valor: true }
    });

    console.log(`Soma de todas as NFs de 4/2026 (qualquer status): R$ ${nfsTotal._sum.valorNotaFiscal?.toLocaleString('pt-BR')}`);
    console.log(`Soma das NFs Abertas de 4/2026: R$ ${nfsAbertas._sum.valorNotaFiscal?.toLocaleString('pt-BR')}`);
    
    // Vamos somar as NDs de Abril/2026. Na base de dados, como é o mesReferencia das NDs?
    const ndSample = await prisma.notaDebito.findFirst();
    console.log(`Amostra ND mesReferencia:`, ndSample?.mesReferencia);

    // Soma das NDs de Abril/2026 (mesReferencia contendo 2026-04 ou mes de Abril)
    const ndsAbril = await prisma.notaDebito.findMany({
      where: {
        mesReferencia: {
          gte: new Date('2026-04-01'),
          lt: new Date('2026-05-01')
        }
      }
    });
    const ndsAbrilSum = ndsAbril.reduce((s, n) => s + n.valor, 0);
    console.log(`Soma das NDs de Abril/2026: R$ ${ndsAbrilSum.toLocaleString('pt-BR')}`);

    // Vamos ver o total de faturamento somando todas as NFs abertas (independente de mês) + NDs abertas
    const totalNFAbertasGlobal = await prisma.notaFiscal.aggregate({
      where: { statusNF: 'ABERTA' },
      _sum: { valorNotaFiscal: true }
    });
    const totalNDsAbertasGlobal = await prisma.notaDebito.aggregate({
      where: { status: 'ABERTA' },
      _sum: { valor: true }
    });
    const faturamentoGlobalCalculado = (totalNFAbertasGlobal._sum.valorNotaFiscal || 0) + (totalNDsAbertasGlobal._sum.valor || 0);
    console.log(`\nSoma GLOBAL de NFs Abertas (todos os meses): R$ ${totalNFAbertasGlobal._sum.valorNotaFiscal?.toLocaleString('pt-BR')}`);
    console.log(`Soma GLOBAL de NDs Abertas (todos os meses): R$ ${totalNDsAbertasGlobal._sum.valor?.toLocaleString('pt-BR')}`);
    console.log(`Faturamento GLOBAL Geral (NF Abertas + ND Abertas): R$ ${faturamentoGlobalCalculado.toLocaleString('pt-BR')}`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
