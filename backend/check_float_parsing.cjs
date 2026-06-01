const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

async function run() {
  try {
    const workbook = XLSX.readFile(filePath);
    const generalSheet = workbook.Sheets['Base ERP_Geral'];
    const rawGen = XLSX.utils.sheet_to_json(generalSheet, { header: 1, defval: null });
    
    let headerRowIdx = 0;
    let maxNonNull = 0;
    for (let i = 0; i < Math.min(10, rawGen.length); i++) {
      const nonNull = (rawGen[i] || []).filter(v => v !== null && v !== '').length;
      if (nonNull > maxNonNull) { maxNonNull = nonNull; headerRowIdx = i; }
    }
    
    const headersGen = rawGen[headerRowIdx].map((h, i) => h !== null ? String(h).trim() : `COL_${i}`);
    const numNfIdx = headersGen.indexOf('Num Nota Fiscal');
    const valIdxGen = headersGen.indexOf('Valor Nota Fiscal');

    console.log('=== VERIFICANDO PARSE DE VALORES ===');
    
    // Pegar algumas notas no DB e comparar com o Excel
    const sampleNfs = await prisma.notaFiscal.findMany({
      take: 20,
      select: { numNotaFiscal: true, valorNotaFiscal: true }
    });

    let mismatchCount = 0;
    sampleNfs.forEach(dbNf => {
      // Achar no Excel
      const excelRow = rawGen.find(row => row && String(row[numNfIdx]) === dbNf.numNotaFiscal);
      if (excelRow) {
        const excelVal = excelRow[valIdxGen];
        const dbVal = dbNf.valorNotaFiscal;
        if (Math.abs(excelVal - dbVal) > 0.01) {
          mismatchCount++;
          console.log(`Mismatch! NF: ${dbNf.numNotaFiscal} | Excel: ${excelVal} | DB: ${dbVal}`);
        }
      }
    });

    console.log(`\nVerificadas 20 notas. Diferenças encontradas: ${mismatchCount}`);

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
