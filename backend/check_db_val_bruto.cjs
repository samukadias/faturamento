const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const dbNfs = await prisma.notaFiscal.findMany({
      select: { id: true, razaoSocial: true, numNotaFiscal: true, valorNotaFiscal: true, valorBruto: true }
    });

    console.log(`Total NFs no banco: ${dbNfs.length}`);
    let sumBrutoDb = 0;
    let sumNfDb = 0;
    let diffCount = 0;

    dbNfs.forEach(nf => {
      sumBrutoDb += nf.valorBruto;
      sumNfDb += nf.valorNotaFiscal;
      if (Math.abs(nf.valorBruto - nf.valorNotaFiscal) > 0.01) {
        diffCount++;
        if (diffCount <= 10) {
          console.log(`Diff #${diffCount}: ID: ${nf.id}, NF: ${nf.numNotaFiscal}, Razao: ${nf.razaoSocial.substring(0,20)}, ValorNF: ${nf.valorNotaFiscal}, ValorBruto: ${nf.valorBruto}`);
        }
      }
    });

    console.log(`Soma Valor Nota Fiscal no DB: R$ ${sumNfDb.toLocaleString('pt-BR')}`);
    console.log(`Soma Valor Bruto no DB: R$ ${sumBrutoDb.toLocaleString('pt-BR')}`);
    console.log(`Linhas com diferença entre Bruto e NF no DB: ${diffCount}`);

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
