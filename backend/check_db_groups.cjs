const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const nfs = await prisma.notaFiscal.findMany({
      where: { statusNF: 'ABERTA' }
    });
    
    const sumByOrig = {};
    const sumByOrigAndMonth = {};

    nfs.forEach(nf => {
      const orig = nf.origem || 'Vazio';
      const mes = nf.mesAno || 'Sem Mes';
      sumByOrig[orig] = (sumByOrig[orig] || 0) + nf.valorNotaFiscal;
      
      const key = `${orig} | ${mes}`;
      sumByOrigAndMonth[key] = (sumByOrigAndMonth[key] || 0) + nf.valorNotaFiscal;
    });

    console.log('=== NFS ABERTAS POR ORIGEM NO BANCO ===');
    for (const [orig, val] of Object.entries(sumByOrig)) {
      console.log(`  ${orig}: R$ ${val.toLocaleString('pt-BR')}`);
    }

    console.log('\n=== NFS ABERTAS DETALHADO POR ORIGEM E MÊS ===');
    const sortedKeys = Object.keys(sumByOrigAndMonth).sort();
    sortedKeys.forEach(k => {
      console.log(`  ${k}: R$ ${sumByOrigAndMonth[k].toLocaleString('pt-BR')}`);
    });

    const nds = await prisma.notaDebito.findMany({
      where: { status: 'ABERTA' }
    });
    const totalND = nds.reduce((s, n) => s + n.valor, 0);
    console.log(`\n=== NOTAS DE DÉBITO ABERTAS NO BANCO: R$ ${totalND.toLocaleString('pt-BR')}`);

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
