import { useMemo, useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import { useFilterStore } from '../store/filterStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  calcularKPIs, filtrarNotas, gerarPivotGeral, formatCurrency, formatPercent, getMesesDisponiveis
} from '../services/calculations';
import KPIGrid from '../components/dashboard/KPIGrid';
import FiltrosBar from '../components/dashboard/FiltrosBar';
import { OrigemBarChart, ComposicaoDonut } from '../components/charts/Charts';
import { Download, FileSpreadsheet, FileText as FilePDF, Monitor, Minimize2, Sparkles, Target } from 'lucide-react';
import { exportRelatorioCompleto, exportKPIsToPDF } from '../services/exportService';

export default function FaturamentoGeral() {
  const { notas, notasDebito, apontamento, isLoading, error } = useDataStore();
  const { filtros } = useFilterStore();
  const { mesReferencia } = useSettingsStore();

  // Mode state: presentation mode vs standard mode
  const [isPresentation, setIsPresentation] = useState(false);
  const [chartType, setChartType] = useState<'stacked' | 'grouped' | 'area'>('stacked');

  // Trigger body CSS class toggle for presentation mode layout overrides
  useEffect(() => {
    if (isPresentation) {
      document.body.classList.add('presentation-mode');
    } else {
      document.body.classList.remove('presentation-mode');
    }
    return () => {
      document.body.classList.remove('presentation-mode');
    };
  }, [isPresentation]);

  const kpis = useMemo(() =>
    calcularKPIs(notas, notasDebito, apontamento, filtros.mesAno, mesReferencia),
    [notas, notasDebito, apontamento, filtros.mesAno, mesReferencia]
  );

  const notasFiltradas = useMemo(() =>
    filtrarNotas(notas, filtros),
    [notas, filtros]
  );

  // Pivot table data (por Origem × Mês)
  const pivotData = useMemo(() => gerarPivotGeral(notas, filtros.statusNF), [notas, filtros.statusNF]);

  const meses = useMemo(() => getMesesDisponiveis(notas), [notas]);

  // Bar chart data (por mês)
  const barData = useMemo(() => {
    return meses.map(m => {
      const notasMes = notas.filter(n => n.mesAno === m && (filtros.statusNF === 'TODOS' || n.statusNF === filtros.statusNF));
      return {
        mesAno: m,
        DRC: notasMes.filter(n => n.origem === 'DRC').reduce((s, n) => s + n.valorNotaFiscal, 0),
        DETRAN: notasMes.filter(n => n.origem === 'DETRAN').reduce((s, n) => s + n.valorNotaFiscal, 0),
        'DIÁRIO OFICIAL': notasMes.filter(n => n.origem === 'DIÁRIO OFICIAL').reduce((s, n) => s + n.valorNotaFiscal, 0),
        FINANCEIRA: notasMes.filter(n => n.origem === 'FINANCEIRA').reduce((s, n) => s + n.valorNotaFiscal, 0),
      };
    });
  }, [notas, meses, filtros.statusNF]);

  // Donut data
  const donutData = useMemo(() => {
    const origens = ['DRC', 'DETRAN', 'DIÁRIO OFICIAL', 'FINANCEIRA'];
    return origens.map(origem => ({
      name: origem,
      value: notasFiltradas.filter(n => n.origem === origem).reduce((s, n) => s + n.valorNotaFiscal, 0),
    })).filter(d => d.value > 0);
  }, [notasFiltradas]);

  // Resumo por cliente (top 15)
  const clientesRanking = useMemo(() => {
    const map = new Map<string, { cliente: string; contrato: string; total: number }>();
    notasFiltradas
      .filter(n => n.origem === 'DRC')
      .forEach(n => {
        const key = `${n.razaoSocial}||${n.numContrato}`;
        const existing = map.get(key);
        if (existing) existing.total += n.valorNotaFiscal;
        else map.set(key, { cliente: n.razaoSocial, contrato: n.numContrato, total: n.valorNotaFiscal });
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [notasFiltradas]);

  // Resumo DETRAN Terceiros
  const detranTerceiros = useMemo(() => {
    const map = new Map<string, { cliente: string; contrato: string; total: number }>();
    notas
      .filter(n => n.classificacao === 'DETRAN - Terceiros' && (filtros.statusNF === 'TODOS' || n.statusNF === filtros.statusNF))
      .forEach(n => {
        const key = `${n.razaoSocial}||${n.numContrato}`;
        const existing = map.get(key);
        if (existing) existing.total += n.valorNotaFiscal;
        else map.set(key, { cliente: n.razaoSocial, contrato: n.numContrato, total: n.valorNotaFiscal });
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [notas, filtros.statusNF]);

  // Calculate GAP
  const gap = useMemo(() => {
    return kpis.apontamentoTotal - kpis.faturamentoTotal;
  }, [kpis]);

  // Dynamic Executive Summary commentary text for directors
  const executiveSummaryText = useMemo(() => {
    const totalFatStr = formatCurrency(kpis.resumoFaturamentoTotal, true);
    const drcConsolidadoStr = formatCurrency(kpis.faturamentoDRC, true);
    const detranStr = formatCurrency(kpis.detranAtual + kpis.detranRetroativo, true);
    const financeiraStr = formatCurrency(kpis.financeiraAtual + kpis.financeiraRetroativo, true);
    const percExecStr = formatPercent(kpis.percExecucao);
    const gapStr = formatCurrency(Math.abs(gap), true);

    return `Prezados Diretores, no período de referência ${filtros.mesAno || 'consolidado'}, o faturamento total da Gerência de Operações registrou o montante consolidado de ${totalFatStr} (NF + ND). O faturamento DRC consolidado (incluindo Diário Oficial) somou ${drcConsolidadoStr}, operando com uma taxa de execução de ${percExecStr} em relação ao volume apontado. As receitas de serviços DETRAN totalizaram ${detranStr} e as demais receitas Financeiras/DO totalizaram ${financeiraStr}. Identificou-se um GAP de faturamento de ${gapStr} ${gap > 0 ? 'abaixo' : 'acima'} do volume previsto.`;
  }, [kpis, filtros.mesAno, gap]);

  if (isLoading && notas.length === 0) {
    return (
      <div className="loading-state">
        <span className="loading-spinner" />
        Carregando dados...
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">{error}</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
          Verifique se o servidor mock está rodando: <code>npm run server</code>
        </p>
      </div>
    );
  }

  // ============================================================
  // PRESENTATION MODE LAYOUT (For Directors)
  // ============================================================
  if (isPresentation) {
    return (
      <div className="presentation-container animate-in">
        {/* Presentation Header */}
        <div className="page-header" style={{ borderBottom: '1px solid #334155', paddingBottom: 16 }}>
          <div className="page-header-info">
            <h2 className="page-title" style={{ fontSize: '2.2rem', margin: 0 }}>Apresentação de Faturamento Executivo</h2>
            <p className="page-subtitle">
              Gerência de Operações — Referência: {filtros.mesAno} · PRODESP
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              style={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderColor: '#475569' }}
              onClick={() => exportKPIsToPDF(kpis, filtros.mesAno)}
            >
              <FilePDF size={14} />
              Exportar PDF Executivo
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setIsPresentation(false)}
            >
              <Minimize2 size={14} />
              Sair da Apresentação
            </button>
          </div>
        </div>

        {/* Dynamic Storytelling Summary */}
        <div className="presentation-executive-summary">
          <strong>Resumo Analítico da Coordenação:</strong> {executiveSummaryText}
        </div>

        {/* 4 Big Main KPIs for Projections */}
        <div className="presentation-kpis">
          <div className="presentation-kpi-card" title={`Valor Completo: ${formatCurrency(kpis.resumoFaturamentoTotal, false)}`}>
            <div className="presentation-kpi-label">Faturamento Consolidado</div>
            <div className="presentation-kpi-value" style={{ cursor: 'help' }}>{formatCurrency(kpis.resumoFaturamentoTotal, true)}</div>
            <div className="presentation-kpi-sub">Total Notas Fiscais + Notas de Débito</div>
          </div>
          <div className="presentation-kpi-card" title={`Valor Completo: ${formatCurrency(kpis.faturamentoDRC, false)}`}>
            <div className="presentation-kpi-label">Faturamento DRC Consolidado</div>
            <div className="presentation-kpi-value" style={{ cursor: 'help' }}>{formatCurrency(kpis.faturamentoDRC, true)}</div>
            <div className="presentation-kpi-sub">Contratos DRC + Diário Oficial</div>
          </div>
          <div className="presentation-kpi-card" title={`Taxa Real: ${formatPercent(kpis.percExecucao)}`}>
            <div className="presentation-kpi-label">Taxa de Execução DRC</div>
            <div className="presentation-kpi-value" style={{ cursor: 'help', color: kpis.percExecucao >= 90 ? '#10B981' : kpis.percExecucao >= 70 ? '#F59E0B' : '#EF4444' }}>
              {formatPercent(kpis.percExecucao)}
            </div>
            <div className="presentation-kpi-sub">Realizado vs Apontado</div>
          </div>
          <div className="presentation-kpi-card" title={`Valor Completo: ${formatCurrency(gap, false)}`}>
            <div className="presentation-kpi-label">GAP Operacional</div>
            <div className="presentation-kpi-value" style={{ cursor: 'help', color: gap > 0 ? '#EF4444' : '#10B981' }}>
              {formatCurrency(gap, true)}
            </div>
            <div className="presentation-kpi-sub">Apontamento - Faturamento</div>
          </div>
        </div>

        {/* Chart View with Dynamic Format Controls */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ color: '#F8FAFC' }}>📈 Análise de Tendência de Receitas por Origem</span>
            <div className="presentation-chart-controls">
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>Formato:</span>
              <div className="presentation-btn-group">
                <button
                  className={chartType === 'stacked' ? 'active' : ''}
                  onClick={() => setChartType('stacked')}
                >
                  Empilhado
                </button>
                <button
                  className={chartType === 'grouped' ? 'active' : ''}
                  onClick={() => setChartType('grouped')}
                >
                  Agrupado
                </button>
                <button
                  className={chartType === 'area' ? 'active' : ''}
                  onClick={() => setChartType('area')}
                >
                  Área
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 350 }}>
              <OrigemBarChart data={barData} type={chartType} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STANDARD DASHBOARD LAYOUT (For Coordinators/Analysts)
  // ============================================================
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Faturamento Geral</h1>
          <p className="page-subtitle">
            Dashboard consolidado — Referência: {filtros.mesAno} · {notasFiltradas.length} notas
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsPresentation(true)}
          >
            <Monitor size={14} />
            Modo Apresentação
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportKPIsToPDF(kpis, filtros.mesAno)}
          >
            <FilePDF size={14} />
            PDF
          </button>
          <button
            className="btn btn-success btn-sm"
            onClick={() => exportRelatorioCompleto(notas, notasDebito, apontamento, kpis, filtros.mesAno)}
          >
            <FileSpreadsheet size={14} />
            Excel Completo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosBar />

      {/* Destaques Executivos */}
      <div className="executive-summary-banner animate-in">
        <div className="executive-summary-title">
          <Sparkles size={16} />
          <span>Resumo Analítico da Coordenação</span>
        </div>
        <div className="executive-summary-text">
          {executiveSummaryText}
        </div>
      </div>

      {/* KPIs */}
      <KPIGrid kpis={kpis} />

      {/* Meta de Execução Consolidada */}
      <div className="meta-progress-container animate-in animate-in-delay-1">
        <div className="meta-progress-header">
          <div className="meta-progress-title">
            <Target size={16} style={{ color: 'var(--color-primary-light)' }} />
            <span>Meta de Execução de Faturamento DRC (Realizado vs. Apontado)</span>
          </div>
          <div className="meta-progress-percent">
            {formatPercent(kpis.percExecucao)}
          </div>
        </div>
        <div className="progress-bar-wrap" style={{ height: 10 }}>
          <div 
            className={`progress-bar-fill ${kpis.percExecucao >= 90 ? 'success' : kpis.percExecucao >= 70 ? 'warning' : 'danger'}`} 
            style={{ width: `${Math.min(kpis.percExecucao, 100)}%` }} 
          />
        </div>
        <div className="meta-progress-subtext">
          O faturamento DRC acumulou <strong>{formatCurrency(kpis.faturamentoDRC, true)}</strong> contra um volume previsto apontado de <strong>{formatCurrency(kpis.apontamentoDRC, true)}</strong>.
        </div>
      </div>

      {/* Charts Row */}
      <div className="section-grid animate-in animate-in-delay-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">📊 Faturamento por Origem e Mês</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <OrigemBarChart data={barData} type="stacked" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🥧 Composição do Faturamento</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ComposicaoDonut data={donutData} />
            </div>
          </div>
        </div>
      </div>

      {/* Pivot Table GERAL */}
      <div className="section-full card animate-in animate-in-delay-3" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">📋 Tabela GERAL — Faturamento por Origem × Mês</span>
          <span className="badge badge-info">Status: {filtros.statusNF}</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Origem</th>
                {meses.map(m => <th key={m} style={{ textAlign: 'right' }}>{m}</th>)}
                <th style={{ textAlign: 'right' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {pivotData.map(row => (
                <tr key={row.origem}>
                  <td className="bold">{row.origem}</td>
                  {meses.map(m => (
                    <td key={m} className="currency" style={{ textAlign: 'right' }}>
                      {(row[m] as number) > 0 ? formatCurrency(row[m] as number, true) : '—'}
                    </td>
                  ))}
                  <td className="currency bold" style={{ textAlign: 'right' }}>
                    {formatCurrency(row.total, true)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL GERAL</td>
                {meses.map(m => (
                  <td key={m} style={{ textAlign: 'right' }}>
                    {formatCurrency(pivotData.reduce((s, r) => s + ((r[m] as number) || 0), 0), true)}
                  </td>
                ))}
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(pivotData.reduce((s, r) => s + r.total, 0), true)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two tables side by side */}
      <div className="section-grid animate-in animate-in-delay-3">
        {/* Ranking Clientes DRC */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏢 Resumo NF por Cliente (DRC)</span>
            <span className="badge badge-primary">{clientesRanking.length} clientes</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Razão Social</th>
                  <th>Contrato</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {clientesRanking.map((c, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td className="bold" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.cliente}
                    </td>
                    <td><span className="badge badge-neutral">{c.contrato}</span></td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(c.total, true)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>TOTAL</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(clientesRanking.reduce((s, c) => s + c.total, 0), true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* DETRAN Terceiros */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚗 Resumo DETRAN Terceiros</span>
            <span className="badge badge-warning">{detranTerceiros.length} empresas</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Razão Social</th>
                  <th>Contrato</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {detranTerceiros.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                    Nenhum registro encontrado
                  </td></tr>
                ) : detranTerceiros.slice(0, 15).map((c, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td className="bold" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.cliente}
                    </td>
                    <td><span className="badge badge-neutral">{c.contrato}</span></td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(c.total, true)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>TOTAL</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(detranTerceiros.reduce((s, c) => s + c.total, 0), true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* NDs */}
      <div className="section-full card animate-in animate-in-delay-3">
        <div className="card-header">
          <span className="card-title">📑 Notas de Débito (DRC - ND-LOCACAO)</span>
          <span className="badge badge-primary">{notasDebito.filter(n => n.status === 'ABERTA').length} abertas</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Razão Social</th>
                <th>Contrato</th>
                <th>Tipo ND</th>
                <th>Status</th>
                <th>Mês Ref.</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {notasDebito
                .filter(n => filtros.statusNF === 'TODOS' || n.status === filtros.statusNF)
                .slice(0, 20)
                .map(nd => (
                <tr key={nd.id}>
                  <td className="bold">{nd.razaoSocial}</td>
                  <td><span className="badge badge-neutral">{nd.contrato}</span></td>
                  <td style={{ fontSize: '0.76rem' }}>{nd.tipoND}</td>
                  <td>
                    <span className={`badge badge-${nd.status === 'ABERTA' ? 'warning' : 'success'}`}>
                      {nd.status}
                    </span>
                  </td>
                  <td>{nd.mesReferencia}</td>
                  <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(nd.valor, true)}</td>
                  <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(nd.saldoParcelas, true)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>TOTAL</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(notasDebito.filter(n => filtros.statusNF === 'TODOS' || n.status === filtros.statusNF)
                    .reduce((s, n) => s + n.valor, 0), true)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(notasDebito.filter(n => filtros.statusNF === 'TODOS' || n.status === filtros.statusNF)
                    .reduce((s, n) => s + n.saldoParcelas, 0), true)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
