import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Mês de referência base (ex: "4/2026" = Abril 2026)
  // O sistema entenderá esse mês + o próximo como "competências pertinentes"
  mesReferencia: string; // formato "M/YYYY"
  setMesReferencia: (mes: string) => void;
}

// Calcula o próximo mês no formato M/YYYY
export function proximoMes(mesAno: string): string {
  const [m, a] = mesAno.split('/').map(Number);
  if (!m || !a) return mesAno;
  if (m === 12) return `1/${a + 1}`;
  return `${m + 1}/${a}`;
}

// Retorna os dois meses pertinentes (base + próximo) em formato M/YYYY
export function mesesPertinentes(mesReferencia: string): [string, string] {
  return [mesReferencia, proximoMes(mesReferencia)];
}

// Retorna array de formatos para checar em strings de data (ex: "2026-04", "4/2026")
export function formatosPertinentes(mesReferencia: string): string[] {
  const meses = mesesPertinentes(mesReferencia);
  const formatos: string[] = [];
  for (const m of meses) {
    const [mes, ano] = m.split('/');
    formatos.push(`${m}`);                         // "4/2026"
    formatos.push(`${ano}-${mes.padStart(2, '0')}`); // "2026-04"
  }
  return formatos;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mesReferencia: '4/2026',
      setMesReferencia: (mes) => set({ mesReferencia: mes }),
    }),
    {
      name: 'faturamento-settings',
    }
  )
);
