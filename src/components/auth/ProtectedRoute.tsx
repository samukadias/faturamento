import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Perfil } from '../../types';

interface ProtectedRouteProps {
  requiredPerfil?: Perfil;
}

export default function ProtectedRoute({ requiredPerfil }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredPerfil && user?.perfil !== requiredPerfil) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-danger)' }}>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }
  return <Outlet />;
}
