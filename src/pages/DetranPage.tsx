import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useFilterStore } from '../store/filterStore';
import { formatCurrency } from '../services/calculations';
import FiltrosBar from '../components/dashboard/FiltrosBar';
import { ComposicaoDonut } from '../components/charts/Charts';

export default function DetranPage() {
  const { notas, apontamento } = useDataStore();
  const { filtros } = useFilterStore();

  const isTodos = filtros.mesAno === 'TODOS';
  const [mesStr, anoStr] = isTodos ? ['0', '0'] : filtros.mesAno.split('/');
  const mes = parseInt(mesStr);
  const ano = parseInt(anoStr);

  const notasDetran = useMemo(() =>
    notas.filter(n => n.origem === 'DETRAN' && (isTodos || n.mesAno === filtros.mesAno) && (filtros.statusNF === 'TODOS' || n.statusNF === filtros.statusNF)),
    [notas, filtros, isTodos]
  );

  const notasTerceiros = useMemo(() =>
    notas.filter(n => n.classificacao === 'DETRAN - Terceiros' && (isTodos || n.mesAno === filtros.mesAno) && (filtros.statusNF === 'TODOS' || n.statusNF === filtros.statusNF)),
    [notas, filtros, isTodos]
  );

  const apontDetran = useMemo(() =>
    apontamento.filter(a => a.sigla === 'DETRAN' && (isTodos || (a.mes === mes && a.ano === ano))),
    [apontamento, mes, ano, isTodos]
  );

  const totais = useMemo(() => {
    const fatDetran = notasDetran.reduce((s, n) => s + n.valorNotaFiscal, 0);
    const fatTerceiros = notasTerceiros.reduce((s, n) => s + n.valorNotaFiscal, 0);
    const apont = apontDetran.reduce((s, a) => s + a.valorTotal, 0);
    return {
      fatDetran,
      fatTerceiros,
      fatTotal: fatDetran + fatTerceiros,
      apontamento: apont,
      gap: apont - fatDetran,
    };
  }, [notasDetran, notasTerceiros, apontDetran]);

  // Donut data
  const donutData = useMemo(() => [
    { name: 'DETRAN Direto', value: totais.fatDetran },
    { name: 'DETRAN Terceiros', value: totais.fatTerceiros },
  ].filter(d => d.value > 0), [totais]);

  // Terceiros por empresa
  const terceirosPorEmpresa = useMemo(() => {
    const map = new Map<string, { cliente: string; contrato: string; total: number }>();
    notasTerceiros.forEach(n => {
      const key = `${n.razaoSocial}||${n.numContrato}`;
      const ex = map.get(key);
      if (ex) ex.total += n.valorNotaFiscal;
      else map.set(key, { cliente: n.razaoSocial, contrato: n.numContrato, total: n.valorNotaFiscal });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [notasTerceiros]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">🚗 DETRAN</h1>
          <p className="page-subtitle">Visão específica — Departamento Estadual de Trânsito · {filtros.mesAno}</p>
        </div>
      </div>

      <FiltrosBar />

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: 24 }}>
        {[
          { label: 'Faturamento DETRAN Direto', value: formatCurrency(totais.fatDetran, true), variant: 'primary' },
          { label: 'DETRAN Terceiros', value: formatCurrency(totais.fatTerceiros, true), variant: 'warning' },
          { label: 'Total DETRAN', value: formatCurrency(totais.fatTotal, true), variant: 'info' },
          { label: 'Apontamento DETRAN', value: formatCurrency(totais.apontamento, true), variant: 'default' },
          { label: 'Gap (Apont - Fat)', value: formatCurrency(totais.gap, true), variant: totais.gap > 0 ? 'danger' : 'success' },
        ].map((k, i) => (
          <div key={i} className={`kpi-card variant-${k.variant}`}>
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${k.variant === 'danger' ? 'highlight-danger' : ''}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="section-grid animate-in">
        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Composição Faturamento DETRAN</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              {donutData.length > 0
                ? <ComposicaoDonut data={donutData} />
                : <div className="empty-state"><div>Sem dados para exibir</div></div>
              }
            </div>
          </div>
        </div>

        {/* Notas DETRAN Direto */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Notas Fiscais DETRAN Direto</span>
            <span className="badge badge-primary">{notasDetran.length} notas</span>
          </div>
          <div className="table-wrapper" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Razão Social</th>
                  <th>Contrato</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {notasDetran.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    Nenhum registro
                  </td></tr>
                ) : notasDetran.slice(0, 20).map(n => (
                  <tr key={n.id}>
                    <td className="bold" style={{ fontSize: '0.78rem' }}>{n.razaoSocial}</td>
                    <td><span className="badge badge-neutral">{n.numContrato}</span></td>
                    <td><span className={`badge badge-${n.statusNF === 'ABERTA' ? 'warning' : 'success'}`}>{n.statusNF}</span></td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(n.valorNotaFiscal, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Terceiros */}
      <div className="section-full card animate-in animate-in-delay-2">
        <div className="card-header">
          <span className="card-title">🏢 Empresas Credenciadas DETRAN (Terceiros)</span>
          <span className="badge badge-warning">{terceirosPorEmpresa.length} empresas</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Razão Social</th>
                <th>Contrato</th>
                <th style={{ textAlign: 'right' }}>Total Faturado</th>
                <th style={{ textAlign: 'right' }}>% do Total</th>
              </tr>
            </thead>
            <tbody>
              {terceirosPorEmpresa.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  Nenhuma empresa credenciada encontrada
                </td></tr>
              ) : terceirosPorEmpresa.map((t, i) => {
                const perc = totais.fatTerceiros > 0 ? (t.total / totais.fatTerceiros) * 100 : 0;
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td className="bold">{t.cliente}</td>
                    <td><span className="badge badge-neutral">{t.contrato}</span></td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(t.total, true)}</td>
                    <td style={{ textAlign: 'right', minWidth: 160 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <div className="progress-bar-wrap" style={{ width: 80 }}>
                          <div className="progress-bar-fill warning" style={{ width: `${Math.min(perc, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 600, minWidth: 40 }}>{perc.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>TOTAL</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(totais.fatTerceiros, true)}</td>
                <td style={{ textAlign: 'right' }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
