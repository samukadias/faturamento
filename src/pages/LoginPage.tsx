import { useAuthStore } from '../store/authStore';
import { useState } from 'react';
import { LogIn, BarChart3, Shield, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (!ok) setError('Email ou senha incorretos.');
  };

  return (
    <div className="login-page">
      {/* Left Info Panel */}
      <div className="login-side-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44, background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart3 size={22} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>PRODESP</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Gerência de Operações</div>
          </div>
        </div>

        <h1>Sistema de<br />Controle de<br />Faturamento</h1>
        <p>
          Plataforma integrada para gestão e acompanhamento do faturamento da Gerência de Operações.
          Consolide dados do ERP, acompanhe KPIs e identifique pendências em tempo real.
        </p>

        <div className="login-stats">
          <div className="login-stat-item">
            <h3>R$270M</h3>
            <p>Faturamento<br />Abril/2026</p>
          </div>
          <div className="login-stat-item">
            <h3>72%</h3>
            <p>Taxa de<br />Execução DRC</p>
          </div>
          <div className="login-stat-item">
            <h3>2.000+</h3>
            <p>Notas<br />Fiscais</p>
          </div>
        </div>

        <div style={{ marginTop: 48, display: 'flex', gap: 20 }}>
          {[
            { icon: <Shield size={16} />, text: 'Acesso por perfil' },
            { icon: <TrendingUp size={16} />, text: 'Histórico 12 meses' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Login Card */}
      <div className="login-card">
        <div className="login-card-logo">
          <div className="login-card-logo-icon">
            <BarChart3 size={18} />
          </div>
          GerOps · Faturamento
        </div>

        <h2>Bem-vindo de volta</h2>
        <p className="login-desc">Acesse com suas credenciais corporativas</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email corporativo</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="seu@prodesp.sp.gov.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="form-error">⚠ {error}</p>}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
          >
            {loading ? (
              <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-hint">
          <strong>Acesso de demonstração:</strong><br />
          Admin: <strong>admin@prodesp.sp.gov.br</strong> / <strong>admin123</strong><br />
          Visualizador: <strong>visualizador@prodesp.sp.gov.br</strong> / <strong>vis123</strong>
        </div>
      </div>
    </div>
  );
}
