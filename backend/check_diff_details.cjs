const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Base ERP_Geral'];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const rows = [581, 583]; // 1-indexed rows
  rows.forEach(rNum => {
    const row = raw[rNum - 1];
    console.log(`\nRow ${rNum}:`);
    console.log(`  Mês & ANO: ${row[2]}`);
    console.log(`  Origem: ${row[3]}`);
    console.log(`  Classificação: ${row[4]}`);
    console.log(`  DETRAN: ${row[5]}`);
    console.log(`  Razão Social: ${row[6]}`);
    console.log(`  Num NF: ${row[22]}`);
    console.log(`  Valor NF: ${row[28]}`);
    console.log(`  Valor Bruto: ${row[50]}`);
    console.log(`  Status NF: ${row[27]}`);
  });

} catch(e) {
  console.error(e);
}
