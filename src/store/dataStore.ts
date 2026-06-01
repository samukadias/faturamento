import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotaFiscal, NotaDebito, ApontamentoRecord, DeParaRecord, HistoricoImportacao } from '../types';

interface DataState {
  notas: NotaFiscal[];
  notasDebito: NotaDebito[];
  apontamento: ApontamentoRecord[];
  dePara: DeParaRecord[];
  historico: HistoricoImportacao[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  setNotas: (notas: NotaFiscal[]) => void;
  setNotasDebito: (nd: NotaDebito[]) => void;
  setApontamento: (ap: ApontamentoRecord[]) => void;
  addHistorico: (h: HistoricoImportacao) => void;
}

const API_BASE = '/api';

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      notas: [],
      notasDebito: [],
      apontamento: [],
      dePara: [],
      historico: [],
      isLoaded: false,
      isLoading: false,
      error: null,

      fetchAll: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const [notasRes, ndRes, apRes, deParaRes, histRes] = await Promise.all([
            fetch(`${API_BASE}/notas?_limit=100000`),
            fetch(`${API_BASE}/notasDebito?_limit=100000`),
            fetch(`${API_BASE}/apontamento?_limit=100000`),
            fetch(`${API_BASE}/dePara?_limit=100000`),
            fetch(`${API_BASE}/historico?_limit=24`),
          ]);

          const [notas, notasDebito, apontamento, dePara, historico] = await Promise.all([
            notasRes.json(),
            ndRes.json(),
            apRes.json(),
            deParaRes.json(),
            histRes.json(),
          ]);

          set({ notas, notasDebito, apontamento, dePara, historico, isLoaded: true, isLoading: false });
        } catch (e) {
          set({ error: 'Erro ao carregar dados. Verifique se o servidor está rodando.', isLoading: false });
        }
      },

      setNotas: (notas) => set({ notas }),
      setNotasDebito: (notasDebito) => set({ notasDebito }),
      setApontamento: (apontamento) => set({ apontamento }),
      addHistorico: (h) => set((s) => ({ historico: [h, ...s.historico].slice(0, 24) })),
    }),
    {
      name: 'faturamento-data',
      partialize: (state) => ({ historico: state.historico }),
    }
  )
);
