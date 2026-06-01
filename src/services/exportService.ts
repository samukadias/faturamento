import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { NotaFiscal, NotaDebito, ApontamentoRecord, KPISummary } from '../types';
import { formatCurrency } from './calculations';

// ============================
// EXPORT TO EXCEL
// ============================
export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportNotasToExcel(notas: NotaFiscal[], filename = 'notas_fiscais') {
  const data = notas.map(n => ({
    'Razão Social': n.razaoSocial,
    'Num Contrato': n.numContrato,
    'Num NF': n.numNotaFiscal,
    'Origem': n.origem,
    'Período': n.mesAno,
    'Data Emissão': n.dataEmissao,
    'Status': n.statusNF,
    'Valor NF': n.valorNotaFiscal,
    'Saldo': n.saldoParcelas,
    'Objeto ESP': n.objetoEspecificacao,
  }));
  exportToExcel(data, filename, 'Notas Fiscais');
}

export function exportRelatorioCompleto(
  notas: NotaFiscal[],
  notasDebito: NotaDebito[],
  apontamento: ApontamentoRecord[],
  kpis: KPISummary,
  mesRef: string
) {
  const wb = XLSX.utils.book_new();

  // Aba Resumo
  const resumo = [
    ['RELATÓRIO DE FATURAMENTO - GERÊNCIA DE OPERAÇÕES', '', ''],
    ['Período de Referência:', mesRef, ''],
    ['Data de Geração:', new Date().toLocaleDateString('pt-BR'), ''],
    ['', '', ''],
    ['RESUMO EXECUTIVO', '', ''],
    ['Indicador', 'Valor', ''],
    ['Faturamento Total (NF + ND)', formatCurrency(kpis.resumoFaturamentoTotal), ''],
    ['DRC (atual)', formatCurrency(kpis.drcAtual), ''],
    ['DRC (retroativo)', formatCurrency(kpis.drcRetroativo), ''],
    ['Diário Oficial (atual)', formatCurrency(kpis.diarioOficialAtual), ''],
    ['DETRAN (atual)', formatCurrency(kpis.detranAtual), ''],
    ['DETRAN (retroativo)', formatCurrency(kpis.detranRetroativo), ''],
    ['Financeira (atual)', formatCurrency(kpis.financeiraAtual), ''],
    ['Financeira (retroativo)', formatCurrency(kpis.financeiraRetroativo), ''],
    ['Faturamento DRC (DRC + DO)', formatCurrency(kpis.faturamentoDRC), ''],
    ['Apontamento DRC', formatCurrency(kpis.apontamentoDRC), ''],
    ['% Execução DRC', `${kpis.percExecucao.toFixed(1)}%`, ''],
    ['Apontamento Total', formatCurrency(kpis.apontamentoTotal), ''],
    ['Faturamento Total', formatCurrency(kpis.faturamentoTotal), ''],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo');

  // Aba Notas Fiscais
  const notasData = notas.map(n => ({
    'Razão Social': n.razaoSocial,
    'Contrato': n.numContrato,
    'Num NF': n.numNotaFiscal,
    'Origem': n.origem,
    'Classificação': n.classificacao,
    'Período': n.mesAno,
    'Data Emissão': n.dataEmissao,
    'Status': n.statusNF,
    'Valor NF': n.valorNotaFiscal,
    'Retenção IRRF': n.retencaoIRRF,
    'Retenção ISS': n.retencaoISS,
    'Saldo': n.saldoParcelas,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notasData), 'Notas Fiscais');

  // Aba Notas de Débito
  const ndData = notasDebito.map(nd => ({
    'Razão Social': nd.razaoSocial,
    'Contrato': nd.contrato,
    'Tipo ND': nd.tipoND,
    'Status': nd.status,
    'Valor': nd.valor,
    'Mês Referência': nd.mesReferencia,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ndData), 'Notas de Débito');

  XLSX.writeFile(wb, `Faturamento_${mesRef.replace('/', '_')}.xlsx`);
}

// ============================
// EXPORT TO PDF
// ============================
export function exportKPIsToPDF(kpis: KPISummary, mesRef: string) {
  const doc = new jsPDF();

  // 1. Header Block (Premium Dark Blue banner)
  doc.setFillColor(30, 58, 95); // Deep Blue
  doc.rect(0, 0, 210, 42, 'F');

  // Title inside Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATÓRIO DE FATURAMENTO GEROPS', 14, 18);

  // Subtitle inside Banner
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(190, 218, 255);
  doc.text(`COMPANHIA DE PROCESSAMENTO DE DADOS DO ESTADO DE SÃO PAULO — PRODESP`, 14, 25);
  doc.text(`Referência: ${mesRef}   |   Gerado em: ${new Date().toLocaleDateString('pt-BR')}   |   Perfil: Coordenador`, 14, 32);

  // Accent Line at the bottom of banner (Teal)
  doc.setFillColor(13, 148, 136); // Teal
  doc.rect(0, 40, 210, 2, 'F');

  // 2. Executive Commentary Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('1. Resumo Executivo para a Diretoria', 14, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  
  const totalFaturamento = formatCurrency(kpis.resumoFaturamentoTotal);
  const totalDRC = formatCurrency(kpis.faturamentoDRC);
  const totalDETRAN = formatCurrency(kpis.detranAtual + kpis.detranRetroativo);
  const totalFinanceira = formatCurrency(kpis.financeiraAtual + kpis.financeiraRetroativo);
  const percExec = kpis.percExecucao.toFixed(1);
  const gap = formatCurrency(kpis.apontamentoTotal - kpis.faturamentoTotal);

  const commentaryText = `Prezados Diretores, informamos que no período de referência ${mesRef}, o faturamento total consolidado da Gerência de Operações atingiu o montante de ${totalFaturamento}. Esse resultado é composto pelo faturamento dos contratos DRC (${totalDRC}), das receitas de serviços DETRAN (${totalDETRAN}) e receitas Financeiras/DO (${totalFinanceira}). A taxa de execução geral dos contratos DRC registrou o índice de ${percExec}%, com um GAP operacional de faturamento estimado em ${gap} em relação aos serviços apontados no mês.`;

  const splitCommentary = doc.splitTextToSize(commentaryText, 182);
  doc.text(splitCommentary, 14, 59);

  // Adjust Y-position dynamically based on text height
  const tableStartY = 59 + (splitCommentary.length * 5) + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Demonstrativo das Receitas Consolidadas', 14, tableStartY);

  // 3. Structured Data Table
  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Indicador Operacional / Contrato', 'Faturamento Consolidado']],
    body: [
      ['Faturamento Total Consolidado (NF + ND)', formatCurrency(kpis.resumoFaturamentoTotal)],
      ['Contratos DRC (Mês Corrente)', formatCurrency(kpis.drcAtual)],
      ['Contratos DRC (Retroativo / Diferenças)', formatCurrency(kpis.drcRetroativo)],
      ['Diário Oficial (Mês Corrente)', formatCurrency(kpis.diarioOficialAtual)],
      ['Serviços DETRAN (Mês Corrente)', formatCurrency(kpis.detranAtual)],
      ['Serviços DETRAN (Retroativos)', formatCurrency(kpis.detranRetroativo)],
      ['Receitas Financeiras (Mês Corrente)', formatCurrency(kpis.financeiraAtual)],
      ['Receitas Financeiras (Retroativas)', formatCurrency(kpis.financeiraRetroativo)],
      ['Total DRC Consolidado (DRC + Diário Oficial)', formatCurrency(kpis.faturamentoDRC)],
      ['Volume de Apontamento DRC', formatCurrency(kpis.apontamentoDRC)],
      ['Taxa de Execução DRC (%)', `${percExec}%`],
      ['Volume de Apontamento Total (Operações)', formatCurrency(kpis.apontamentoTotal)],
      ['GAP Faturamento (Apontado vs Realizado)', gap],
    ],
    styles: { fontSize: 9, cellPadding: 3.5, font: 'helvetica' },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [30, 58, 95] } },
    margin: { left: 14, right: 14 }
  });

  // 4. Footer & Signatures (Only on page 1)
  const pageHeight = doc.internal.pageSize.height;
  
  // Divider line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 38, 196, pageHeight - 38);

  // Signatures
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  
  // Left: Coordinator
  doc.text('Assinatura do Emissor', 14, pageHeight - 32);
  doc.line(14, pageHeight - 20, 80, pageHeight - 20);
  doc.text('Coordenador de Operações', 14, pageHeight - 16);

  // Right: Director
  doc.text('Aprovação da Diretoria', 130, pageHeight - 32);
  doc.line(130, pageHeight - 20, 196, pageHeight - 20);
  doc.text('Diretoria de Operações / Finanças', 130, pageHeight - 16);

  // Save the generated document
  doc.save(`Faturamento_Executivo_${mesRef.replace('/', '_')}.pdf`);
}
