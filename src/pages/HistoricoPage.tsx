import { useDataStore } from '../store/dataStore';
import { formatCurrency } from '../services/calculations';
import { EvolucaoLineChart } from '../components/charts/Charts';
import { useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';

export default function HistoricoPage() {
  const { historico, notas } = useDataStore();

  // Dados de evolução por mês (das notas carregadas)
  const evolucaoData = useMemo(() => {
    const mesesMap = new Map<string, { faturamento: number; apontamento: number }>();
    notas.filter(n => n.statusNF === 'ABERTA').forEach(n => {
      if (!n.mesAno) return;
      const ex = mesesMap.get(n.mesAno);
      if (ex) ex.faturamento += n.valorNotaFiscal;
      else mesesMap.set(n.mesAno, { faturamento: n.valorNotaFiscal, apontamento: 0 });
    });

    return Array.from(mesesMap.entries())
      .sort(([a], [b]) => {
        const [ma, aa] = a.split('/').map(Number);
        const [mb, ab] = b.split('/').map(Number);
        return aa !== ab ? aa - ab : ma - mb;
      })
      .map(([mes, v]) => ({ mes, ...v }));
  }, [notas]);

  const sortedHistorico = [...historico].sort(
    (a, b) => new Date(b.dataImportacao).getTime() - new Date(a.dataImportacao).getTime()
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Histórico de Importações</h1>
          <p className="page-subtitle">Últimas {sortedHistorico.length} importações · Máximo 12 meses</p>
        </div>
      </div>

      {/* Evolução mensal */}
      <div className="card animate-in" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">📈 Evolução Mensal do Faturamento</span>
          <span className="badge badge-info">Notas Abertas</span>
        </div>
        <div className="card-body">
          <div className="chart-container" style={{ height: 300 }}>
            <EvolucaoLineChart data={evolucaoData} />
          </div>
        </div>
      </div>

      {/* Timeline de importações */}
      <div className="card animate-in animate-in-delay-1">
        <div className="card-header">
          <span className="card-title">🗂 Histórico de Importações</span>
          <span className="badge badge-primary">{sortedHistorico.length} registros</span>
        </div>
        {sortedHistorico.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-title">Nenhuma importação registrada</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              Acesse a aba <strong>Importar Dados</strong> para carregar novos dados
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês Ref.</th>
                  <th>Data Importação</th>
                  <th style={{ textAlign: 'right' }}>Total NF</th>
                  <th style={{ textAlign: 'right' }}>Total ND</th>
                  <th style={{ textAlign: 'right' }}>Faturamento Total</th>
                  <th style={{ textAlign: 'right' }}>Apontamento</th>
                  <th>Usuário</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Variação</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistorico.map((h, i) => {
                  const anterior = sortedHistorico[i + 1];
                  const variacao = anterior
                    ? ((h.faturamentoTotal - anterior.faturamentoTotal) / anterior.faturamentoTotal) * 100
                    : null;
                  return (
                    <tr key={h.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} style={{ color: 'var(--color-text-muted)' }} />
                          <strong>{h.mesReferencia}</strong>
                        </div>
                      </td>
                      <td>{new Date(h.dataImportacao).toLocaleString('pt-BR')}</td>
                      <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(h.totalNF, true)}</td>
                      <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(h.totalND, true)}</td>
                      <td className="currency bold" style={{ textAlign: 'right' }}>{formatCurrency(h.faturamentoTotal, true)}</td>
                      <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(h.totalApontamento, true)}</td>
                      <td style={{ fontSize: '0.76rem' }}>{h.usuario}</td>
                      <td>
                        <span className={`badge badge-${h.status === 'COMPLETO' ? 'success' : h.status === 'ERRO' ? 'danger' : 'warning'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {variacao !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            {variacao >= 0
                              ? <TrendingUp size={13} style={{ color: 'var(--color-success)' }} />
                              : <TrendingDown size={13} style={{ color: 'var(--color-danger)' }} />}
                            <span style={{
                              fontSize: '0.78rem', fontWeight: 600,
                              color: variacao >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                              {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
                            </span>
                          </div>
                        ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
