import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useFilterStore } from '../store/filterStore';
import { formatCurrency, formatPercent } from '../services/calculations';
import FiltrosBar from '../components/dashboard/FiltrosBar';

export default function DrcResumoPage() {
  const { notas, apontamento } = useDataStore();
  const { filtros } = useFilterStore();

  const isTodos = filtros.mesAno === 'TODOS';
  const [mesStr, anoStr] = isTodos ? ['0', '0'] : filtros.mesAno.split('/');
  const mes = parseInt(mesStr);
  const ano = parseInt(anoStr);

  const drcNotas = useMemo(() =>
    notas.filter(n => n.origem === 'DRC' && (isTodos || n.mesAno === filtros.mesAno) && (filtros.statusNF === 'TODOS' || n.statusNF === filtros.statusNF)),
    [notas, filtros, isTodos]
  );

  const apontMes = useMemo(() =>
    apontamento.filter(a => (isTodos || (a.mes === mes && a.ano === ano)) && a.sigla !== 'DETRAN'),
    [apontamento, mes, ano, isTodos]
  );

  // Agrupado por cliente
  const resumoPorCliente = useMemo(() => {
    const map = new Map<string, {
      cliente: string;
      sigla: string;
      contratos: Map<string, { contrato: string; faturamento: number; apontamento: number }>;
    }>();

    drcNotas.forEach(n => {
      if (!map.has(n.razaoSocial)) {
        map.set(n.razaoSocial, { cliente: n.razaoSocial, sigla: n.classificacao, contratos: new Map() });
      }
      const gr = map.get(n.razaoSocial)!;
      const key = n.numContrato;
      if (!gr.contratos.has(key)) gr.contratos.set(key, { contrato: key, faturamento: 0, apontamento: 0 });
      gr.contratos.get(key)!.faturamento += n.valorNotaFiscal;
    });

    apontMes.forEach(a => {
      const clienteKey = a.cliente;
      if (!map.has(clienteKey)) {
        map.set(clienteKey, { cliente: clienteKey, sigla: a.sigla, contratos: new Map() });
      }
      const gr = map.get(clienteKey)!;
      if (!gr.contratos.has(a.pdContrato)) gr.contratos.set(a.pdContrato, { contrato: a.pdContrato, faturamento: 0, apontamento: 0 });
      gr.contratos.get(a.pdContrato)!.apontamento += a.valorTotal;
    });

    return Array.from(map.values())
      .map(g => {
        const contratos = Array.from(g.contratos.values());
        const totFat = contratos.reduce((s, c) => s + c.faturamento, 0);
        const totApont = contratos.reduce((s, c) => s + c.apontamento, 0);
        return { ...g, contratos, totFat, totApont, diff: totApont - totFat };
      })
      .sort((a, b) => b.diff - a.diff);
  }, [drcNotas, apontMes]);

  const totalFaturamento = resumoPorCliente.reduce((s, g) => s + g.totFat, 0);
  const totalApontamento = resumoPorCliente.reduce((s, g) => s + g.totApont, 0);
  const percExec = totalApontamento > 0 ? (totalFaturamento / totalApontamento) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">DRC — Resumo por Cliente</h1>
          <p className="page-subtitle">Taxas de execução e diferenças por contrato · {filtros.mesAno}</p>
        </div>
      </div>

      <FiltrosBar />

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Apontamento DRC', value: formatCurrency(totalApontamento, true), variant: 'default' },
          { label: 'Total Faturamento DRC', value: formatCurrency(totalFaturamento, true), variant: 'primary' },
          { label: 'Diferença (Gap)', value: formatCurrency(totalApontamento - totalFaturamento, true), variant: (totalApontamento - totalFaturamento) > 0 ? 'danger' : 'success' },
          { label: '% Execução Geral', value: formatPercent(percExec), variant: percExec >= 90 ? 'success' : percExec >= 70 ? 'warning' : 'danger' },
        ].map((k, i) => (
          <div key={i} className={`kpi-card variant-${k.variant}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="card animate-in">
        <div className="card-header">
          <span className="card-title">📋 Resumo DRC por Cliente — Apontamento vs Faturamento</span>
          <span className="badge badge-primary">{resumoPorCliente.length} clientes</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contratos</th>
                <th style={{ textAlign: 'right' }}>Apontamento</th>
                <th style={{ textAlign: 'right' }}>Faturado</th>
                <th style={{ textAlign: 'right' }}>Diferença</th>
                <th style={{ minWidth: 160 }}>% Execução</th>
              </tr>
            </thead>
            <tbody>
              {resumoPorCliente.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                    Nenhum dado disponível para {filtros.mesAno}
                  </td>
                </tr>
              ) : resumoPorCliente.map((g, i) => {
                const perc = g.totApont > 0 ? (g.totFat / g.totApont) * 100 : (g.totFat > 0 ? 100 : 0);
                const percClass = perc >= 90 ? 'success' : perc >= 70 ? 'warning' : 'danger';

                return (
                  <tr key={i}>
                    <td className="bold" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.cliente}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {g.contratos.slice(0, 3).map(c => (
                          <span key={c.contrato} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{c.contrato}</span>
                        ))}
                        {g.contratos.length > 3 && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>+{g.contratos.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(g.totApont, true)}</td>
                    <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(g.totFat, true)}</td>
                    <td className={`currency ${g.diff > 0 ? 'danger' : 'success'}`} style={{ textAlign: 'right' }}>
                      {formatCurrency(g.diff, true)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar-wrap">
                          <div className={`progress-bar-fill ${percClass}`} style={{ width: `${Math.min(perc, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, minWidth: 42, color: `var(--color-${percClass})` }}>
                          {formatPercent(perc)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOTAL GERAL</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(totalApontamento, true)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(totalFaturamento, true)}</td>
                <td style={{ textAlign: 'right', color: (totalApontamento - totalFaturamento) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {formatCurrency(totalApontamento - totalFaturamento, true)}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: percExec >= 90 ? 'var(--color-success)' : percExec >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {formatPercent(percExec)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
