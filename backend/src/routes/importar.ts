import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Excel serial date to ISO string
function excelDateToISO(serial: any): string | null {
  if (!serial || typeof serial !== 'number') return null;
  const epoch = new Date(1900, 0, 1);
  epoch.setDate(epoch.getDate() + serial - 2);
  return epoch.toISOString().split('T')[0];
}

function normalizeHeader(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getCleanVal(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function normalizeOrigem(orig: string): string {
  if (!orig) return '';
  const o = orig.trim().toUpperCase();
  if (o === 'DO' || o === 'DIARIO OFICIAL' || o === 'DIÁRIO OFICIAL') {
    return 'DIÁRIO OFICIAL';
  }
  return orig.trim();
}

function computeMesAno(periodoRef: any): string {
  if (!periodoRef) return '';
  const str = String(periodoRef).trim();
  if (str.length < 10) return '';
  const first10 = str.substring(0, 10);
  let month = '';
  let year = '';
  if (first10.includes('/')) {
    const parts = first10.split('/');
    if (parts.length >= 3) {
      month = parts[1];
      year = parts[2];
    }
  } else if (first10.includes('-')) {
    const parts = first10.split('-');
    if (parts.length >= 3) {
      year = parts[0];
      month = parts[1];
    }
  }
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    return `${m}/${y}`;
  }
  return '';
}


// POST /importar — upload do arquivo único excel
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }

    const { usuario = 'sistema' } = req.body;
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 1. Verificar abas
    const sheetNames = workbook.SheetNames;
    const hasGeral = sheetNames.some(s => s.includes('ERP_Geral') || s.includes('ERP Geral'));
    const hasND = sheetNames.some(s => s.includes('ERP_ND') || s.includes('ERP ND'));
    const hasAp = sheetNames.some(s => s.includes('apontamento') || s.includes('Apontamento'));
    const hasDePara = sheetNames.some(s => s === 'DE_PARA' || s === 'DePara');

    if (!hasGeral && !hasND && !hasAp && !hasDePara) {
      res.status(400).json({ error: 'Arquivo inválido. Deve conter pelo menos uma das abas mapeadas ("Base ERP_Geral", "Base ERP_ND", "Base apontamento", "DE_PARA")' });
      return;
    }

    let nfsImported = 0;
    let ndsImported = 0;
    let apsImported = 0;
    let deParasImported = 0;

    let totalNFVal = 0;
    let totalNDVal = 0;
    let totalApVal = 0;

    // Usar transação para garantir atomicidade
    // Usar transação para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      // --- PARSE DE_PARA (Executado primeiro para servir de referência nos lookups) ---
      const deParaName = sheetNames.find(s => s === 'DE_PARA' || s === 'DePara');
      if (deParaName) {
        const sheet = workbook.Sheets[deParaName];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        if (raw.length > 1) {
          await tx.dePara.deleteMany();

          const deParas = [];
          for (let i = 1; i < raw.length; i++) {
            const row = raw[i];
            if (!row) continue;

            // 1. Tabela Principal (Colunas A-H, com Razao Social no index 1)
            if (row[1]) {
              deParas.push({
                razaoSocial: String(row[1] || '').trim(),
                numContrato: row[2] ? String(row[2]).trim() : null,
                pracaFaturamento: row[3] ? String(row[3]).trim() : null,
                objetoEsp: row[4] ? String(row[4]).trim() : null,
                origem: row[5] ? String(row[5]).trim() : null,
                classificacaoPPT: row[6] ? String(row[6]).trim() : null,
                detranTipo: row[7] ? String(row[7]).trim() : null,
              });
            }

            // 2. Mapeamento DETRAN (Colunas P-Q, com Razao Social no index 15)
            if (row[15]) {
              deParas.push({
                razaoSocial: String(row[15] || '').trim(),
                numContrato: null,
                pracaFaturamento: null,
                objetoEsp: null,
                origem: null,
                classificacaoPPT: null,
                detranTipo: row[16] ? String(row[16]).trim() : null,
              });
            }

            // 3. Mapeamento Classificação PPT (Colunas U-V, com Razao Social no index 20)
            if (row[20]) {
              deParas.push({
                razaoSocial: String(row[20] || '').trim(),
                numContrato: null,
                pracaFaturamento: null,
                objetoEsp: null,
                origem: null,
                classificacaoPPT: row[21] ? String(row[21]).trim() : null,
                detranTipo: null,
              });
            }
          }
          if (deParas.length > 0) {
            for (let k = 0; k < deParas.length; k += 500) {
              await tx.dePara.createMany({ data: deParas.slice(k, k + 500) });
            }
            deParasImported = deParas.length;
          }
        }
      }

      // --- PARSE FATURAMENTO GERAL (para extrair totais DO - Diário Oficial) ---
      // A aba "Faturamento Geral" possui linhas com col[3]="DIÁRIO OFICIAL", col[4]=Mês/Ano, col[5]=Valor
      // Essas NFs DO não existem na Base ERP_Geral, então lemos diretamente do pivot table
      const fatGeralName = sheetNames.find(s => s.includes('Faturamento Geral') || s.includes('Faturamento_Geral'));
      const doRows: Array<{ mesAno: string; valor: number }> = [];
      if (fatGeralName) {
        const fatSheet = workbook.Sheets[fatGeralName];
        const fatRaw = XLSX.utils.sheet_to_json(fatSheet, { header: 1, defval: null }) as any[][];
        for (const row of fatRaw) {
          if (!row) continue;
          // col[3] = Origem, col[4] = Mês&ANO, col[5] = Total
          const origemCell = row[3];
          const mesAnoCell = row[4];
          const valorCell = row[5];
          if (
            origemCell &&
            typeof origemCell === 'string' &&
            origemCell.trim().toUpperCase() === 'DIÁRIO OFICIAL' &&
            mesAnoCell &&
            typeof valorCell === 'number' &&
            valorCell > 0
          ) {
            doRows.push({
              mesAno: String(mesAnoCell).trim(),
              valor: valorCell,
            });
          }
        }
      }

      // --- PARSE BASE ERP_Geral ---
      const geralName = sheetNames.find(s => s.includes('ERP_Geral') || s.includes('ERP Geral'));
      if (geralName) {
        const sheet = workbook.Sheets[geralName];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        if (raw.length > 1) {
          const headers = raw[0].map((h: any, i: number) => h !== null ? String(h).trim() : `COL_${i}`);
          const normalizedHeaders = headers.map(h => normalizeHeader(h));
          
          const get = (row: any[], col: string) => {
            const idx = normalizedHeaders.indexOf(normalizeHeader(col));
            return idx >= 0 ? row[idx] : null;
          };

          // Carregar cadastros de DE_PARA do banco para os lookups em memória
          const allDeParas = await tx.dePara.findMany();
          const mainDeParaMap = new Map<string, any>();
          const detranMap = new Map<string, string>();
          const classifMap = new Map<string, string>();

          for (const dp of allDeParas) {
            const rs = (dp.razaoSocial || '').trim().toUpperCase();
            
            if (dp.origem) {
              const key = (
                (dp.razaoSocial || '') +
                (dp.numContrato || '') +
                (dp.pracaFaturamento || '') +
                (dp.objetoEsp || '')
              ).trim().toUpperCase();
              mainDeParaMap.set(key, dp);
            }
            
            if (dp.detranTipo && !dp.origem) {
              detranMap.set(rs, dp.detranTipo.trim());
            }
            
            if (dp.classificacaoPPT && !dp.origem) {
              classifMap.set(rs, dp.classificacaoPPT.trim());
            }
          }

          // Limpar notas fiscais existentes
          await tx.notaFiscal.deleteMany();

          for (let i = 1; i < raw.length; i++) {
            const row = raw[i];
            if (!row || row.every(v => v === null)) continue;
            
            const razaoSocial = String(get(row, 'Razao Social') || '');
            const numNotaFiscal = get(row, 'Num Nota Fiscal');
            if (!razaoSocial && !numNotaFiscal) continue;

            const val = parseFloat(String(get(row, 'Valor Nota Fiscal') || 0));
            const statusNF = String(get(row, 'Status Nota Fiscal') || 'ABERTA');
            if (statusNF === 'ABERTA') {
              totalNFVal += val;
            }

            // Calcular campos em falta A-F:
            const numContrato = String(get(row, 'Num Contrato') || '');
            const pracaFaturamento = String(get(row, 'Praça Faturamento') || '');
            const objetoEspecificacao = String(get(row, 'Objeto_da_Especificacao') || get(row, 'Objeto da Especificação') || '');
            
            // Coluna D: Origem
            let origem = get(row, 'Origem');
            if (origem) {
              origem = normalizeOrigem(String(origem));
            } else {
              const key = (
                razaoSocial +
                numContrato +
                pracaFaturamento +
                objetoEspecificacao
              ).trim().toUpperCase();
              const match = mainDeParaMap.get(key);
              if (match) {
                origem = normalizeOrigem(match.origem);
              } else {
                const objUpper = objetoEspecificacao.toUpperCase();
                const pracaUpper = pracaFaturamento.toUpperCase();
                const rsUpper = razaoSocial.toUpperCase();
                const gpUpper = String(get(row, 'Grupo Cliente') || '').toUpperCase();

                if (objUpper === 'DO' || objUpper === 'DIARIO OFICIAL' || objUpper === 'DIÁRIO OFICIAL' ||
                    pracaUpper.includes('IMESP') || pracaUpper.includes('DIARIO') || pracaUpper.includes('DIÁRIO') ||
                    rsUpper.includes('IMESP') || gpUpper.includes('IMESP') || gpUpper.includes('DO')) {
                  origem = 'DIÁRIO OFICIAL';
                } else {
                  origem = 'DRC';
                }
              }
            }

            // Colunas B & C: Período Referência & Mês/Ano
            const periodRef = get(row, 'Periodo Referência da  Receita') || get(row, 'Periodo Referência da Receita') || get(row, 'Período Referencia da Receita') || get(row, 'Periodo Referencia da Receita');
            const periodoReferencia = periodRef ? String(periodRef).trim() : '';
            
            let mesAno = get(row, 'Mês &ANO') || get(row, 'Mês&ANO');
            if (!mesAno) {
              mesAno = computeMesAno(periodoReferencia);
            }

            // Coluna E: Classificação PPT
            let classificacao = get(row, 'Classificação PPT') || get(row, 'Classificacao PPT');
            if (!classificacao) {
              const rsUpper = razaoSocial.trim().toUpperCase();
              if (classifMap.has(rsUpper)) {
                classificacao = classifMap.get(rsUpper);
              } else {
                // Fallback string
                if (rsUpper.includes('SEFAZ')) {
                  classificacao = 'SEFAZ';
                } else if (rsUpper.includes('DIPOL')) {
                  classificacao = 'DIPOL';
                } else if (rsUpper.includes('SGGD')) {
                  classificacao = 'SGGD';
                } else if (rsUpper.includes('SEDUC')) {
                  classificacao = 'SEDUC';
                } else if (rsUpper.includes('SES')) {
                  classificacao = 'SES';
                } else if (rsUpper.includes('JUCESP')) {
                  classificacao = 'JUCESP';
                } else if (rsUpper.includes('DER')) {
                  classificacao = 'DER';
                } else if (rsUpper.includes('SAA')) {
                  classificacao = 'SAA';
                } else if (rsUpper.includes('DETRAN')) {
                  classificacao = 'DETRAN';
                } else {
                  classificacao = 'DEMAIS';
                }
              }
            }

            // Coluna F: DETRAN
            let detran = get(row, 'DETRAN');
            if (!detran) {
              const rsUpper = razaoSocial.trim().toUpperCase();
              if (detranMap.has(rsUpper)) {
                detran = detranMap.get(rsUpper);
              } else {
                detran = 'GERAL';
              }
            }

            await tx.notaFiscal.create({
              data: {
                razaoSocial,
                mesAno: mesAno ? String(mesAno) : '',
                origem: origem ? String(origem) : 'DRC',
                classificacao: classificacao ? String(classificacao) : 'DEMAIS',
                detran: detran ? String(detran) : 'GERAL',
                grupoCliente: String(get(row, 'Grupo Cliente') || ''),
                periodoReferencia,
                numContrato,
                numESP: String(get(row, 'Num ESP') || ''),
                pracaFaturamento,
                numNotaFiscal: numNotaFiscal ? String(numNotaFiscal) : null,
                dataEmissao: excelDateToISO(get(row, 'Data Emissão NF Prefeitura')) || excelDateToISO(get(row, 'Data Emissão RPS')),
                statusNF,
                valorNotaFiscal: val,
                dataVencimento: excelDateToISO(get(row, 'Data de Vencimento')),
                saldoParcelas: parseFloat(String(get(row, 'Saldo Parcelas') || 0)),
                valorRecebido: parseFloat(String(get(row, 'Valor Recebido') || 0)),
                retencaoINSS: parseFloat(String(get(row, 'Valor Retenção INSS') || 0)),
                retencaoISS: parseFloat(String(get(row, 'Valor Retenção ISS') || 0)),
                retencaoIRRF: parseFloat(String(get(row, 'Valor Retenção IRRF') || 0)),
                retencaoPASEP: parseFloat(String(get(row, 'Valor Retenção PASEP') || 0)),
                retencaoCOFINS: parseFloat(String(get(row, 'Valor Retenção COFINS') || 0)),
                retencaoCSSL: parseFloat(String(get(row, 'Valor Retenção CSLL') || 0)),
                objetoEspecificacao,
                valorBruto: parseFloat(String(get(row, 'Valor Bruto') || get(row, 'Valor Nota Fiscal') || 0)),
                tipoServico: String(get(row, 'Tipo_Serviço') || ''),
              }
            });
            nfsImported++;
          }
        }
      }

      // --- CRIAR NFs SINTÉTICAS PARA DIÁRIO OFICIAL (lidas da aba Faturamento Geral) ---
      // Os contratos DO (F070 - IMESP MOOCA DIARIO) não existem na Base ERP_Geral.
      // Criamos uma NF sintética por Mês/Ano com o total DO para que os cards DO funcionem corretamente.
      if (doRows.length > 0) {
        for (const doRow of doRows) {
          totalNFVal += doRow.valor; // Contabilizar no total geral
          await tx.notaFiscal.create({
            data: {
              razaoSocial: 'IMESP - DIÁRIO OFICIAL (Consolidado)',
              mesAno: doRow.mesAno,
              origem: 'DIÁRIO OFICIAL',
              classificacao: 'DEMAIS',
              detran: 'GERAL',
              grupoCliente: 'OUTROS - IMESP - DO',
              periodoReferencia: doRow.mesAno,
              numContrato: '',
              numESP: '',
              pracaFaturamento: 'F070 - IMESP MOOCA DIARIO',
              numNotaFiscal: null,
              dataEmissao: null,
              statusNF: 'ABERTA',
              valorNotaFiscal: doRow.valor,
              dataVencimento: null,
              saldoParcelas: 0,
              valorRecebido: 0,
              retencaoINSS: 0,
              retencaoISS: 0,
              retencaoIRRF: 0,
              retencaoPASEP: 0,
              retencaoCOFINS: 0,
              retencaoCSSL: 0,
              objetoEspecificacao: 'DO',
              valorBruto: doRow.valor,
              tipoServico: 'DIÁRIO OFICIAL',
            }
          });
          nfsImported++;
        }
      }

      // --- PARSE BASE ERP_ND ---
      const ndName = sheetNames.find(s => s.includes('ERP_ND') || s.includes('ERP ND'));
      if (ndName) {
        const sheet = workbook.Sheets[ndName];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        if (raw.length > 1) {
          const headers = raw[0].map((h: any, i: number) => h !== null ? String(h).trim() : `COL_${i}`);
          
          const get = (row: any[], col: string) => {
            const idx = headers.indexOf(col);
            return idx >= 0 ? row[idx] : null;
          };

          await tx.notaDebito.deleteMany();

          for (let i = 1; i < raw.length; i++) {
            const row = raw[i];
            if (!row || row.every(v => v === null)) continue;

            const contrato = String(get(row, 'Contrato') || '');
            const razaoSocial = String(get(row, 'Razao Social') || '');
            if (!contrato && !razaoSocial) continue;

            const val = parseFloat(String(get(row, 'Valor') || 0));
            const status = String(get(row, 'Status') || 'ABERTA');
            if (status === 'ABERTA') {
              totalNDVal += val;
            }

            await tx.notaDebito.create({
              data: {
                recurso: String(get(row, 'Recurso') || ''),
                contrato,
                razaoSocial,
                grupoCliente: String(get(row, 'Grupo Cliente') || ''),
                tipoND: String(get(row, 'Tipo ND') || ''),
                tipoCriacao: String(get(row, 'Tipo criação') || ''),
                numero: String(get(row, 'Número') || ''),
                dataEmissao: excelDateToISO(get(row, 'Data Emissão')),
                status,
                valor: val,
                ultimaDataVencimento: excelDateToISO(get(row, 'Última Data Vencimento')),
                valorRecebido: parseFloat(String(get(row, 'Valor Recebido') || 0)),
                saldoParcelas: parseFloat(String(get(row, 'Saldo Parcelas') || 0)),
                mesReferencia: excelDateToISO(get(row, 'Mês Referência')),
                termo: String(get(row, 'Termo') || ''),
              }
            });
            ndsImported++;
          }
        }
      }

      // --- PARSE BASE APONTAMENTO ---
      const apName = sheetNames.find(s => s.includes('apontamento') || s.includes('Apontamento'));
      if (apName) {
        const sheet = workbook.Sheets[apName];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        
        const headerRow = 4;
        if (raw.length > headerRow + 1) {
          const headers = raw[headerRow].map((h: any, i: number) => h !== null ? String(h).trim() : `COL_${i}`).slice(0, 15);
          
          const get = (row: any[], col: string) => {
            const idx = headers.indexOf(col);
            return idx >= 0 ? row[idx] : null;
          };

          await tx.apontamento.deleteMany();

          for (let i = headerRow + 1; i < raw.length; i++) {
            const row = raw[i];
            if (!row || row.every(v => v === null)) continue;

            const sigla = String(get(row, 'SIGLA') || '');
            const cliente = String(get(row, 'Cliente') || '');
            if (!sigla && !cliente) continue;

            const val = parseFloat(String(get(row, 'Valor Total') || 0));
            totalApVal += val;

            await tx.apontamento.create({
              data: {
                sigla,
                tipoApontamento: String(get(row, 'Tipo de Apontamento') || ''),
                mes: parseInt(String(get(row, 'Mês') || 0)) || null,
                ano: parseInt(String(get(row, 'Ano') || 0)) || null,
                cliente,
                pdContrato: String(get(row, 'PD Contrato') || ''),
                nroESP: String(get(row, 'Nro ESP') || ''),
                termo: String(get(row, 'Termo') || ''),
                item: String(get(row, 'Item') || ''),
                subItem: String(get(row, 'SubItem') || ''),
                descricao: String(get(row, 'Descrição') || ''),
                sufixo: String(get(row, 'Sufixo') || ''),
                qtdeApontada: parseFloat(String(get(row, 'Qtde Apontada') || 0)),
                precoUnitario: parseFloat(String(get(row, 'Preço Unitário') || 0)),
                valorTotal: val,
              }
            });
            apsImported++;
          }
        }
      }

      // 4. Criar registro histórico
      await tx.historicoImportacao.create({
        data: {
          mesReferencia: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
          totalNF: totalNFVal,
          totalND: totalNDVal,
          totalApontamento: totalApVal,
          faturamentoTotal: totalNFVal + totalNDVal,
          usuario,
          status: 'COMPLETO',
          observacao: `Importado arquivo único: ${req.file!.originalname}`,
        }
      });
    }, {
      maxWait: 60000,
      timeout: 180000
    });

    res.json({
      success: true,
      nfsImported,
      ndsImported,
      apsImported,
      deParasImported,
      totalNFVal,
      totalNDVal,
      totalApVal,
    });
  } catch (err: any) {
    console.error('❌ Erro no importar:', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

export default router;
