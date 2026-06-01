const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Faturamento Geral'];
  if (!sheet) {
    console.log('Aba "Faturamento Geral" não encontrada.');
    process.exit(0);
  }

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('=== FATURAMENTO GERAL SHAPE ===');
  console.log(`Linhas: ${raw.length}`);

  // Mostrar de 60 a 150
  for (let i = 60; i < Math.min(180, raw.length); i++) {
    const row = raw[i];
    // Apenas se tiver conteúdo em alguma das colunas
    if (row.some(v => v !== '')) {
      console.log(`L${i+1}:`, JSON.stringify(row.slice(0, 15)));
    }
  }

} catch(e) {
  console.error(e);
}
