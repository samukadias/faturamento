import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Perfil } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Usuários padrão (serão sobrescritos pelo json-server em produção)
const DEFAULT_USERS: User[] = [
  { id: 1, email: 'admin@prodesp.sp.gov.br', password: 'admin123', nome: 'Administrador', perfil: 'ADMIN', ativo: true },
  { id: 2, email: 'visualizador@prodesp.sp.gov.br', password: 'vis123', nome: 'Visualizador', perfil: 'VISUALIZADOR', ativo: true },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string): Promise<boolean> => {
        try {
          // Tenta no backend usando endpoint de auth oficial
          const resp = await fetch(`/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (resp.ok) {
            const data = await resp.json();
            set({ user: data.user, token: data.token, isAuthenticated: true });
            return true;
          }
        } catch {
          // Fallback para usuários locais
          const found = DEFAULT_USERS.find(u => u.email === email && u.password === password && u.ativo);
          if (found) {
            const token = btoa(`${found.id}:${Date.now()}`);
            set({ user: found, token, isAuthenticated: true });
            return true;
          }
        }
        return false;
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'faturamento-auth' }
  )
);
