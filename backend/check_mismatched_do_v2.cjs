const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR MISCLASSIFIED DIÁRIO OFICIAL (DO) IN DATABASE ===');

  const notes = await prisma.notaFiscal.findMany({
    where: {
      origem: 'DRC',
      OR: [
        { objetoEspecificacao: { equals: 'DO' } },
        { objetoEspecificacao: { equals: 'DIARIO OFICIAL' } },
        { objetoEspecificacao: { equals: 'DIÁRIO OFICIAL' } },
        { pracaFaturamento: { contains: 'IMESP', mode: 'insensitive' } },
        { pracaFaturamento: { contains: 'DIARIO', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Found ${notes.length} misclassified Diário Oficial notes in database.`);
  
  const sumVal = notes.reduce((s, n) => s + n.valorNotaFiscal, 0);
  console.log(`Sum of Valor Nota Fiscal: R$ ${sumVal.toLocaleString('pt-BR')}`);

  for (let i = 0; i < Math.min(10, notes.length); i++) {
    const n = notes[i];
    console.log(`  - Note ID: ${n.id} | NF: ${n.numNotaFiscal} | Status: ${n.statusNF} | Mes: ${n.mesAno}`);
    console.log(`    Razao: "${n.razaoSocial}"`);
    console.log(`    Contrato: "${n.numContrato}" | Praça: "${n.pracaFaturamento}"`);
    console.log(`    Objeto: "${n.objetoEspecificacao}" | Origem: "${n.origem}"`);
  }
}

main().finally(() => prisma.$disconnect());
