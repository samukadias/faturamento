import { create } from 'zustand';
import type { FiltrosGlobais, StatusNF, Origem } from '../types';

interface FilterState {
  filtros: FiltrosGlobais;
  setMesAno: (mesAno: string) => void;
  setStatusNF: (status: StatusNF | 'TODOS') => void;
  setOrigem: (origem: Origem | 'TODOS') => void;
  setCliente: (cliente: string) => void;
  setContrato: (contrato: string) => void;
  resetFiltros: () => void;
}

const defaultFiltros: FiltrosGlobais = {
  mesAno: '4/2026',
  statusNF: 'ABERTA',
  origem: 'TODOS',
  cliente: '',
  contrato: '',
};

export const useFilterStore = create<FilterState>((set) => ({
  filtros: defaultFiltros,
  setMesAno: (mesAno) => set((s) => ({ filtros: { ...s.filtros, mesAno } })),
  setStatusNF: (statusNF) => set((s) => ({ filtros: { ...s.filtros, statusNF } })),
  setOrigem: (origem) => set((s) => ({ filtros: { ...s.filtros, origem } })),
  setCliente: (cliente) => set((s) => ({ filtros: { ...s.filtros, cliente } })),
  setContrato: (contrato) => set((s) => ({ filtros: { ...s.filtros, contrato } })),
  resetFiltros: () => set({ filtros: defaultFiltros }),
}));
