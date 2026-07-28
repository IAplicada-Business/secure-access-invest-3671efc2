import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatCurrency';
import { TrendingDown, TrendingUp, Clock, ArrowRight, Wallet, Sparkles } from 'lucide-react';
import { PartnerAvatar } from '@/components/ui-system';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

interface MonthPoint {
  key: string;
  month: string;
  receitas: number;
  despesas: number;
  lucro: number;
}

interface RankItem {
  id: string;
  name: string;
  logo_path: string | null;
  value: number;
}

const RANGES = [
  { id: '3', label: '3M', months: 3 },
  { id: '6', label: '6M', months: 6 },
  { id: '12', label: '1A', months: 12 },
] as const;

export function FinanceOverview() {
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [currentExpenses, setCurrentExpenses] = useState(0);
  const [pendingCommissions, setPendingCommissions] = useState(0);
  const [previousRevenue, setPreviousRevenue] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthPoint[]>([]);
  const [serviceTypeData, setServiceTypeData] = useState<RankItem[]>([]);
  const [imobiliariaRanking, setImobiliariaRanking] = useState<RankItem[]>([]);
  const [includeCommissions, setIncludeCommissions] = useState(true);
  const [range, setRange] = useState<'3' | '6' | '12'>('6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);

    const [
      { data: curRev },
      { data: prevRev },
      { data: curExp },
      { data: pendComm },
      { data: allRevenues },
      { data: allExpenses },
      { data: revByService },
      { data: revByPartner },
      { data: allPartners },
    ] = await Promise.all([
      supabase.from('revenues').select('amount').gte('received_at', currentMonthStart).lte('received_at', currentMonthEnd),
      supabase.from('revenues').select('amount').gte('received_at', previousMonthStart).lte('received_at', previousMonthEnd),
      supabase.from('expenses').select('amount').gte('expense_date', currentMonthStart).lte('expense_date', currentMonthEnd),
      supabase.from('commissions').select('amount').eq('status', 'pending'),
      supabase.from('revenues').select('amount, received_at').gte('received_at', twelveMonthsAgo),
      supabase.from('expenses').select('amount, expense_date').gte('expense_date', twelveMonthsAgo),
      supabase.from('revenues').select('amount, service_type'),
      supabase.from('revenues').select('amount, partner_id').not('partner_id', 'is', null),
      supabase.from('partners').select('id, name, parent_partner_id, logo_path'),
    ]);

    setCurrentRevenue(curRev?.reduce((s, r) => s + Number(r.amount), 0) || 0);
    setPreviousRevenue(prevRev?.reduce((s, r) => s + Number(r.amount), 0) || 0);
    setCurrentExpenses(curExp?.reduce((s, r) => s + Number(r.amount), 0) || 0);
    setPendingCommissions(pendComm?.reduce((s, r) => s + Number(r.amount), 0) || 0);

    const months: MonthPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      const monthRevenues = allRevenues?.filter(r => r.received_at.startsWith(key)) || [];
      const monthExpenses = allExpenses?.filter(e => e.expense_date.startsWith(key)) || [];
      const receitas = monthRevenues.reduce((s, r) => s + Number(r.amount), 0);
      const despesas = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
      months.push({
        key,
        month: label.charAt(0).toUpperCase() + label.slice(1).replace('.', ''),
        receitas,
        despesas,
        lucro: receitas - despesas,
      });
    }
    setMonthlyData(months);

    const serviceLabels: Record<string, string> = {
      regularizacao: 'Regularização',
      venda_plataforma: 'Venda plataforma',
      consultoria: 'Consultoria',
      outro: 'Outro',
    };
    const svcTotals: Record<string, number> = {};
    revByService?.forEach(r => {
      const label = serviceLabels[r.service_type] || r.service_type;
      svcTotals[label] = (svcTotals[label] || 0) + Number(r.amount);
    });
    setServiceTypeData(
      Object.entries(svcTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    );

    if (revByPartner?.length) {
      const pMap = new Map((allPartners ?? []).map(p => [p.id, p]));
      const agg = new Map<string, RankItem>();
      revByPartner.forEach(r => {
        const p = r.partner_id ? pMap.get(r.partner_id) : null;
        if (!p) return;
        const parent = p.parent_partner_id ? pMap.get(p.parent_partner_id) : null;
        const rankingPartner = parent ?? p;
        const current = agg.get(rankingPartner.id) ?? {
          id: rankingPartner.id,
          name: rankingPartner.name,
          logo_path: rankingPartner.logo_path,
          value: 0,
        };
        current.value += Number(r.amount);
        agg.set(rankingPartner.id, current);
      });
      setImobiliariaRanking(
        [...agg.values()]
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
      );
    }

    setLoading(false);
  }

  const chartData = useMemo(() => {
    const months = RANGES.find(r => r.id === range)?.months ?? 6;
    return monthlyData.slice(-months);
  }, [monthlyData, range]);

  const rangeRevenue = useMemo(
    () => chartData.reduce((s, m) => s + m.receitas, 0),
    [chartData],
  );

  const revenueDelta = previousRevenue
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
    : null;

  const netProfit = currentRevenue - currentExpenses - (includeCommissions ? pendingCommissions : 0);
  const maxRanking = Math.max(1, ...imobiliariaRanking.map(r => r.value));
  const maxService = Math.max(1, ...serviceTypeData.map(r => r.value));

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="h-48 rounded-ds-xl bg-cream-100 lg:col-span-5" />
          <div className="h-48 rounded-ds-xl bg-cream-100 lg:col-span-3" />
          <div className="h-48 rounded-ds-xl bg-cream-100 lg:col-span-4" />
        </div>
        <div className="h-72 rounded-ds-xl bg-cream-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5 font-ds-body">
      {/* Top: hero + KPIs laterais (estilo anexo) */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-ds-xl border border-cream-200 bg-gradient-to-br from-ink-900 via-ink-900 to-[#2a2418] p-6 text-white lg:col-span-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, hsl(40 45% 58% / 0.5), transparent 70%)' }}
          />
          <div className="relative z-10 flex h-full flex-col justify-between gap-5">
            <div>
              <p className="text-sm text-white/55">Faturamento do mês</p>
              <p className="mt-1 font-ds-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {formatCurrency(currentRevenue)}
              </p>
              {revenueDelta != null && (
                <p className={cn(
                  'mt-2 inline-flex items-center gap-1 rounded-ds-pill px-2 py-0.5 text-xs font-medium',
                  revenueDelta >= 0 ? 'bg-semantic-success/20 text-green-200' : 'bg-semantic-danger/20 text-red-200',
                )}>
                  {revenueDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(revenueDelta)}% vs mês anterior
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-ds-lg bg-white/8 p-3">
                <p className="text-[11px] text-white/50">Despesas</p>
                <p className="mt-0.5 font-ds-mono text-lg font-semibold">{formatCurrency(currentExpenses)}</p>
              </div>
              <div className="rounded-ds-lg bg-white/8 p-3">
                <p className="text-[11px] text-white/50">Lucro líquido</p>
                <p className="mt-0.5 font-ds-mono text-lg font-semibold">{formatCurrency(netProfit)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIncludeCommissions(v => !v)}
              className="self-start text-[11px] text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
            >
              Lucro {includeCommissions ? 'descontando' : 'sem descontar'} comissões pendentes
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="flex-1 rounded-ds-xl border border-cream-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-500">Comissões a pagar</p>
              <Clock className="h-4 w-4 text-brand-gold" />
            </div>
            <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">
              {formatCurrency(pendingCommissions)}
            </p>
            <Link to="/admin/financeiro" className="mt-2 inline-flex items-center text-xs text-brand-goldDeep hover:underline">
              Ver comissões <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 rounded-ds-xl border border-cream-200 bg-cream-50 p-5">
            <p className="text-sm text-ink-500">Mês anterior</p>
            <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-700">
              {formatCurrency(previousRevenue)}
            </p>
            <p className="mt-1 text-xs text-ink-300">Faturamento de referência</p>
          </div>
        </div>

        <div className="rounded-ds-xl border border-cream-200 bg-white p-5 lg:col-span-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-ds-display text-base font-medium text-ink-900">Receita por origem</h3>
              <p className="text-[11px] text-ink-300">Tipo de serviço</p>
            </div>
            <Wallet className="h-4 w-4 text-brand-gold" />
          </div>
          {serviceTypeData.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-300">Sem receitas lançadas.</p>
          ) : (
            <div className="space-y-3">
              {serviceTypeData.slice(0, 4).map(item => (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate text-ink-700">{item.name}</span>
                    <span className="font-ds-mono text-ink-900">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream-100">
                    <div
                      className="h-full rounded-full bg-brand-gold"
                      style={{ width: `${(item.value / maxService) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance chart — full width, estilo Helios */}
      <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-ds-display text-lg font-medium text-ink-900">Performance financeira</h3>
            <p className="text-xs text-ink-300">
              Receitas, despesas e lucro · total do período {formatCurrency(rangeRevenue)}
            </p>
          </div>
          <div className="flex rounded-ds-pill border border-cream-200 bg-cream-50 p-0.5">
            {RANGES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={cn(
                  'rounded-ds-pill px-3 py-1 text-xs font-medium transition',
                  range === r.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-ink-500">
            <span className="h-2 w-2 rounded-full bg-brand-gold" /> Receitas
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-500">
            <span className="h-2 w-2 rounded-full bg-ink-700" /> Despesas
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-500">
            <span className="h-2 w-2 rounded-full bg-semantic-success" /> Lucro
          </span>
        </div>

        <div className="h-64 w-full sm:h-72">
          {chartData.every(m => m.receitas === 0 && m.despesas === 0) ? (
            <div className="flex h-full items-center justify-center text-sm text-ink-300">
              Sem movimentos neste período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A961" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A961" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lucroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5C8A4F" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#5C8A4F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D7" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#8E8E8E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8E8E8E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E8E4D7',
                    boxShadow: '0 8px 24px -8px rgba(20,18,12,.12)',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Lucro',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  stroke="#C9A961"
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                  activeDot={{ r: 5, fill: '#9C7C3E', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  stroke="#3D3D3D"
                  strokeWidth={2}
                  fill="transparent"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="lucro"
                  stroke="#5C8A4F"
                  strokeWidth={2}
                  fill="url(#lucroFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ranking imobiliárias compacto */}
      <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-ds-display text-base font-medium text-ink-900">Ranking de imobiliárias</h3>
            <p className="text-[11px] text-ink-300">Receita vinculada a parceiros</p>
          </div>
          <Sparkles className="h-4 w-4 text-brand-gold" />
        </div>
        {imobiliariaRanking.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-300">Sem receitas vinculadas a parceiros.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imobiliariaRanking.map((r, idx) => (
              <div key={r.id} className="rounded-ds-lg border border-cream-200 px-3 py-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <PartnerAvatar partner={r} size={32} />
                    <span className="truncate text-sm font-medium text-ink-900">
                      <span className="mr-1.5 font-ds-mono text-ink-300">#{idx + 1}</span>
                      {r.name}
                    </span>
                  </div>
                  <span className="flex-shrink-0 font-ds-mono text-xs text-ink-700">{formatCurrency(r.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.value / maxRanking) * 100}%`,
                      background: 'linear-gradient(90deg, #E1C68C, #C9A961)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
