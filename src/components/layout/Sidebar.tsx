import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Truck, FileText,
  Upload, History, LogOut, BarChart3, Building2, Eye
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Faturamento Geral', icon: <LayoutDashboard size={17} /> },
  { to: '/apontamento', label: 'Apont. vs Faturado', icon: <ArrowLeftRight size={17} /> },
  { to: '/detran', label: 'DETRAN', icon: <Truck size={17} /> },
  { to: '/drc', label: 'DRC Resumo', icon: <FileText size={17} /> },
  { to: '/visao-herick', label: 'Visão do Herick', icon: <Eye size={17} /> },
  { to: '/historico', label: 'Histórico', icon: <History size={17} /> },
  { to: '/importacao', label: 'Importar Dados', icon: <Upload size={17} />, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'U';

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || user?.perfil === 'ADMIN');

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BarChart3 size={16} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-title">Faturamento</div>
            <div className="sidebar-logo-subtitle">Gerência de Operações</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Menu Principal</div>
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-section-title" style={{ marginTop: 12 }}>Empresa</div>
        <div className="sidebar-item" style={{ cursor: 'default', opacity: 0.6 }}>
          <span className="icon"><Building2 size={17} /></span>
          PRODESP · SP
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.nome}
            </div>
            <div className="sidebar-user-role">
              {user?.perfil === 'ADMIN' ? '🔐 Admin' : '👁 Visualizador'}
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleLogout}
            title="Sair"
            style={{ padding: 6, color: 'rgba(255,255,255,0.5)', minWidth: 0 }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
