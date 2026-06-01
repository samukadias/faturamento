import { Bell, RefreshCw } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { fetchAll, isLoading } = useDataStore();
  const { filtros } = useFilterStore();

  return (
    <header className="header">
      <div className="header-title">
        <div>{title}</div>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 8,
          padding: '5px 12px',
          fontSize: '0.76rem',
          color: '#1D4ED8',
          fontWeight: 600,
        }}>
          Ref.: {filtros.mesAno.replace('/', '/20').length > 6 ? filtros.mesAno : `${filtros.mesAno}`}
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchAll}
          disabled={isLoading}
          title="Atualizar dados"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
        </button>

        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--color-text-muted)', position: 'relative' }}
          title="Notificações"
        >
          <Bell size={15} />
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 7, height: 7, background: '#EF4444',
            borderRadius: '50%', border: '2px solid white',
          }} />
        </button>
      </div>
    </header>
  );
}
