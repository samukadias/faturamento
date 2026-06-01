import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import FaturamentoGeral from './pages/FaturamentoGeral';
import ApontamentoVsFaturado from './pages/ApontamentoVsFaturado';
import DetranPage from './pages/DetranPage';
import DrcResumoPage from './pages/DrcResumoPage';
import VisaoHerick from './pages/VisaoHerick';
import HistoricoPage from './pages/HistoricoPage';
import ImportacaoPage from './pages/ImportacaoPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

function AppRoutes() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout title="Faturamento" subtitle="Gerência de Operações · PRODESP" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<FaturamentoGeral />} />
          <Route path="/apontamento" element={<ApontamentoVsFaturado />} />
          <Route path="/detran" element={<DetranPage />} />
          <Route path="/drc" element={<DrcResumoPage />} />
          <Route path="/visao-herick" element={<VisaoHerick />} />
          <Route path="/historico" element={<HistoricoPage />} />

          {/* Admin only */}
          <Route element={<ProtectedRoute requiredPerfil="ADMIN" />}>
            <Route path="/importacao" element={<ImportacaoPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
