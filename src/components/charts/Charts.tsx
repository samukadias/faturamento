import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { formatCurrency } from '../../services/calculations';

const COLORS = {
  DRC: '#2563EB',
  DETRAN: '#D97706',
  'DIÁRIO OFICIAL': '#0D9488',
  FINANCEIRA: '#16A34A',
};

const PALETTE = ['#2563EB', '#D97706', '#0D9488', '#16A34A', '#0EA5E9', '#059669'];

// ============================
// CUSTOM TOOLTIP
// ============================
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-content">
      <div className="tooltip-label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{formatCurrency(entry.value, true)}</span>
        </div>
      ))}
    </div>
  );
}

// ============================
// FATURAMENTO POR ORIGEM (BAR)
// ============================
interface OrigemBarData {
  mesAno: string;
  DRC?: number;
  DETRAN?: number;
  'DIÁRIO OFICIAL'?: number;
  FINANCEIRA?: number;
}

interface OrigemBarChartProps {
  data: OrigemBarData[];
  type?: 'stacked' | 'grouped' | 'area';
}

export function OrigemBarChart({ data, type = 'stacked' }: OrigemBarChartProps) {
  const origens = ['DRC', 'DETRAN', 'DIÁRIO OFICIAL', 'FINANCEIRA'] as const;

  const renderGradients = () => (
    <defs>
      <linearGradient id="gradDRC" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
        <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.8} />
      </linearGradient>
      <linearGradient id="gradDETRAN" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
        <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
      </linearGradient>
      <linearGradient id="gradDiarioOficial" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0D9488" stopOpacity={1} />
        <stop offset="100%" stopColor="#115E59" stopOpacity={0.8} />
      </linearGradient>
      <linearGradient id="gradFINANCEIRA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
        <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
      </linearGradient>
    </defs>
  );

  const gradIds: Record<string, string> = {
    'DRC': 'gradDRC',
    'DETRAN': 'gradDETRAN',
    'DIÁRIO OFICIAL': 'gradDiarioOficial',
    'FINANCEIRA': 'gradFINANCEIRA'
  };

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          {renderGradients()}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="mesAno" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} />
          {origens.map(origem => (
            <Area
              key={origem}
              type="monotone"
              dataKey={origem}
              stackId="a"
              fill={`url(#${gradIds[origem]})`}
              stroke={COLORS[origem]}
              strokeWidth={2}
              fillOpacity={0.7}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        {renderGradients()}
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="mesAno" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} />
        {origens.map(origem => (
          <Bar
            key={origem}
            dataKey={origem}
            stackId={type === 'stacked' ? 'a' : undefined}
            fill={`url(#${gradIds[origem]})`}
            radius={type === 'stacked' && origem === 'DRC' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================
// COMPOSIÇÃO (DONUT)
// ============================
interface DonutData {
  name: string;
  value: number;
}

interface ComposicaoDonutProps {
  data: DonutData[];
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function ComposicaoDonut({ data }: ComposicaoDonutProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="75%"
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((_entry, index) => (
            <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatCurrency(value, true), '']}
          contentStyle={{ fontSize: '0.78rem', borderRadius: 8, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '0.76rem', paddingTop: 8 }}
          formatter={(value, entry) => `${value}: ${formatCurrency((entry.payload as { value: number }).value, true)}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================
// LINHA DE EVOLUÇÃO
// ============================
interface EvolucaoData {
  mes: string;
  faturamento: number;
  apontamento: number;
}

interface EvolucaoLineProps {
  data: EvolucaoData[];
}

export function EvolucaoLineChart({ data }: EvolucaoLineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} />
        <Line type="monotone" dataKey="faturamento" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB' }} name="Faturamento" />
        <Line type="monotone" dataKey="apontamento" stroke="#D97706" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: '#D97706' }} name="Apontamento" />
      </LineChart>
    </ResponsiveContainer>
  );
}
