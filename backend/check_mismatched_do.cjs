const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR MISCLASSIFIED DO NOTES ===');

  const notes = await prisma.notaFiscal.findMany({
    where: {
      OR: [
        { objetoEspecificacao: { contains: 'DO', mode: 'insensitive' } },
        { pracaFaturamento: { contains: 'DIARIO', mode: 'insensitive' } },
        { razaoSocial: { contains: 'IMESP', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Found ${notes.length} total potential DO notes in database.`);
  
  const groups = {};
  const mismatched = [];

  notes.forEach(n => {
    groups[n.origem] = (groups[n.origem] || 0) + 1;
    if (n.origem !== 'DIÁRIO OFICIAL') {
      mismatched.push(n);
    }
  });

  console.log('Distribution by Origem:', groups);

  console.log(`\nFound ${mismatched.length} mismatched notes:`);
  for (let i = 0; i < Math.min(15, mismatched.length); i++) {
    const n = mismatched[i];
    console.log(`  - Note ID: ${n.id}`);
    console.log(`    Razao Social: "${n.razaoSocial}"`);
    console.log(`    Num Contrato: "${n.numContrato}"`);
    console.log(`    Praça Faturamento: "${n.pracaFaturamento}"`);
    console.log(`    Objeto: "${n.objetoEspecificacao}"`);
    console.log(`    Origem: "${n.origem}"`);
  }
}

main().finally(() => prisma.$disconnect());
