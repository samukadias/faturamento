import { useFilterStore } from '../../store/filterStore';
import { useDataStore } from '../../store/dataStore';
import { getMesesDisponiveis } from '../../services/calculations';
import type { StatusNF, Origem } from '../../types';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

export default function FiltrosBar() {
  const { filtros, setMesAno, setStatusNF, setOrigem, setCliente, setContrato, resetFiltros } = useFilterStore();
  const { notas } = useDataStore();

  const meses = getMesesDisponiveis(notas);

  const formatMesAno = (mesAno: string) => {
    if (mesAno === 'TODOS') return 'Todos os Meses';
    const [m, a] = mesAno.split('/');
    const meses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(m)] || m}/${a}`;
  };

  return (
    <div className="filtros-bar animate-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', marginRight: 4 }}>
        <SlidersHorizontal size={16} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filtros</span>
      </div>

      <div className="filtro-group">
        <label className="filtro-label">Mês/Ano</label>
        <select
          id="filtro-mes-ano"
          className="filtro-select"
          value={filtros.mesAno}
          onChange={e => setMesAno(e.target.value)}
        >
          <option value="TODOS">Todos os Meses</option>
          {meses.map(m => (
            <option key={m} value={m}>{formatMesAno(m)}</option>
          ))}
          {meses.length === 0 && <option value="4/2026">Abr/2026</option>}
        </select>
      </div>

      <div className="filtro-group">
        <label className="filtro-label">Status NF</label>
        <select
          id="filtro-status"
          className="filtro-select"
          value={filtros.statusNF}
          onChange={e => setStatusNF(e.target.value as StatusNF | 'TODOS')}
        >
          <option value="TODOS">Todos</option>
          <option value="ABERTA">Aberta</option>
          <option value="PAGA">Paga</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <div className="filtro-group">
        <label className="filtro-label">Origem</label>
        <select
          id="filtro-origem"
          className="filtro-select"
          value={filtros.origem}
          onChange={e => setOrigem(e.target.value as Origem | 'TODOS')}
        >
          <option value="TODOS">Todas</option>
          <option value="DRC">DRC</option>
          <option value="DETRAN">DETRAN</option>
          <option value="DIÁRIO OFICIAL">Diário Oficial</option>
          <option value="FINANCEIRA">Financeira</option>
        </select>
      </div>

      <div className="filtro-group" style={{ minWidth: 180 }}>
        <label className="filtro-label">Cliente</label>
        <input
          id="filtro-cliente"
          type="text"
          className="filtro-input"
          placeholder="Buscar cliente..."
          value={filtros.cliente}
          onChange={e => setCliente(e.target.value)}
        />
      </div>

      <div className="filtro-group" style={{ minWidth: 140 }}>
        <label className="filtro-label">Contrato (PD)</label>
        <input
          id="filtro-contrato"
          type="text"
          className="filtro-input"
          placeholder="Ex: PD024155"
          value={filtros.contrato}
          onChange={e => setContrato(e.target.value)}
        />
      </div>

      <button
        className="btn btn-ghost btn-sm"
        onClick={resetFiltros}
        title="Limpar filtros"
        style={{ alignSelf: 'flex-end', marginBottom: 1 }}
      >
        <RotateCcw size={14} />
        Limpar
      </button>
    </div>
  );
}
