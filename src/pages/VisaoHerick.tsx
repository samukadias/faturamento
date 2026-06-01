import { useState, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { formatCurrency, formatPercent } from '../services/calculations';
import { Sparkles, Eye, TrendingUp, DollarSign, Clock, CheckCircle, Layers, ShieldAlert } from 'lucide-react';

export default function VisaoHerick() {
  const { notas, notasDebito, apontamento } = useDataStore();
  const [visaoFaturamento, setVisaoFaturamento] = useState<'BRUTO' | 'REALIZADO'>('BRUTO');

  // ============================================================
  // LÓGICA 1: RESUMO DETALHADO DA ABA "FATURAMENTO GERAL"
  // ============================================================
  const resumoFaturamentoGeral = useMemo(() => {
    // Filtrar notas abertas
    const nfsAbertas = notas.filter(n => n.statusNF === 'ABERTA');
    const ndsAbertas = notasDebito.filter(n => n.status === 'ABERTA');

    // Categorizar por período (Abril/2026 e Maio/2026 são pertinentes)
    const isPertinenteNF = (n: typeof notas[0]) => n.mesAno === '4/2026' || n.mesAno === '5/2026';
    const isPertinenteND = (nd: typeof notasDebito[0]) => {
      const ref = nd.mesReferencia || '';
      return ref.includes('2026-04') || ref.includes('2026-05') || ref.includes('4/2026') || ref.includes('5/2026');
    };

    // 1. Faturamento Pertinente (Abr/26 + Mai/26)
    const nfPertinenteVal = nfsAbertas.filter(isPertinenteNF).reduce((s, n) => s + n.valorNotaFiscal, 0);
    const ndPertinenteVal = ndsAbertas.filter(isPertinenteND).reduce((s, n) => s + n.valor, 0);
    const faturamentoPertinente = nfPertinenteVal + ndPertinenteVal;

    // 2. Faturamento Retroativo Antigo (Todos os demais meses faturados, exceto Abr/26 + Mai/26)
    const nfRetroativaVal = nfsAbertas.filter(n => !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
    const ndRetroativaVal = ndsAbertas.filter(nd => !isPertinenteND(nd)).reduce((s, nd) => s + nd.valor, 0);
    const faturamentoRetroativo = nfRetroativaVal + ndRetroativaVal;

    // 3. Faturamento Bruto Consolidado (Tudo)
    const faturamentoTotalBruto = faturamentoPertinente + faturamentoRetroativo;

    // 4. Taxa de Execução DRC (Faturamento DRC Abr/Mai vs Apontamento DRC Abr)
    // Apontado DRC de Abril/2026 (mes=4, ano=2026 e não DETRAN)
    const apontadoDRC = apontamento
      .filter(a => a.mes === 4 && a.ano === 2026 && a.sigla !== 'DETRAN')
      .reduce((s, a) => s + a.valorTotal, 0);

    // Faturado DRC Pertinente (Apenas DRC nas competências de Abr/Mai, excluindo DIÁRIO OFICIAL!)
    const faturadoDrcPertinente = nfsAbertas
      .filter(n => n.origem === 'DRC' && isPertinenteNF(n))
      .reduce((s, n) => s + n.valorNotaFiscal, 0);

    const taxaExecucaoDRC = apontadoDRC > 0 ? (faturadoDrcPertinente / apontadoDRC) * 100 : 0;

    return {
      faturamentoPertinente,
      nfPertinenteVal,
      ndPertinenteVal,
      faturamentoRetroativo,
      nfRetroativaVal,
      ndRetroativaVal,
      faturamentoTotalBruto,
      apontadoDRC,
      faturadoDrcPertinente,
      taxaExecucaoDRC
    };
  }, [notas, notasDebito, apontamento]);

  // ============================================================
  // LÓGICA DE DESMEMBRAMENTO DE VALORES PEDIDOS PELO USUÁRIO (LÍQUIDO VS BRUTO)
  // ============================================================
  const desmembramentoValores = useMemo(() => {
    const isPertinenteNF = (n: typeof notas[0]) => n.mesAno === '4/2026' || n.mesAno === '5/2026';
    const isPertinenteND = (nd: typeof notasDebito[0]) => {
      const ref = nd.mesReferencia || '';
      return ref.includes('2026-04') || ref.includes('2026-05') || ref.includes('4/2026') || ref.includes('5/2026');
    };

    const nfsAbertas = notas.filter(n => n.statusNF === 'ABERTA');
    const ndsAbertas = notasDebito.filter(n => n.status === 'ABERTA');

    // === CÁLCULO DE VALOR BRUTO (TODAS AS NOTAS - ABERTAS + CANCELADAS) ===
    // NFs (qualquer status, valorBruto) + NDs (abertas, valor)
    const nfBrutoTotal = notas.reduce((s, n) => s + n.valorBruto, 0);
    const ndBrutoTotal = ndsAbertas.reduce((s, n) => s + n.valor, 0);
    const totalBruto = nfBrutoTotal + ndBrutoTotal;

    // Faturamento DRC
    const drc_Bruto_Pert = notas.filter(n => n.origem === 'DRC' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const drc_Bruto_Retro = notas.filter(n => n.origem === 'DRC' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    // Faturamento DO (Diário Oficial)
    const do_Bruto_Pert = notas.filter(n => n.origem === 'DIÁRIO OFICIAL' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const do_Bruto_Retro = notas.filter(n => n.origem === 'DIÁRIO OFICIAL' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const detran_Bruto_Pert = notas.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const detran_Bruto_Retro = notas.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    const fin_Bruto_Pert = notas.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);
    const fin_Bruto_Retro = notas.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorBruto, 0);

    // === CÁLCULO DE VALOR NOTA FISCAL (NOTAS ABERTAS APENAS) ===
    // NFs (status ABERTA, valorNotaFiscal) + NDs (abertas, valor)
    const nfLiquidoTotal = nfsAbertas.reduce((s, n) => s + n.valorNotaFiscal, 0);
    const ndLiquidoTotal = ndsAbertas.reduce((s, n) => s + n.valor, 0);
    const totalLiquido = nfLiquidoTotal + ndLiquidoTotal;

    // Faturamento DRC
    const drc_Liquido_Pert = nfsAbertas.filter(n => n.origem === 'DRC' && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
    const drc_Liquido_Retro = nfsAbertas.filter(n => n.origem === 'DRC' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);

    // Faturamento DO (Diário Oficial)
    const do_Liquido_Pert = nfsAbertas.filter(n => n.origem === 'DIÁRIO OFICIAL' && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
    const do_Liquido_Retro = nfsAbertas.filter(n => n.origem === 'DIÁRIO OFICIAL' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);

    const detran_Liquido_Pert = nfsAbertas.filter(n => n.origem === 'DETRAN' && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
    const detran_Liquido_Retro = nfsAbertas.filter(n => n.origem === 'DETRAN' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);

    const fin_Liquido_Pert = nfsAbertas.filter(n => n.origem === 'FINANCEIRA' && isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);
    const fin_Liquido_Retro = nfsAbertas.filter(n => n.origem === 'FINANCEIRA' && !isPertinenteNF(n)).reduce((s, n) => s + n.valorNotaFiscal, 0);

    return {
      bruto: {
        total: totalBruto,
        drc_Pert: drc_Bruto_Pert,
        drc_Retro: drc_Bruto_Retro,
        do_Pert: do_Bruto_Pert,
        do_Retro: do_Bruto_Retro,
        detran_Pert: detran_Bruto_Pert,
        detran_Retro: detran_Bruto_Retro,
        fin_Pert: fin_Bruto_Pert,
        fin_Retro: fin_Bruto_Retro
      },
      liquido: {
        total: totalLiquido,
        drc_Pert: drc_Liquido_Pert,
        drc_Retro: drc_Liquido_Retro,
        do_Pert: do_Liquido_Pert,
        do_Retro: do_Liquido_Retro,
        detran_Pert: detran_Liquido_Pert,
        detran_Retro: detran_Liquido_Retro,
        fin_Pert: fin_Liquido_Pert,
        fin_Retro: fin_Liquido_Retro
      }
    };
  }, [notas, notasDebito]);

  const activeFaturamento = visaoFaturamento === 'BRUTO' ? desmembramentoValores.bruto : desmembramentoValores.liquido;

  // Taxa de execução dinâmica recalculada com base no DRC da visão ativa
  const taxaExecucaoDrcDinamica = resumoFaturamentoGeral.apontadoDRC > 0 
    ? (activeFaturamento.drc_Pert / resumoFaturamentoGeral.apontadoDRC) * 100 
    : 0;

  // ============================================================
  // LÓGICA 2: DRC - RESUMO FATURAMENTO (ABRIL/2026 - PIVOT CLIENTES)
  // ============================================================
  const resumoDrcFaturamento = useMemo(() => {
    // Clientes Prioritários/Foco DRC definidos nas regras do DE_PARA
    const siglasDRC = ['SGGD', 'SEDUC', 'SEFAZ', 'DIPOL', 'DER', 'SES', 'JUCESP', 'SAA', 'DEMAIS'];
    
    // Inicializar mapas
    const apMap = new Map<string, number>();
    const fatMap = new Map<string, number>();

    // Inicializar valores vazios para garantir que apareçam na ordem correta
    siglasDRC.forEach(sigla => {
      apMap.set(sigla, 0);
      fatMap.set(sigla, 0);
    });

    // 1. Agrupar apontamento de Abril/2026 (mes=4, ano=2026)
    apontamento
      .filter(a => a.mes === 4 && a.ano === 2026 && a.sigla !== 'DETRAN')
      .forEach(a => {
        const sigla = a.sigla || 'DEMAIS';
        const current = apMap.get(sigla) || 0;
        apMap.set(sigla, current + a.valorTotal);
      });

    // 2. Agrupar faturamento de Abril/2026 (mesAno = '4/2026', Origem = DRC)
    notas
      .filter(n => n.mesAno === '4/2026' && n.origem === 'DRC' && n.statusNF === 'ABERTA')
      .forEach(n => {
        const sigla = n.classificacao || 'DEMAIS';
        const current = fatMap.get(sigla) || 0;
        fatMap.set(sigla, current + n.valorNotaFiscal);
      });

    // 3. Montar a lista formatada
    let totalApontado = 0;
    let totalFaturado = 0;

    const data = siglasDRC.map(sigla => {
      const apontado = apMap.get(sigla) || 0;
      const faturado = fatMap.get(sigla) || 0;
      const pendente = apontado - faturado;
      const percFaturado = apontado > 0 ? (faturado / apontado) * 100 : 0;

      totalApontado += apontado;
      totalFaturado += faturado;

      return {
        sigla,
        apontado,
        faturado,
        pendente,
        percFaturado
      };
    });

    return {
      data,
      totalApontado,
      totalFaturado,
      totalPendente: totalApontado - totalFaturado,
      totalPerc: totalApontado > 0 ? (totalFaturado / totalApontado) * 100 : 0
    };
  }, [notas, apontamento]);

  return (
    <div className="animate-in">
      {/* Cabeçalho de Página */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">👁️ Visão do Herick</h1>
          <p className="page-subtitle">
            Análise aprofundada de Gerências e Consolidação de Faturamento Geral (Competência Abr/Mai)
          </p>
        </div>
      </div>

      {/* Banner de Rationale - Contexto de Análise do Herick */}
      <div className="executive-summary-banner" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%)', marginBottom: 24 }}>
        <div className="executive-summary-title">
          <Sparkles size={16} />
          <span>Diretriz de Faturamento (Coordenação Comercial)</span>
        </div>
        <div className="executive-summary-text">
          Esta página reflete com exclusividade as regras de visualização do Herick: foca no detalhamento e taxa de execução da gerência <strong>DRC + DO</strong>, separando os faturamentos emitidos entre os meses pertinentes de análise (Abril/Maio) e as competências retroativas. A taxa de execução compara o apontado de Abril com as receitas faturadas do mês subsequente (competência pertinente de Abr/Mai).
        </div>
      </div>

      {/* SEÇÃO DESMEMBRAMENTO DE VALORES PEDIDOS PELO USUÁRIO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Layers size={18} style={{ color: 'var(--color-primary-light)' }} />
          Desmembramento de Valores de Faturamento
        </h2>

        {/* Seletor de Visão (Bruto vs Realizado) */}
        <div className="tab-buttons-container" style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          <button 
            className={`btn btn-sm ${visaoFaturamento === 'BRUTO' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setVisaoFaturamento('BRUTO')}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            Visão Bruto
          </button>
          <button 
            className={`btn btn-sm ${visaoFaturamento === 'REALIZADO' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setVisaoFaturamento('REALIZADO')}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            Visão Realizado
          </button>
        </div>
      </div>

      {/* Grid de Valores Desmembrados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 20, marginBottom: 24 }}>
        {/* Card Grande: Faturamento Total */}
        <div className={`kpi-card ${visaoFaturamento === 'BRUTO' ? 'variant-primary' : 'variant-info'}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }} title={`Faturamento Total acumulado: R$ ${activeFaturamento.total.toLocaleString('pt-BR')}`}>
          <div>
            <div className="kpi-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Faturamento Total (Consolidado)</div>
            <div style={{ fontSize: '0.74rem', opacity: 0.8, marginTop: 4 }}>
              {visaoFaturamento === 'BRUTO' 
                ? 'NFs Bruto (Todas as notas) + NDs' 
                : 'NFs Líquido (Abertas apenas) + NDs'
              }
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div className="kpi-value" style={{ fontSize: '2.1rem', wordBreak: 'break-all' }}>
              {formatCurrency(activeFaturamento.total, false)}
            </div>
            <div className="kpi-sub" style={{ fontSize: '0.74rem', marginTop: 6 }}>
              Considera competência Abril + Maio e todos os retroativos
            </div>
          </div>
        </div>

        {/* 8 Sub-Cards Grid (4 colunas x 2 linhas) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* DRC Pertinente */}
          <div className="kpi-card variant-success" title={`Faturamento DRC: R$ ${activeFaturamento.drc_Pert.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>DRC (Abril + Maio 2026)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.drc_Pert, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Competências Pertinentes</div>
          </div>

          {/* DO Pertinente */}
          <div className="kpi-card variant-success" title={`Faturamento DO: R$ ${activeFaturamento.do_Pert.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>DO (Abril + Maio 2026)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.do_Pert, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Competências Pertinentes</div>
          </div>

          {/* DETRAN Pertinente */}
          <div className="kpi-card variant-success" title={`Faturamento DETRAN: R$ ${activeFaturamento.detran_Pert.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>DETRAN (Abril + Maio 2026)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.detran_Pert, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Competências Pertinentes</div>
          </div>

          {/* FINANCEIRA Pertinente */}
          <div className="kpi-card variant-success" title={`Faturamento Financeira: R$ ${activeFaturamento.fin_Pert.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>FINANCEIRA (Abril + Maio 2026)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.fin_Pert, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Competências Pertinentes</div>
          </div>

          {/* DRC Retroativas */}
          <div className="kpi-card variant-warning" title={`Faturamento DRC: R$ ${activeFaturamento.drc_Retro.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>DRC (Retroativas)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.drc_Retro, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Meses anteriores a Abril/2026</div>
          </div>

          {/* DO Retroativas */}
          <div className="kpi-card variant-warning" title={`Faturamento DO: R$ ${activeFaturamento.do_Retro.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>DO (Retroativas)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.do_Retro, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Meses anteriores a Abril/2026</div>
          </div>

          {/* DETRAN Retroativas */}
          <div className="kpi-card variant-warning" title={`Faturamento DETRAN: R$ ${activeFaturamento.detran_Retro.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>DETRAN (Retroativas)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.detran_Retro, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Meses anteriores a Abril/2026</div>
          </div>

          {/* FINANCEIRA Retroativas */}
          <div className="kpi-card variant-warning" title={`Faturamento Financeira: R$ ${activeFaturamento.fin_Retro.toLocaleString('pt-BR')}`}>
            <div className="kpi-label" style={{ fontSize: '0.76rem' }}>FINANCEIRA (Retroativas)</div>
            <div className="kpi-value" style={{ fontSize: '1.25rem', marginTop: 8 }}>{formatCurrency(activeFaturamento.fin_Retro, true)}</div>
            <div className="kpi-sub" style={{ fontSize: '0.7rem' }}>Meses anteriores a Abril/2026</div>
          </div>
        </div>
      </div>

      {/* Tabela de Comparação Side-by-Side (Bruto vs. Realizado) */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} style={{ color: 'var(--color-primary-light)' }} />
            Comparativo Executivo: Faturamento Bruto vs. Realizado Líquido
          </span>
          <span className="badge badge-neutral">Diferenças devido a Notas Canceladas</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Segmento / Gerência</th>
                <th>Competência / Período</th>
                <th style={{ textAlign: 'right' }}>Visão Bruto (Todas as NFs)</th>
                <th style={{ textAlign: 'right' }}>Visão Realizado (NFs Abertas)</th>
                <th style={{ textAlign: 'right' }}>Diferença (Notas Canceladas)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="bold">DRC</td>
                <td>Abril + Maio 2026 (Pertinentes)</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.drc_Pert)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.drc_Pert)}</td>
                <td className="currency danger" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.drc_Pert - desmembramentoValores.liquido.drc_Pert)}
                </td>
              </tr>
              <tr>
                <td className="bold">DRC</td>
                <td>Competências Retroativas</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.drc_Retro)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.drc_Retro)}</td>
                <td className="currency danger" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.drc_Retro - desmembramentoValores.liquido.drc_Retro)}
                </td>
              </tr>
              <tr>
                <td className="bold">DO (Diário Oficial)</td>
                <td>Abril + Maio 2026 (Pertinentes)</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.do_Pert)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.do_Pert)}</td>
                <td className="currency danger" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.do_Pert - desmembramentoValores.liquido.do_Pert)}
                </td>
              </tr>
              <tr>
                <td className="bold">DO (Diário Oficial)</td>
                <td>Competências Retroativas</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.do_Retro)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.do_Retro)}</td>
                <td className="currency danger" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.do_Retro - desmembramentoValores.liquido.do_Retro)}
                </td>
              </tr>
              <tr>
                <td className="bold">DETRAN</td>
                <td>Abril + Maio 2026 (Pertinentes)</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.detran_Pert)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.detran_Pert)}</td>
                <td className="currency danger" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.detran_Pert - desmembramentoValores.liquido.detran_Pert)}
                </td>
              </tr>
              <tr>
                <td className="bold">DETRAN</td>
                <td>Competências Retroativas</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.detran_Retro)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.detran_Retro)}</td>
                <td className="currency success" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.detran_Retro - desmembramentoValores.liquido.detran_Retro)}
                </td>
              </tr>
              <tr>
                <td className="bold">FINANCEIRA</td>
                <td>Abril + Maio 2026 (Pertinentes)</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.fin_Pert)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.fin_Pert)}</td>
                <td className="currency success" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.fin_Pert - desmembramentoValores.liquido.fin_Pert)}
                </td>
              </tr>
              <tr>
                <td className="bold">FINANCEIRA</td>
                <td>Competências Retroativas</td>
                <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.bruto.fin_Retro)}</td>
                <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(desmembramentoValores.liquido.fin_Retro)}</td>
                <td className="currency danger" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(desmembramentoValores.bruto.fin_Retro - desmembramentoValores.liquido.fin_Retro)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="bold" colSpan={2}>FATURAMENTO TOTAL CONSOLIDADO (NF + ND)</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(desmembramentoValores.bruto.total)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(desmembramentoValores.liquido.total)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>
                  {formatCurrency(desmembramentoValores.bruto.total - desmembramentoValores.liquido.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SEÇÃO 1: RESUMO DO "FATURAMENTO GERAL" DA PLANILHA */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <DollarSign size={18} style={{ color: 'var(--color-primary-light)' }} />
        Consolidação da Aba Faturamento Geral
      </h2>

      <div className="section-grid-3" style={{ marginBottom: 24 }}>
        {/* KPI 1: Faturamento Pertinente */}
        <div className="kpi-card variant-primary" title={`NFs: R$ ${resumoFaturamentoGeral.nfPertinenteVal.toLocaleString('pt-BR')} | NDs: R$ ${resumoFaturamentoGeral.ndPertinenteVal.toLocaleString('pt-BR')}`}>
          <div className="kpi-label">
            <span>Faturamento Pertinente (Abr/Mai)</span>
            <span className="kpi-icon-badge"><CheckCircle size={15} /></span>
          </div>
          <div>
            <div className="kpi-value">{formatCurrency(resumoFaturamentoGeral.faturamentoPertinente, true)}</div>
            <div className="kpi-sub">Faturamento com referência de serviços em Abril e Maio/2026</div>
          </div>
        </div>

        {/* KPI 2: Faturamento Retroativo */}
        <div className="kpi-card variant-warning" title={`NFs: R$ ${resumoFaturamentoGeral.nfRetroativaVal.toLocaleString('pt-BR')} | NDs: R$ ${resumoFaturamentoGeral.ndRetroativaVal.toLocaleString('pt-BR')}`}>
          <div className="kpi-label">
            <span>Faturamento Retroativo (Outros Meses)</span>
            <span className="kpi-icon-badge"><Clock size={15} /></span>
          </div>
          <div>
            <div className="kpi-value">{formatCurrency(resumoFaturamentoGeral.faturamentoRetroativo, true)}</div>
            <div className="kpi-sub">Faturamento de competências retroativas anteriores a Abril/2026</div>
          </div>
        </div>

        {/* KPI 3: Taxa de Execução DRC */}
        <div className="kpi-card variant-success" title={`Faturamento DRC Pertinente (sem DO): R$ ${activeFaturamento.drc_Pert.toLocaleString('pt-BR')} em relação ao Apontado DRC de Abril: R$ ${resumoFaturamentoGeral.apontadoDRC.toLocaleString('pt-BR')}`}>
          <div className="kpi-label">
            <span>Taxa de Execução DRC (Pertinente)</span>
            <span className="kpi-icon-badge"><TrendingUp size={15} /></span>
          </div>
          <div>
            <div className="kpi-value">{formatPercent(taxaExecucaoDrcDinamica)}</div>
            <div className="kpi-sub">DRC (sem DO) Abr/Mai vs Apontado DRC Abril</div>
          </div>
        </div>
      </div>

      {/* Widget de Detalhes do Faturamento */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <span className="card-title">📋 Demonstrativo Detalhado de Receitas (Aba Faturamento Geral)</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Grupo de Receitas</th>
                <th>Notas Fiscais (NFs)</th>
                <th>Notas de Débito (NDs)</th>
                <th style={{ textAlign: 'right' }}>Total Consolidado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="bold">Pertinentes de Análise (Competências Abril + Maio 2026)</td>
                <td className="currency">{formatCurrency(resumoFaturamentoGeral.nfPertinenteVal)}</td>
                <td className="currency">{formatCurrency(resumoFaturamentoGeral.ndPertinenteVal)}</td>
                <td className="currency bold success" style={{ textAlign: 'right' }}>
                  {formatCurrency(resumoFaturamentoGeral.faturamentoPertinente)}
                </td>
              </tr>
              <tr>
                <td className="bold">Competências Retroativas (Outros Períodos)</td>
                <td className="currency">{formatCurrency(resumoFaturamentoGeral.nfRetroativaVal)}</td>
                <td className="currency">{formatCurrency(resumoFaturamentoGeral.ndRetroativaVal)}</td>
                <td className="currency bold warning" style={{ textAlign: 'right' }}>
                  {formatCurrency(resumoFaturamentoGeral.faturamentoRetroativo)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Faturamento Bruto Consolidado (Total Aberto)</td>
                <td>{formatCurrency(resumoFaturamentoGeral.nfPertinenteVal + resumoFaturamentoGeral.nfRetroativaVal)}</td>
                <td>{formatCurrency(resumoFaturamentoGeral.ndPertinenteVal + resumoFaturamentoGeral.ndRetroativaVal)}</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(resumoFaturamentoGeral.faturamentoTotalBruto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SEÇÃO 2: DRC - RESUMO FATURAMENTO */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Eye size={18} style={{ color: 'var(--color-primary-light)' }} />
        Destaques Gerenciais (Aba DRC - Resumo Faturamento)
      </h2>

      <div className="card">
        <div className="card-header">
          <span className="card-title">📊 Visão por Cliente DRC — Apontamento vs. Faturamento (Competência Abril/2026)</span>
          <span className="badge badge-info">Filtro: Apenas Origem DRC</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sigla</th>
                <th style={{ textAlign: 'right' }}>Apontamento ABR/26</th>
                <th style={{ textAlign: 'right' }}>Faturamento ABR/26</th>
                <th style={{ textAlign: 'right' }}>Diferença (Pendente)</th>
                <th style={{ minWidth: 160 }}>% Faturada (Execução)</th>
              </tr>
            </thead>
            <tbody>
              {resumoDrcFaturamento.data.map(item => {
                const isPendente = item.pendente > 100;
                const percClass = item.percFaturado >= 90 ? 'success' : item.percFaturado >= 70 ? 'warning' : 'danger';

                return (
                  <tr key={item.sigla} style={{ background: isPendente ? '#FFF7ED' : undefined }}>
                    <td className="bold"><span className="badge badge-primary" style={{ minWidth: 80, justifyContent: 'center' }}>{item.sigla}</span></td>
                    <td className="currency" style={{ textAlign: 'right' }}>{formatCurrency(item.apontado)}</td>
                    <td className="currency success" style={{ textAlign: 'right' }}>{formatCurrency(item.faturado)}</td>
                    <td className={`currency ${item.pendente > 100 ? 'danger' : 'success'}`} style={{ textAlign: 'right' }}>
                      {formatCurrency(item.pendente)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar-wrap">
                          <div className={`progress-bar-fill ${percClass}`} style={{ width: `${Math.min(item.percFaturado, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, minWidth: 42, color: `var(--color-${percClass})` }}>
                          {formatPercent(item.percFaturado)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL GERAL DRC</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(resumoDrcFaturamento.totalApontado)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(resumoDrcFaturamento.totalFaturado)}</td>
                <td style={{ textAlign: 'right', color: resumoDrcFaturamento.totalPendente > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {formatCurrency(resumoDrcFaturamento.totalPendente)}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: resumoDrcFaturamento.totalPerc >= 90 ? 'var(--color-success)' : resumoDrcFaturamento.totalPerc >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {formatPercent(resumoDrcFaturamento.totalPerc)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
