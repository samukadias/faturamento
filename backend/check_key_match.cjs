const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('/Users/macbookair/Downloads', '202604_FATURAMENTO - Gerência de Operações_28mai26.xlsx');

function normalizeHeader(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

try {
  const wb = XLSX.readFile(filePath);
  
  // Load DE_PARA map
  const deParaSheet = wb.Sheets['DE_PARA'];
  const deParaRaw = XLSX.utils.sheet_to_json(deParaSheet, { header: 1, defval: null });
  const mainDeParaMap = new Map();

  for (let i = 1; i < deParaRaw.length; i++) {
    const row = deParaRaw[i];
    if (row && row[1]) {
      const rs = String(row[1] || '').trim();
      const numContrato = row[2] ? String(row[2]).trim() : '';
      const praca = row[3] ? String(row[3]).trim() : '';
      const objeto = row[4] ? String(row[4]).trim() : '';
      const key = (rs + numContrato + praca + objeto).trim().toUpperCase();
      mainDeParaMap.set(key, { rowNum: i + 1, origem: row[5], rawRow: row.slice(0, 6) });
    }
  }

  // Load Base ERP_Geral
  const geralSheet = wb.Sheets['Base ERP_Geral'];
  const rawGeral = XLSX.utils.sheet_to_json(geralSheet, { header: 1, defval: null });
  const headers = rawGeral[0].map(h => String(h || '').trim());
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  const get = (row, col) => {
    const idx = normalizedHeaders.indexOf(normalizeHeader(col));
    return idx >= 0 ? row[idx] : null;
  };

  console.log('Normalized Headers:');
  console.log(normalizedHeaders.slice(0, 15));
  console.log('Index of Razao Social:', normalizedHeaders.indexOf(normalizeHeader('Razao Social')));
  console.log('Index of Num Contrato:', normalizedHeaders.indexOf(normalizeHeader('Num Contrato')));
  console.log('Index of Praça Faturamento:', normalizedHeaders.indexOf(normalizeHeader('Praça Faturamento')));
  console.log('Index of Objeto_da_Especificacao:', normalizedHeaders.indexOf(normalizeHeader('Objeto_da_Especificacao')));

  // Find a row with IACRI
  for (let i = 1; i < rawGeral.length; i++) {
    const row = rawGeral[i];
    if (!row) continue;
    const rs = String(get(row, 'Razao Social') || '');
    if (rs.includes('IACRI')) {
      const numContrato = String(get(row, 'Num Contrato') || '');
      const pracaFaturamento = String(get(row, 'Praça Faturamento') || '');
      const objetoEspecificacao = String(get(row, 'Objeto_da_Especificacao') || get(row, 'Objeto da Especificação') || '');
      
      const key = (rs + numContrato + pracaFaturamento + objetoEspecificacao).trim().toUpperCase();
      const match = mainDeParaMap.get(key);

      console.log(`\nRow ${i + 1} in Geral:`);
      console.log(`  Raw: rs="${rs}" | contract="${numContrato}" | praca="${pracaFaturamento}" | objeto="${objetoEspecificacao}"`);
      console.log(`  Key:   "${key}" (length: ${key.length})`);
      console.log(`  Match found:`, match);
      
      // Let's print all keys in the map containing IACRI to compare
      for (const mapKey of mainDeParaMap.keys()) {
        if (mapKey.includes('IACRI')) {
          console.log(`  Compare with mapKey: "${mapKey}" (length: ${mapKey.length})`);
          console.log(`  Are they equal?`, key === mapKey);
          
          // Print char codes to find differences
          if (key.length === mapKey.length) {
            for (let c = 0; c < key.length; c++) {
              if (key[c] !== mapKey[c]) {
                console.log(`    Diff at index ${c}: char in key="${key[c]}" (${key.charCodeAt(c)}), char in mapKey="${mapKey[c]}" (${mapKey.charCodeAt(c)})`);
              }
            }
          }
        }
      }
    }
  }

} catch(e) {
  console.error(e);
}
