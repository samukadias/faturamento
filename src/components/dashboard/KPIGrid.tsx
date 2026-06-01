import { formatCurrency, formatPercent } from '../../services/calculations';
import type { KPISummary } from '../../types';
import {
  DollarSign, TrendingUp, TrendingDown, Target, Building2,
  FileText, Percent, BarChart2, AlertTriangle
} from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'primary';
  icon?: React.ReactNode;
  highlight?: 'success' | 'danger' | 'warning' | null;
  delay?: number;
}

function KPICard({ label, value, sub, variant = 'default', icon, highlight, delay = 0 }: KPICardProps) {
  return (
    <div
      className={`kpi-card variant-${variant} animate-in animate-in-delay-${Math.min(delay, 3)}`}
    >
      <div className="kpi-label">
        <span>{label}</span>
        {icon && <span className="kpi-icon-badge">{icon}</span>}
      </div>
      <div>
        <div className={`kpi-value${highlight ? ` highlight-${highlight}` : ''}`}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

interface KPIGridProps {
  kpis: KPISummary;
}

export default function KPIGrid({ kpis }: KPIGridProps) {
  const execPerc = kpis.percExecucao;
  const execVariant = execPerc >= 90 ? 'success' : execPerc >= 70 ? 'warning' : 'danger';
  const gap = kpis.apontamentoTotal - kpis.faturamentoTotal;

  return (
    <div className="kpi-grid">
      <KPICard
        label="Faturamento Total (NF + ND)"
        value={formatCurrency(kpis.resumoFaturamentoTotal, true)}
        sub="Notas fiscais + Notas de débito"
        variant="primary"
        icon={<DollarSign size={16} />}
        delay={1}
      />
      <KPICard
        label="DRC (atual)"
        value={formatCurrency(kpis.drcAtual, true)}
        sub="Contratos DRC do mês corrente"
        variant="info"
        icon={<FileText size={16} />}
        delay={1}
      />
      <KPICard
        label="DRC (retroativo)"
        value={formatCurrency(kpis.drcRetroativo, true)}
        sub="Faturamento DRC de meses anteriores"
        icon={<TrendingDown size={16} />}
        delay={2}
      />
      <KPICard
        label="Diário Oficial (atual)"
        value={formatCurrency(kpis.diarioOficialAtual, true)}
        sub="Publicações no mês"
        icon={<FileText size={16} />}
        delay={2}
      />
      <KPICard
        label="DETRAN (atual)"
        value={formatCurrency(kpis.detranAtual, true)}
        sub="Faturamento DETRAN do mês"
        variant="warning"
        icon={<Building2 size={16} />}
        delay={1}
      />
      <KPICard
        label="DETRAN (retroativo)"
        value={formatCurrency(kpis.detranRetroativo, true)}
        sub="DETRAN meses anteriores"
        icon={<TrendingDown size={16} />}
        delay={2}
      />
      <KPICard
        label="Financeira (atual)"
        value={formatCurrency(kpis.financeiraAtual, true)}
        sub="Receitas financeiras do mês"
        variant="success"
        icon={<TrendingUp size={16} />}
        delay={1}
      />
      <KPICard
        label="Financeira (retroativo)"
        value={formatCurrency(kpis.financeiraRetroativo, true)}
        sub="Financeira meses anteriores"
        icon={<TrendingDown size={16} />}
        delay={2}
      />
      <KPICard
        label="Faturamento DRC (DRC + DO)"
        value={formatCurrency(kpis.faturamentoDRC, true)}
        sub="DRC consolidado com Diário Oficial"
        variant="primary"
        icon={<BarChart2 size={16} />}
        delay={1}
      />
      <KPICard
        label="Apontamento DRC"
        value={formatCurrency(kpis.apontamentoDRC, true)}
        sub="Total previsto / apontado"
        icon={<Target size={16} />}
        delay={2}
      />
      <KPICard
        label="% Execução DRC"
        value={formatPercent(kpis.percExecucao)}
        sub={`DRC atual / Apontamento DRC`}
        variant={execVariant}
        icon={<Percent size={16} />}
        highlight={execVariant === 'success' ? 'success' : execVariant === 'danger' ? 'danger' : 'warning'}
        delay={1}
      />
      <KPICard
        label="Apontamento Total"
        value={formatCurrency(kpis.apontamentoTotal, true)}
        sub="Soma de todos os apontamentos"
        icon={<Target size={16} />}
        delay={2}
      />
      <KPICard
        label="Gap Faturamento"
        value={formatCurrency(gap, true)}
        sub="Apontamento - Faturamento"
        variant={gap > 0 ? 'danger' : 'success'}
        icon={<AlertTriangle size={16} />}
        highlight={gap > 0 ? 'danger' : 'success'}
        delay={3}
      />
    </div>
  );
}
