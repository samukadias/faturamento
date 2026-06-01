// Types for the Faturamento Application
// Gerência de Operações - PRODESP

export type Perfil = 'ADMIN' | 'VISUALIZADOR';
export type StatusNF = 'ABERTA' | 'PAGA' | 'CANCELADA';
export type Origem = 'DRC' | 'DETRAN' | 'DIÁRIO OFICIAL' | 'FINANCEIRA';
export type ClassificacaoPPT = 'DETRAN' | 'DETRAN - Terceiros' | 'SGGD' | 'SEFAZ' | 'SEDUC' | 'DER' | 'JUCESP' | 'SES' | 'SAA' | 'DEMAIS' | 'PREFEITURAS';

export interface User {
  id: number;
  email: string;
  password: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface NotaFiscal {
  id: number;
  razaoSocial: string;
  mesAno: string;
  origem: Origem;
  classificacao: ClassificacaoPPT;
  detran: string;
  grupoCliente: string;
  periodoReferencia: string;
  numContrato: string;
  numESP: string;
  pracaFaturamento: string;
  numNotaFiscal: string | number;
  dataEmissao: string;
  statusNF: StatusNF;
  valorNotaFiscal: number;
  dataVencimento: string;
  saldoParcelas: number;
  valorRecebido: number;
  retencaoINSS: number;
  retencaoISS: number;
  retencaoIRRF: number;
  retencaoPASEP: number;
  retencaoCOFINS: number;
  retencaoCSSL: number;
  objetoEspecificacao: string;
  valorBruto: number;
  tipoServico: string;
}

export interface NotaDebito {
  id: number;
  recurso: string;
  contrato: string;
  razaoSocial: string;
  grupoCliente: string;
  tipoND: string;
  tipoCriacao: string;
  numero: string | number;
  dataEmissao: string;
  status: StatusNF;
  valor: number;
  ultimaDataVencimento: string;
  valorRecebido: number;
  saldoParcelas: number;
  mesReferencia: string;
  termo: string;
}

export interface ApontamentoRecord {
  id: number;
  sigla: string;
  tipoApontamento: string;
  mes: number;
  ano: number;
  cliente: string;
  pdContrato: string;
  nroESP: string;
  termo: string;
  item: string;
  subItem: string;
  descricao: string;
  sufixo: string;
  qtdeApontada: number;
  precoUnitario: number;
  valorTotal: number;
}

export interface DeParaRecord {
  id: number;
  razaoSocial: string;
  numContrato: string;
  pracaFaturamento: string;
  objetoEsp: string;
  origem: Origem;
  classificacaoPPT: ClassificacaoPPT;
  detranTipo: string;
}

export interface HistoricoImportacao {
  id: number;
  mesReferencia: string;
  dataImportacao: string;
  totalNF: number;
  totalND: number;
  totalApontamento: number;
  faturamentoTotal: number;
  usuario: string;
  status: 'COMPLETO' | 'ERRO' | 'PARCIAL';
}

// KPIs do Dashboard Principal
export interface KPISummary {
  resumoFaturamentoTotal: number; // NF + ND
  drcAtual: number;
  drcRetroativo: number;
  diarioOficialAtual: number;
  detranAtual: number;
  detranRetroativo: number;
  financeiraAtual: number;
  financeiraRetroativo: number;
  faturamentoDRC: number; // DRC + DO
  apontamentoDRC: number;
  percExecucao: number; // drcAtual / apontamentoDRC
  apontamentoTotal: number;
  faturamentoTotal: number;
}

export interface PivotRow {
  origem: string;
  [mesAno: string]: number | string;
  total: number;
}

export interface ComparativoApontFat {
  sigla: string;
  cliente: string;
  pdContrato: string;
  apontamento: number;
  faturamento: number;
  pendente: number;
  observacao?: string;
}

export interface FiltrosGlobais {
  mesAno: string; // e.g. "4/2026"
  statusNF: StatusNF | 'TODOS';
  origem: Origem | 'TODOS';
  cliente: string;
  contrato: string;
}
