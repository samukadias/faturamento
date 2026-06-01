import { useState, useRef } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { NotaFiscal, NotaDebito, ApontamentoRecord, HistoricoImportacao } from '../types';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface ImportState {
  status: Status;
  message: string;
  count: number;
}

function UploadCard({
  title,
  description,
  accept,
  onFile,
  state,
}: {
  title: string;
  description: string;
  accept: string;
  onFile: (file: File) => void;
  state: ImportState;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--color-primary-light)' }} />
          <span className="card-title">{title}</span>
        </div>
        {state.status === 'success' && <span className="badge badge-success">✓ Importado</span>}
        {state.status === 'error' && <span className="badge badge-danger">Erro</span>}
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>{description}</p>

        <div
          className={`upload-zone ${isDragging ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            aria-label="Upload de arquivo"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          {state.status === 'loading' ? (
            <span className="loading-spinner" />
          ) : state.status === 'success' ? (
            <CheckCircle size={36} style={{ color: 'var(--color-success)', opacity: 0.8 }} />
          ) : state.status === 'error' ? (
            <XCircle size={36} style={{ color: 'var(--color-danger)', opacity: 0.8 }} />
          ) : (
            <Upload size={36} style={{ color: 'var(--color-accent)', opacity: 0.6 }} />
          )}
          <div className="upload-zone-title" style={{ marginTop: 12 }}>
            {state.status === 'idle' ? 'Clique ou arraste o arquivo aqui' :
             state.status === 'loading' ? 'Processando...' :
             state.status === 'success' ? `${state.count} registros importados` :
             'Erro na importação'}
          </div>
          <div className="upload-zone-subtitle">{state.message || 'Excel (.xlsx) ou CSV'}</div>
        </div>
      </div>
    </div>
  );
}

// ---- Parsers Excel ----
function excelDateToISO(serial: number | null): string {
  if (!serial || typeof serial !== 'number') return '';
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

function normalizeOrigem(orig: string): string {
  if (!orig) return '';
  const o = orig.trim().toUpperCase();
  if (o === 'DO' || o === 'DIARIO OFICIAL' || o === 'DIÁRIO OFICIAL') {
    return 'DIÁRIO OFICIAL';
  }
  return orig.trim();
}

function computeMesAno(periodoRef: string): string {
  if (!periodoRef) return '';
  const str = periodoRef.trim();
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

function parseNotasFiscais(wb: XLSX.WorkBook, deParaList: any[]): NotaFiscal[] {
  // Tenta aba "Base ERP_Geral"
  const sheetName = wb.SheetNames.find(s => s.includes('ERP_Geral') || s.includes('ERP Geral')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const headers = (raw[0] as string[]).map(h => String(h || '').trim());
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

  const get = (row: unknown[], col: string) => {
    const idx = normalizedHeaders.indexOf(normalizeHeader(col));
    return idx >= 0 ? row[idx] : null;
  };

  // Build lookups from deParaList
  const mainDeParaMap = new Map<string, any>();
  const detranMap = new Map<string, string>();
  const classifMap = new Map<string, string>();

  for (const dp of deParaList || []) {
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

  return raw.slice(1)
    .filter(row => get(row, 'Razao Social') || get(row, 'Num Nota Fiscal'))
    .map((row, i) => {
      const razaoSocial = String(get(row, 'Razao Social') || '');
      const numNotaFiscal = Number(get(row, 'Num Nota Fiscal') || 0);

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

      return {
        id: i + 1,
        razaoSocial,
        mesAno: mesAno ? String(mesAno) : '',
        origem: (origem ? String(origem) : 'DRC') as NotaFiscal['origem'],
        classificacao: (classificacao ? String(classificacao) : 'DEMAIS') as NotaFiscal['classificacao'],
        detran: detran ? String(detran) : 'GERAL',
        grupoCliente: String(get(row, 'Grupo Cliente') || ''),
        periodoReferencia,
        numContrato,
        numESP: String(get(row, 'Num ESP') || ''),
        pracaFaturamento,
        numNotaFiscal,
        dataEmissao: excelDateToISO(get(row, 'Data Emissão NF Prefeitura') as number || get(row, 'Data Emissão RPS') as number),
        statusNF: String(get(row, 'Status Nota Fiscal') || 'ABERTA') as NotaFiscal['statusNF'],
        valorNotaFiscal: parseFloat(String(get(row, 'Valor Nota Fiscal') || 0)),
        dataVencimento: excelDateToISO(get(row, 'Data de Vencimento') as number),
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
      };
    });
}

function parseNotasDebito(wb: XLSX.WorkBook): NotaDebito[] {
  const sheetName = wb.SheetNames.find(s => s.includes('ND') || s.includes('Débito') || s.includes('Debito')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const headers = (raw[0] as string[]).map(h => String(h || '').trim());
  const get = (row: unknown[], col: string) => { const idx = headers.indexOf(col); return idx >= 0 ? row[idx] : null; };

  return raw.slice(1)
    .filter(row => get(row, 'Razao Social') || get(row, 'Contrato'))
    .map((row, i) => ({
      id: i + 1,
      recurso: String(get(row, 'Recurso') || ''),
      contrato: String(get(row, 'Contrato') || ''),
      razaoSocial: String(get(row, 'Razao Social') || ''),
      grupoCliente: String(get(row, 'Grupo Cliente') || ''),
      tipoND: String(get(row, 'Tipo ND') || ''),
      tipoCriacao: String(get(row, 'Tipo criação') || ''),
      numero: String(get(row, 'Número') || ''),
      dataEmissao: excelDateToISO(get(row, 'Data Emissão') as number),
      status: String(get(row, 'Status') || 'ABERTA') as NotaDebito['status'],
      valor: parseFloat(String(get(row, 'Valor') || 0)),
      ultimaDataVencimento: excelDateToISO(get(row, 'Última Data Vencimento') as number),
      valorRecebido: parseFloat(String(get(row, 'Valor Recebido') || 0)),
      saldoParcelas: parseFloat(String(get(row, 'Saldo Parcelas') || 0)),
      mesReferencia: excelDateToISO(get(row, 'Mês Referência') as number),
      termo: String(get(row, 'Termo') || ''),
    }));
}

function parseApontamento(wb: XLSX.WorkBook): ApontamentoRecord[] {
  const sheetName = wb.SheetNames.find(s => s.includes('apontamento') || s.includes('Apontamento')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];

  // Find header row
  let headerRow = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const nonNull = (raw[i] || []).filter(v => v !== null && v !== '').length;
    if (nonNull > 5) { headerRow = i; break; }
  }

  const headers = (raw[headerRow] as string[]).map(h => String(h || '').trim()).slice(0, 15);
  const get = (row: unknown[], col: string) => { const idx = headers.indexOf(col); return idx >= 0 ? row[idx] : null; };

  return raw.slice(headerRow + 1)
    .filter(row => get(row, 'SIGLA') || get(row, 'Cliente'))
    .map((row, i) => ({
      id: i + 1,
      sigla: String(get(row, 'SIGLA') || ''),
      tipoApontamento: String(get(row, 'Tipo de Apontamento') || ''),
      mes: parseInt(String(get(row, 'Mês') || 0)),
      ano: parseInt(String(get(row, 'Ano') || 0)),
      cliente: String(get(row, 'Cliente') || ''),
      pdContrato: String(get(row, 'PD Contrato') || ''),
      nroESP: String(get(row, 'Nro ESP') || ''),
      termo: String(get(row, 'Termo') || ''),
      item: String(get(row, 'Item') || ''),
      subItem: String(get(row, 'SubItem') || ''),
      descricao: String(get(row, 'Descrição') || ''),
      sufixo: String(get(row, 'Sufixo') || ''),
      qtdeApontada: parseFloat(String(get(row, 'Qtde Apontada') || 0)),
      precoUnitario: parseFloat(String(get(row, 'Preço Unitário') || 0)),
      valorTotal: parseFloat(String(get(row, 'Valor Total') || 0)),
    }));
}

export default function ImportacaoPage() {
  const { setNotas, setNotasDebito, setApontamento, addHistorico } = useDataStore();
  const { user } = useAuthStore();

  const [erpState, setErpState] = useState<ImportState>({ status: 'idle', message: 'Base ERP_Geral', count: 0 });
  const [ndState, setNdState] = useState<ImportState>({ status: 'idle', message: 'Base ERP_ND (opcional)', count: 0 });
  const [apState, setApState] = useState<ImportState>({ status: 'idle', message: 'Base apontamento', count: 0 });

  const handleERPFile = async (file: File) => {
    setErpState({ status: 'loading', message: 'Processando...', count: 0 });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('usuario', user?.email || 'sistema');

      const response = await fetch('/api/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Erro desconhecido');
      }

      const result = await response.json();
      await useDataStore.getState().fetchAll();

      setErpState({ status: 'success', message: `${file.name}`, count: result.nfsImported });
    } catch (e) {
      setErpState({ status: 'error', message: `Erro: ${e instanceof Error ? e.message : 'Upload falhou'}`, count: 0 });
    }
  };

  const handleNDFile = async (file: File) => {
    setNdState({ status: 'loading', message: 'Processando...', count: 0 });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('usuario', user?.email || 'sistema');

      const response = await fetch('/api/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Erro desconhecido');
      }

      const result = await response.json();
      await useDataStore.getState().fetchAll();

      setNdState({ status: 'success', message: file.name, count: result.ndsImported });
    } catch (e) {
      setNdState({ status: 'error', message: `Erro: ${e instanceof Error ? e.message : 'Upload falhou'}`, count: 0 });
    }
  };

  const handleApFile = async (file: File) => {
    setApState({ status: 'loading', message: 'Processando...', count: 0 });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('usuario', user?.email || 'sistema');

      const response = await fetch('/api/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Erro desconhecido');
      }

      const result = await response.json();
      await useDataStore.getState().fetchAll();

      setApState({ status: 'success', message: file.name, count: result.apsImported });
    } catch (e) {
      setApState({ status: 'error', message: `Erro: ${e instanceof Error ? e.message : 'Upload falhou'}`, count: 0 });
    }
  };

  const allDone = erpState.status === 'success' && apState.status === 'success';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Importar Dados</h1>
          <p className="page-subtitle">Importe os arquivos Excel do ERP para atualizar o dashboard</p>
        </div>
      </div>

      <div style={{ background: 'var(--color-info-bg)', border: '1px solid #BAE6FD', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ color: 'var(--color-info)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: '#0369A1' }}>
          <strong>Dica:</strong> Importe o arquivo <strong>202604_FATURAMENTO - Gerência de Operações.xlsx</strong> diretamente.
          O sistema detecta automaticamente as abas corretas (<em>Base ERP_Geral</em>, <em>Base ERP_ND</em>, <em>Base apontamento</em>).
          Você também pode importar cada aba separadamente.
        </div>
      </div>

      <div className="section-grid-3 animate-in">
        <UploadCard
          title="Base ERP Geral (NF)"
          description="Arquivo Excel com notas fiscais do ERP. Deve conter: Razao Social, Num Nota Fiscal, Origem, Status Nota Fiscal, Valor Nota Fiscal..."
          accept=".xlsx,.xls,.csv"
          onFile={handleERPFile}
          state={erpState}
        />
        <UploadCard
          title="Base ERP Notas de Débito"
          description="Arquivo Excel com notas de débito (ND-LOCACAO BENS MOVE). Deve conter: Contrato, Razao Social, Tipo ND, Status, Valor..."
          accept=".xlsx,.xls,.csv"
          onFile={handleNDFile}
          state={ndState}
        />
        <UploadCard
          title="Base Apontamento"
          description="Arquivo Excel com apontamento de serviços. Deve conter: SIGLA, Mês, Ano, Cliente, PD Contrato, Valor Total..."
          accept=".xlsx,.xls,.csv"
          onFile={handleApFile}
          state={apState}
        />
      </div>

      {allDone && (
        <div style={{
          background: 'var(--color-success-bg)', border: '1px solid #86EFAC',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 8,
          animation: 'fadeInUp 0.4s ease'
        }}>
          <CheckCircle size={28} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>Importação concluída com sucesso!</div>
            <div style={{ color: '#16A34A', fontSize: '0.82rem', marginTop: 2 }}>
              {erpState.count} notas fiscais + {apState.count} apontamentos importados.
              Acesse o <strong>Faturamento Geral</strong> para ver o dashboard atualizado.
            </div>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="card animate-in animate-in-delay-2" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">📋 Passo a Passo — Atualização Mensal</span>
        </div>
        <div className="card-body">
          <ol style={{ paddingLeft: 20, lineHeight: 2, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <li>Baixe o relatório <strong>PRSP - AR - RELATÓRIO DE FATURAMENTO - GERAL</strong> do ERP Oracle</li>
            <li>Salve a aba <strong>Base ERP_Geral</strong> como arquivo Excel separado</li>
            <li>Baixe o relatório de <strong>Notas de Débito</strong> e salve a aba <strong>Base ERP_ND</strong></li>
            <li>Exporte a <strong>Base Apontamento</strong> do sistema de apontamento de serviços</li>
            <li>Importe cada arquivo acima usando os campos de upload</li>
            <li>O dashboard será atualizado automaticamente após a importação</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
