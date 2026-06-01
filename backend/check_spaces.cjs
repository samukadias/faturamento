const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('=== ANALISANDO VALORES EXATOS DE STATUS NO POSTGRESQL ===');
    
    // Pegar todos os valores únicos de statusNF no banco
    const statusNfs = await prisma.notaFiscal.groupBy({
      by: ['statusNF'],
      _count: { _all: true },
      _sum: { valorNotaFiscal: true }
    });

    statusNfs.forEach(item => {
      console.log(`StatusNF: "${item.statusNF}" (length: ${item.statusNF.length}) | Quantidade: ${item._count._all} | Soma: R$ ${item._sum.valorNotaFiscal?.toLocaleString('pt-BR')}`);
    });

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
