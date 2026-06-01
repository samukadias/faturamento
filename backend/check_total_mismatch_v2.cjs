const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

async function run() {
  try {
    console.log('=== ANALISANDO NOTAS DE DÉBITO (ND) NO POSTGRESQL ===');
    const nds = await prisma.notaDebito.findMany();
    console.log(`Total de NDs no banco: ${nds.length}`);
    nds.forEach(nd => {
      console.log(`  - Contrato: ${nd.contrato}, Razao: ${nd.razaoSocial.substring(0, 20)}, Valor: R$ ${nd.valor.toLocaleString('pt-BR')}, Status: ${nd.status}, Ref: ${nd.mesReferencia}`);
    });

    const sumNdsAbertas = nds.filter(nd => nd.status === 'ABERTA').reduce((s, nd) => s + nd.valor, 0);
    console.log(`Soma NDs Abertas: R$ ${sumNdsAbertas.toLocaleString('pt-BR')}`);

    console.log('\n=== INVESTIGANDO O VALOR DE R$ 288.022.273,57 ===');
    // Vamos somar as NFs e NDs de formas diferentes para ver o que chega perto de 288.022.273,57
    
    // 1. NFs Abertas (qualquer mês) + NDs Abertas (qualquer mês)
    const nfsAbertasGlobal = await prisma.notaFiscal.aggregate({
      where: { statusNF: 'ABERTA' },
      _sum: { valorNotaFiscal: true }
    });
    const nfsAbertasGlobalVal = nfsAbertasGlobal._sum.valorNotaFiscal || 0;
    const totalAbertasGlobal = nfsAbertasGlobalVal + sumNdsAbertas;
    console.log(`1) NFs Abertas Global (R$ ${nfsAbertasGlobalVal.toLocaleString('pt-BR')}) + NDs Abertas Global (R$ ${sumNdsAbertas.toLocaleString('pt-BR')}): R$ ${totalAbertasGlobal.toLocaleString('pt-BR')}`);

    // 2. NFs Abertas de 4/2026 + NFs Abertas Retroativas + NDs Abertas
    // No cálculo de faturamentoTotal no service, o valor é calculado com base nas notas do banco inteiro?
    // Vamos checar cálculos de calculations.ts:
    // calcularKPIs calcula totalNF = abertas.reduce((s, n) => s + n.valorNotaFiscal, 0)
    // Ou seja, totalNF é a soma de TODAS as notas fiscais abertas de TODOS os meses do banco!
    // No DB, nfsAbertasGlobalVal deu R$ 265.811.831,44 (no console do calculations.ts)
    // E com as NDs abertas de R$ 1.139.751,21, o faturamentoTotal do app dá R$ 266.951.582,65 (que é o 266.9M que o usuário vê!).
    
    // Agora vamos descobrir como a planilha chega em R$ 288.022.273,57!
    // Será que a planilha considera as notas de status "CANCEL"? Ou status "ABERTA" e "RECEBIDA"?
    // Vamos fazer uma soma no DB onde o status da NF não seja "CANCEL" (ou seja, ABERTA + qualquer outro status que não seja cancelada, como nulo ou vazias)
    const nfsNaoCanceladas = await prisma.notaFiscal.aggregate({
      where: { NOT: { statusNF: 'CANCEL' } },
      _sum: { valorNotaFiscal: true }
    });
    const nfsNaoCanceladasVal = nfsNaoCanceladas._sum.valorNotaFiscal || 0;
    const totalNaoCanceladas = nfsNaoCanceladasVal + sumNdsAbertas;
    console.log(`2) NFs Não Canceladas Global (R$ ${nfsNaoCanceladasVal.toLocaleString('pt-BR')}) + NDs Abertas: R$ ${totalNaoCanceladas.toLocaleString('pt-BR')}`);

    // 3. E se somarmos todas as NFs (incluindo as canceladas) + todas as NDs (incluindo todas)?
    const nfsTodasGlobal = await prisma.notaFiscal.aggregate({
      _sum: { valorNotaFiscal: true }
    });
    const ndsTodasGlobal = await prisma.notaDebito.aggregate({
      _sum: { valor: true }
    });
    const totalAbsoluto = (nfsTodasGlobal._sum.valorNotaFiscal || 0) + (ndsTodasGlobal._sum.valor || 0);
    console.log(`3) NFs Todas Global (R$ ${nfsTodasGlobal._sum.valorNotaFiscal?.toLocaleString('pt-BR')}) + NDs Todas Global (R$ ${ndsTodasGlobal._sum.valor?.toLocaleString('pt-BR')}): R$ ${totalAbsoluto.toLocaleString('pt-BR')}`);

    // 4. Vamos somar faturamento de Abril/2026.
    // No Excel, qual é o faturamento total acumulado (ou faturamento de algum mês específico) que dá R$ 288.022.273,57?
    // Vamos ler a planilha Excel e buscar em todas as células de forma mais flexível (mesmo que seja string contendo "288.022" ou similar)
    const workbook = XLSX.readFile(filePath);
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      for (let r = 0; r < raw.length; r++) {
        const row = raw[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          if (val !== null && val !== undefined) {
            const strVal = String(val);
            if (strVal.includes('288.022') || strVal.includes('288022') || strVal.includes('288.022.273')) {
              console.log(`\n[ENCONTRADO NO EXCEL] Aba: "${name}", Celula: r${r+1}c${c+1}, Valor: ${val}`);
              console.log(`Linha vizinha:`, JSON.stringify(row.slice(Math.max(0, c - 2), c + 5)));
            }
          }
        }
      }
    }

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
