import type { NotaFiscal, NotaDebito, ApontamentoRecord, KPISummary, PivotRow, ComparativoApontFat, FiltrosGlobais } from '../types';

// ============================
// FILTROS
// ============================
export function filtrarNotas(notas: NotaFiscal[], filtros: FiltrosGlobais): NotaFiscal[] {
  return notas.filter(n => {
    if (filtros.statusNF !== 'TODOS' && n.statusNF !== filtros.statusNF) return false;
    if (filtros.origem !== 'TODOS' && n.origem !== filtros.origem) return false;
    if (filtros.cliente && !n.razaoSocial.toLowerCase().includes(filtros.cliente.toLowerCase())) return false;
    if (filtros.contrato && !n.numContrato.toLowerCase().includes(filtros.contrato.toLowerCase())) return false;
    return true;
  });
}

export function filtrarNotasPorMes(notas: NotaFiscal[], mesAno: string): NotaFiscal[] {
  return notas.filter(n => n.mesAno === mesAno);
}

// ============================
// KPIs
// ============================

export function calcularKPIs(
  notas: NotaFiscal[],
  notasDebito: NotaDebito[],
  apontamento: ApontamentoRecord[],
  mesAtual: string,
  mesReferencia?: string // mês base configurado (ex: "4/2026"). Se não informado, usa mesAtual
): KPISummary {
  const isTodos = mesAtual === 'TODOS';
  const parseMAno = (s: string) => {
    if (s === 'TODOS') return { mes: 0, ano: 0 };
    const [m, a] = s.split('/');
    return { mes: parseInt(m), ano: parseInt(a) };
  };
  const { mes: mesRef, ano: anoRef } = parseMAno(mesAtual);

  const isAtual = (n: NotaFiscal) => {
    if (isTodos) return true;
    const { mes, ano } = parseMAno(n.mesAno || '0/0');
    return mes === mesRef && ano === anoRef;
  };

  const isRetroativo = (n: NotaFiscal) => {
    if (isTodos) return false;
    const { mes, ano } = parseMAno(n.mesAno || '0/0');
    return ano < anoRef || (ano === anoRef && mes < mesRef);
  };

  const abertas = notas.filter(n => n.statusNF === 'ABERTA');
  const drcAbertas = abertas.filter(n => n.origem === 'DRC');
  const doAbertas = abertas.filter(n => n.origem === 'DIÁRIO OFICIAL');
  const detranAbertas = abertas.filter(n => n.origem === 'DETRAN');
  const finAbertas = abertas.filter(n => n.origem === 'FINANCEIRA');

  const ndAbertas = notasDebito.filter(n => n.status === 'ABERTA');

  const sum = (arr: NotaFiscal[], fn: (n: NotaFiscal) => boolean = () => true) =>
    arr.filter(fn).reduce((s, n) => s + n.valorNotaFiscal, 0);

  const drcAtual = sum(drcAbertas, isAtual);
  const drcRetro = sum(drcAbertas, isRetroativo);
  const doAtual = sum(doAbertas, isAtual);
  const doRetro = sum(doAbertas, isRetroativo);
  const detranAtual = sum(detranAbertas, isAtual);
  const detranRetro = sum(detranAbertas, isRetroativo);
  const finAtual = sum(finAbertas, isAtual);
  const finRetro = sum(finAbertas, isRetroativo);

  const totalND = ndAbertas.reduce((s, n) => s + n.valor, 0);
  // Subtrai valores DO para evitar dupla contagem (DO está embutido dentro do DRC na base)
  const totalNF = abertas.reduce((s, n) => s + n.valorNotaFiscal, 0) - doAtual - doRetro;

  const apontamentoTotal = apontamento
    .filter(r => isTodos || (r.mes === mesRef && r.ano === anoRef))
    .reduce((s, r) => s + r.valorTotal, 0);

  // Para apontamentoDRC: usa mesReferencia se fornecido, senão usa mesRef
  const [mesBaseNum, anoBaseNum] = mesReferencia
    ? mesReferencia.split('/').map(Number)
    : [mesRef, anoRef];

  const apontamentoDRC = apontamento
    .filter(r => (isTodos || (r.mes === mesBaseNum && r.ano === anoBaseNum)) && r.sigla !== 'DETRAN')
    .reduce((s, r) => s + r.valorTotal, 0);

  // faturamentoDRC = DRC (sem o DO) + DO separado
  const faturamentoDRC = drcAtual - doAtual + drcRetro - doRetro + doAtual + doRetro;
  // simplificado: drcAtual + drcRetro (o DO já está incluído no total do DRC na base, mas o do card é apenas DRC puro)
  // Na verdade: total DRC + DO puro, sem contar 2x
  const percExecucao = apontamentoDRC > 0 ? ((drcAtual - doAtual) / apontamentoDRC) * 100 : 0;

  return {
    resumoFaturamentoTotal: totalNF + totalND,
    drcAtual: drcAtual - doAtual, // DRC puro, sem DO
    drcRetroativo: drcRetro - doRetro, // DRC retro puro
    diarioOficialAtual: doAtual,
    detranAtual,
    detranRetroativo: detranRetro,
    financeiraAtual: finAtual,
    financeiraRetroativo: finRetro,
    faturamentoDRC: drcAtual + drcRetro, // DRC total inclui DO na base, mostrar total DRC
    apontamentoDRC,
    percExecucao,
    apontamentoTotal,
    faturamentoTotal: totalNF + totalND,
  };
}


// ============================
// PIVOT TABLE
// ============================
export function gerarPivotGeral(notas: NotaFiscal[], statusFiltro: string = 'ABERTA'): PivotRow[] {
  const filtradas = notas.filter(n => statusFiltro === 'TODOS' || n.statusNF === statusFiltro);
  const origens = ['DRC', 'DETRAN', 'DIÁRIO OFICIAL', 'FINANCEIRA'];
  const mesesSet = new Set<string>();
  filtradas.forEach(n => { if (n.mesAno) mesesSet.add(n.mesAno); });
  const meses = Array.from(mesesSet).sort((a, b) => {
    const [ma, aa] = a.split('/').map(Number);
    const [mb, ab] = b.split('/').map(Number);
    return aa !== ab ? aa - ab : ma - mb;
  });

  return origens.map(origem => {
    const row: PivotRow = { origem, total: 0 };
    const notasOrigem = filtradas.filter(n => n.origem === origem);
    meses.forEach(m => {
      const val = notasOrigem.filter(n => n.mesAno === m).reduce((s, n) => s + n.valorNotaFiscal, 0);
      row[m] = val;
      row.total += val;
    });
    return row;
  });
}

// ============================
// COMPARATIVO APONTAMENTO vs FATURAMENTO
// ============================
export function gerarComparativo(
  notas: NotaFiscal[],
  apontamento: ApontamentoRecord[],
  mesAno: string
): ComparativoApontFat[] {
  const isTodos = mesAno === 'TODOS';
  const [mesStr, anoStr] = isTodos ? ['0', '0'] : mesAno.split('/');
  const mes = parseInt(mesStr);
  const ano = parseInt(anoStr);

  // Agrupa apontamento por cliente + contrato
  const apMap = new Map<string, { cliente: string; sigla: string; valor: number }>();
  apontamento
    .filter(r => isTodos || (r.mes === mes && r.ano === ano))
    .forEach(r => {
      const key = `${r.cliente}||${r.pdContrato}`;
      const existing = apMap.get(key);
      if (existing) existing.valor += r.valorTotal;
      else apMap.set(key, { cliente: r.cliente, sigla: r.sigla, valor: r.valorTotal });
    });

  // Agrupa faturamento por cliente + contrato
  const fatMap = new Map<string, number>();
  notas
    .filter(n => (isTodos || n.mesAno === mesAno) && n.statusNF === 'ABERTA')
    .forEach(n => {
      const key = `${n.razaoSocial}||${n.numContrato}`;
      fatMap.set(key, (fatMap.get(key) || 0) + n.valorNotaFiscal);
    });

  const result: ComparativoApontFat[] = [];
  apMap.forEach(({ cliente, sigla, valor }, key) => {
    const [, contrato] = key.split('||');
    const faturamento = fatMap.get(key) || 0;
    result.push({
      sigla,
      cliente,
      pdContrato: contrato,
      apontamento: valor,
      faturamento,
      pendente: valor - faturamento,
    });
  });

  return result.sort((a, b) => b.pendente - a.pendente);
}

// ============================
// FORMATADORES
// ============================
export function formatCurrency(value: number, short = false): string {
  if (short && Math.abs(value) >= 1e6) {
    return `R$ ${(value / 1e6).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getMesesDisponiveis(notas: NotaFiscal[]): string[] {
  const mesesSet = new Set<string>();
  notas.forEach(n => { if (n.mesAno) mesesSet.add(n.mesAno); });
  return Array.from(mesesSet).sort((a, b) => {
    const [ma, aa] = a.split('/').map(Number);
    const [mb, ab] = b.split('/').map(Number);
    return aa !== ab ? aa - ab : ma - mb;
  });
}
