import { useMemo, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useFilterStore } from '../store/filterStore';
import { gerarComparativo, formatCurrency } from '../services/calculations';
import FiltrosBar from '../components/dashboard/FiltrosBar';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { exportToExcel } from '../services/exportService';

interface GrupoCliente {
  sigla: string;
  cliente: string;
  total_apontamento: number;
  total_faturamento: number;
  total_pendente: number;
  contratos: {
    pdContrato: string;
    apontamento: number;
    faturamento: number;
    pendente: number;
    observacao: string;
  }[];
}

export default function ApontamentoVsFaturado() {
  const { notas, apontamento, isLoading } = useDataStore();
  const { filtros } = useFilterStore();
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState<Map<string, string>>(new Map());

  const comparativo = useMemo(() =>
    gerarComparativo(notas, apontamento, filtros.mesAno),
    [notas, apontamento, filtros.mesAno]
  );

  // Agrupar por cliente
  const grupos = useMemo((): GrupoCliente[] => {
    const map = new Map<string, GrupoCliente>();
    comparativo.forEach(item => {
      const key = item.cliente;
      if (!map.has(key)) {
        map.set(key, {
          sigla: item.sigla,
          cliente: item.cliente,
          total_apontamento: 0,
          total_faturamento: 0,
          total_pendente: 0,
          contratos: [],
        });
      }
      const grupo = map.get(key)!;
      grupo.total_apontamento += item.apontamento;
      grupo.total_faturamento += item.faturamento;
      grupo.total_pendente += item.pendente;
      grupo.contratos.push({
        pdContrato: item.pdContrato,
        apontamento: item.apontamento,
        faturamento: item.faturamento,
        pendente: item.pendente,
        observacao: observacoes.get(`${key}||${item.pdContrato}`) || '',
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total_pendente - a.total_pendente);
  }, [comparativo, observacoes]);

  const toggleCliente = (cliente: string) => {
    const next = new Set(expandedClientes);
    if (next.has(cliente)) next.delete(cliente);
    else next.add(cliente);
    setExpandedClientes(next);
  };

  const totalGeral = {
    apontamento: grupos.reduce((s, g) => s + g.total_apontamento, 0),
    faturamento: grupos.reduce((s, g) => s + g.total_faturamento, 0),
    pendente: grupos.reduce((s, g) => s + g.total_pendente, 0),
  };

  const handleExport = () => {
    const data = comparativo.map(c => ({
      'Sigla': c.sigla,
      'Cliente': c.cliente,
      'PD Contrato': c.pdContrato,
      'Apontamento': c.apontamento,
      'Faturamento': c.faturamento,
      'Pendente': c.pendente,
      'Observação': observacoes.get(`${c.cliente}||${c.pdContrato}`) || '',
    }));
    exportToExcel(data, `ApontVsFaturado_${filtros.mesAno.replace('/', '_')}`);
  };

  if (isLoading && notas.length === 0) {
    return <div className="loading-state"><span className="loading-spinner" />Carregando...</div>;
  }

  const comPendencia = grupos.filter(g => g.total_pendente > 100);
  const semPendencia = grupos.filter(g => g.total_pendente <= 100);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Apontamento vs Faturado</h1>
          <p className="page-subtitle">
            Comparativo por cliente e contrato — {filtros.mesAno}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-success btn-sm" onClick={handleExport}>
            <Download size={14} /> Exportar Excel
          </button>
        </div>
      </div>

      <FiltrosBar />

      {/* Resumo */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Apontamento Total', value: formatCurrency(totalGeral.apontamento, true), variant: 'default' },
          { label: 'Faturado Total', value: formatCurrency(totalGeral.faturamento, true), variant: 'success' },
          { label: 'Pendente Total', value: formatCurrency(totalGeral.pendente, true), variant: totalGeral.pendente > 0 ? 'danger' : 'success' },
          { label: 'Clientes c/ Pendência', value: String(comPendencia.length), variant: comPendencia.length > 0 ? 'warning' : 'success' },
        ].map((k, i) => (
          <div key={i} className={`kpi-card variant-${k.variant}`}>
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${k.variant === 'danger' ? 'highlight-danger' : k.variant === 'success' ? 'highlight-success' : ''}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela por Cliente (collapsible) */}
      <div className="card animate-in">
        <div className="card-header">
          <span className="card-title">📊 Comparativo por Cliente / Contrato</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-danger">{comPendencia.length} com pendência</span>
            <span className="badge badge-success">{semPendencia.length} ok</span>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Sigla</th>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Apontamento</th>
                <th style={{ textAlign: 'right' }}>Faturado</th>
                <th style={{ textAlign: 'right' }}>Pendente</th>
              </tr>
            </thead>
            <tbody>
              {grupos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    Nenhum dado encontrado para {filtros.mesAno}
                  </td>
                </tr>
              ) : grupos.map(g => (
                <>
                  <tr
                    key={g.cliente}
                    onClick={() => toggleCliente(g.cliente)}
                    style={{ cursor: 'pointer', background: g.total_pendente > 100 ? '#FFF7ED' : undefined }}
                  >
                    <td>
                      {expandedClientes.has(g.cliente)
                        ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                        : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                    </td>
                    <td><span className="badge badge-primary">{g.sigla}</span></td>
                    <td className="bold">{g.cliente}</td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(g.total_apontamento, true)}</td>
                    <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(g.total_faturamento, true)}</td>
                    <td className={`currency ${g.total_pendente > 0 ? 'danger' : 'success'}`} style={{ textAlign: 'right' }}>
                      {formatCurrency(g.total_pendente, true)}
                    </td>
                  </tr>

                  {expandedClientes.has(g.cliente) && g.contratos.map(c => (
                    <tr key={c.pdContrato} style={{ background: '#F0F9FF' }}>
                      <td></td>
                      <td></td>
                      <td style={{ paddingLeft: 24, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        📄 {c.pdContrato}
                      </td>
                      <td className="currency" style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                        {formatCurrency(c.apontamento, true)}
                      </td>
                      <td className="currency success" style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                        {formatCurrency(c.faturamento, true)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span className={`currency ${c.pendente > 0 ? 'danger' : 'success'}`} style={{ fontSize: '0.82rem' }}>
                            {formatCurrency(c.pendente, true)}
                          </span>
                          <input
                            type="text"
                            placeholder="Obs..."
                            value={c.observacao}
                            onChange={e => {
                              const next = new Map(observacoes);
                              next.set(`${g.cliente}||${c.pdContrato}`, e.target.value);
                              setObservacoes(next);
                            }}
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: '0.72rem', padding: '2px 8px',
                              border: '1px solid var(--color-border)', borderRadius: 4,
                              width: 140, fontFamily: 'inherit', outline: 'none',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>TOTAL GERAL</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(totalGeral.apontamento, true)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(totalGeral.faturamento, true)}</td>
                <td style={{ textAlign: 'right', color: totalGeral.pendente > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {formatCurrency(totalGeral.pendente, true)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
