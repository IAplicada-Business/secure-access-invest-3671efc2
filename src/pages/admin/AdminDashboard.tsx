import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Eye,
  Link as LinkIcon,
  Clock,
  Plus,
  TrendingUp,
  Inbox,
  Users,
  ClipboardList,
  ArrowRight,
  Flame,
  KanbanSquare,
  Wallet,
  Sparkles,
} from 'lucide-react';
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
import { PageHeader } from '@/components/ui-system';

const CRM_STAGES: { id: string; label: string }[] = [
  { id: 'contato', label: 'Contato' },
  { id: 'agendar_reuniao', label: 'Reunião' },
  { id: 'envio_proposta', label: 'Proposta' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'fechamento', label: 'Fechamento' },
  { id: 'aguardando_pagamento', label: 'Pagamento' },
  { id: 'perdido', label: 'Perdido' },
];

interface DashboardStats {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  soldProperties: number;
  pendingReview: number;
  activeLinks: number;
  totalClients: number;
  pipelineOpen: number;
  monthRevenue: number;
  monthViews: number;
  recentViews: Array<{
    investor_name: string;
    property_title: string;
    time_spent_seconds: number;
    viewed_at: string;
  }>;
  unregisteredOwners: number;
  activeRegularizations: number;
  stagnantRegularizations: number;
  topProperties: Array<{
    property_id: string;
    title: string;
    cover_image: string | null;
    views: number;
    time_spent: number;
    status: string;
  }>;
  viewsByDay: Array<{ day: string; label: string; views: number }>;
  pipeline: Array<{ id: string; label: string; count: number }>;
  hotLeads: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins}min ${secs}s` : `${mins}min`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<'7' | '30'>('30');

  useEffect(() => {
    async function loadStats() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { data: properties },
        { count: activeLinks },
        { data: clients },
        { data: views },
        { data: allViews },
        { data: submissions },
        { data: regProcs },
        { data: revenues },
        { count: hotLeads },
      ] = await Promise.all([
        supabase.from('properties').select('id, status, title, cover_image'),
        supabase.from('access_links').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('clients').select('id, crm_stage, status'),
        supabase
          .from('page_views')
          .select('time_spent_seconds, viewed_at, access_link_id, property_id')
          .order('viewed_at', { ascending: false })
          .limit(12),
        supabase
          .from('page_views')
          .select('property_id, time_spent_seconds, viewed_at')
          .gte('viewed_at', thirtyDaysAgo),
        supabase.from('property_submissions').select('owner_name, property_id'),
        supabase
          .from('regularization_processes')
          .select('id, status, created_at')
          .not('status', 'in', '("concluida","arquivada")'),
        supabase.from('revenues').select('amount, received_at').gte('received_at', monthStart),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'hot_lead')
          .eq('is_read', false),
      ]);

      const total = properties?.length || 0;
      const published = properties?.filter(p => p.status === 'published').length || 0;
      const draft = properties?.filter(p => p.status === 'draft').length || 0;
      const sold = properties?.filter(p => p.status === 'sold').length || 0;
      const pendingReview = properties?.filter(p => p.status === 'pending_review').length || 0;

      let recentViews: DashboardStats['recentViews'] = [];
      if (views && views.length > 0) {
        const linkIds = [...new Set(views.map(v => v.access_link_id).filter(Boolean))] as string[];
        const propertyIds = [...new Set(views.map(v => v.property_id).filter(Boolean))] as string[];
        const [{ data: links }, { data: propertiesData }] = await Promise.all([
          linkIds.length
            ? supabase.from('access_links').select('id, investor_name').in('id', linkIds)
            : Promise.resolve({ data: [] as { id: string; investor_name: string }[] }),
          propertyIds.length
            ? supabase.from('properties').select('id, title').in('id', propertyIds)
            : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        ]);
        const linksMap = new Map(links?.map(l => [l.id, l.investor_name]) || []);
        const propertiesMap = new Map(propertiesData?.map(p => [p.id, p.title]) || []);
        recentViews = views.map(v => ({
          investor_name: linksMap.get(v.access_link_id || '') || 'Desconhecido',
          property_title: propertiesMap.get(v.property_id || '') || 'Imóvel removido',
          time_spent_seconds: v.time_spent_seconds,
          viewed_at: v.viewed_at,
        }));
      }

      const aggMap = new Map<string, { views: number; time: number }>();
      allViews?.forEach(v => {
        if (!v.property_id) return;
        const cur = aggMap.get(v.property_id) || { views: 0, time: 0 };
        aggMap.set(v.property_id, {
          views: cur.views + 1,
          time: cur.time + (v.time_spent_seconds || 0),
        });
      });

      let topProperties: DashboardStats['topProperties'] = [];
      if (aggMap.size > 0) {
        const topIds = [...aggMap.entries()]
          .sort((a, b) => b[1].time - a[1].time)
          .slice(0, 4)
          .map(([id]) => id);
        const propMap = new Map((properties || []).map(p => [p.id, p]));
        topProperties = topIds.map(pid => {
          const p = propMap.get(pid);
          return {
            property_id: pid,
            title: p?.title || 'Imóvel removido',
            cover_image: p?.cover_image || null,
            views: aggMap.get(pid)!.views,
            time_spent: aggMap.get(pid)!.time,
            status: p?.status || 'draft',
          };
        });
      }

      let unregisteredCount = 0;
      if (submissions && submissions.length > 0) {
        const ownerNames = [...new Set(submissions.map(s => s.owner_name).filter(Boolean))] as string[];
        if (ownerNames.length > 0) {
          const { data: existingClients } = await supabase.from('clients').select('name');
          const clientNames = new Set((existingClients || []).map(c => c.name.toLowerCase()));
          unregisteredCount = ownerNames.filter(n => !clientNames.has(n.toLowerCase())).length;
        }
      }

      const activeReg = regProcs?.length || 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let stagnant = 0;
      if (regProcs && regProcs.length > 0) {
        const procIds = regProcs.map(r => r.id);
        const { data: regInteractions } = await supabase
          .from('regularization_interactions')
          .select('process_id, interaction_date')
          .in('process_id', procIds);
        const lastActivity = new Map<string, string>();
        regInteractions?.forEach(i => {
          const cur = lastActivity.get(i.process_id);
          if (!cur || i.interaction_date > cur) lastActivity.set(i.process_id, i.interaction_date);
        });
        stagnant = regProcs.filter(r => (lastActivity.get(r.id) ?? r.created_at) < sevenDaysAgo).length;
      }

      // Views por dia (últimos 30)
      const dayMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        dayMap.set(d.toISOString().slice(0, 10), 0);
      }
      allViews?.forEach(v => {
        const key = v.viewed_at?.slice(0, 10);
        if (key && dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
      });
      const viewsByDay = [...dayMap.entries()].map(([day, count]) => ({
        day,
        label: new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        views: count,
      }));

      const pipeline = CRM_STAGES.map(s => ({
        ...s,
        count: (clients || []).filter(c => (c.crm_stage || 'contato') === s.id).length,
      }));
      const pipelineOpen = pipeline
        .filter(s => s.id !== 'perdido' && s.id !== 'aguardando_pagamento')
        .reduce((acc, s) => acc + s.count, 0);

      const monthRevenue = (revenues || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
      const monthViews = allViews?.length || 0;

      setStats({
        totalProperties: total,
        publishedProperties: published,
        draftProperties: draft,
        soldProperties: sold,
        pendingReview: pendingReview,
        activeLinks: activeLinks || 0,
        totalClients: clients?.length || 0,
        pipelineOpen,
        monthRevenue,
        monthViews,
        recentViews,
        unregisteredOwners: unregisteredCount,
        activeRegularizations: activeReg,
        stagnantRegularizations: stagnant,
        topProperties,
        viewsByDay,
        pipeline,
        hotLeads: hotLeads || 0,
      });
      setLoading(false);
    }

    loadStats();
  }, []);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return chartRange === '7' ? stats.viewsByDay.slice(-7) : stats.viewsByDay;
  }, [stats, chartRange]);

  const maxPipeline = Math.max(1, ...(stats?.pipeline.map(p => p.count) || [1]));

  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-64 rounded bg-cream-200" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="h-56 rounded-ds-xl bg-cream-100 lg:col-span-5" />
          <div className="h-56 rounded-ds-xl bg-cream-100 lg:col-span-3" />
          <div className="h-56 rounded-ds-xl bg-cream-100 lg:col-span-4" />
        </div>
        <div className="h-72 rounded-ds-xl bg-cream-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader
        title={`${greeting()}`}
        subtitle="Visão geral do portfólio, funil e engajamento dos investidores."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/crm"><KanbanSquare className="mr-2 h-4 w-4" /> Abrir CRM</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/imoveis/novo"><Plus className="mr-2 h-4 w-4" /> Novo imóvel</Link>
            </Button>
          </div>
        }
      />

      {/* Linha superior — hero + pipeline + alerts */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Hero holding */}
        <div className="relative overflow-hidden rounded-ds-xl border border-cream-200 bg-gradient-to-br from-ink-900 via-ink-900 to-[#2a2418] p-6 text-white lg:col-span-5">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, hsl(40 45% 58% / 0.55), transparent 70%)' }}
          />
          <div className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div>
              <p className="text-sm text-white/60">Imóveis publicados</p>
              <p className="mt-1 font-ds-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {stats.publishedProperties}
              </p>
              <p className="mt-2 text-sm text-white/55">
                de {stats.totalProperties} no portfólio · {stats.soldProperties} vendido{stats.soldProperties === 1 ? '' : 's'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-ds-lg bg-white/8 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-white/50">Links ativos</p>
                <p className="mt-1 font-ds-mono text-xl font-semibold">{stats.activeLinks}</p>
              </div>
              <div className="rounded-ds-lg bg-white/8 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-white/50">Views (30d)</p>
                <p className="mt-1 font-ds-mono text-xl font-semibold">{stats.monthViews}</p>
              </div>
              <div className="rounded-ds-lg bg-white/8 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-white/50">Clientes</p>
                <p className="mt-1 font-ds-mono text-xl font-semibold">{stats.totalClients}</p>
              </div>
            </div>
            <Link
              to="/admin/relatorios"
              className="inline-flex items-center gap-2 self-start rounded-ds-pill bg-brand-gold px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-brand-goldSoft"
            >
              <Sparkles className="h-4 w-4" />
              Explorar engajamento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Funil CRM */}
        <div className="rounded-ds-xl border border-cream-200 bg-white p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-ds-display text-lg font-medium text-ink-900">Funil do CRM</h2>
              <p className="text-xs text-ink-300">{stats.pipelineOpen} leads em aberto</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-brand-goldDeep">
              <Link to="/admin/crm">Ver kanban <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="space-y-2.5">
            {stats.pipeline.filter(s => s.id !== 'perdido').map(stage => (
              <div key={stage.id} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-500">{stage.label}</span>
                  <span className="font-ds-mono text-ink-900">{stage.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-100">
                  <div
                    className="h-full rounded-full bg-brand-gold transition-all duration-[420ms]"
                    style={{ width: `${(stage.count / maxPipeline) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Receita + alertas */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-500">Receita do mês</p>
              <Wallet className="h-4 w-4 text-brand-gold" />
            </div>
            <p className="mt-2 font-ds-display text-3xl font-semibold text-ink-900">
              {formatCurrency(stats.monthRevenue)}
            </p>
            <Link to="/admin/financeiro" className="mt-3 inline-flex items-center text-xs text-brand-goldDeep hover:underline">
              Abrir financeiro <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-2 rounded-ds-xl border border-cream-200 bg-cream-50 p-4">
            {stats.pendingReview > 0 && (
              <Link to="/admin/submissoes" className="flex items-center gap-3 rounded-ds-lg bg-white px-3 py-2.5 transition hover:shadow-ds-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-ds-pill bg-semantic-warning/15 text-semantic-warning">
                  <Inbox className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{stats.pendingReview} aguardando avaliação</p>
                  <p className="text-[11px] text-ink-300">Submissões de corretores</p>
                </div>
              </Link>
            )}
            {stats.hotLeads > 0 && (
              <Link to="/admin/relatorios" className="flex items-center gap-3 rounded-ds-lg bg-white px-3 py-2.5 transition hover:shadow-ds-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-ds-pill bg-semantic-danger/15 text-semantic-danger">
                  <Flame className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{stats.hotLeads} lead{stats.hotLeads === 1 ? '' : 's'} quente{stats.hotLeads === 1 ? '' : 's'}</p>
                  <p className="text-[11px] text-ink-300">Alto engajamento recente</p>
                </div>
              </Link>
            )}
            {stats.stagnantRegularizations > 0 && (
              <Link to="/admin/regularizacoes" className="flex items-center gap-3 rounded-ds-lg bg-white px-3 py-2.5 transition hover:shadow-ds-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-ds-pill bg-semantic-warning/15 text-semantic-warning">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{stats.stagnantRegularizations} regularização{stats.stagnantRegularizations === 1 ? '' : 'ões'} parada{stats.stagnantRegularizations === 1 ? '' : 's'}</p>
                  <p className="text-[11px] text-ink-300">Sem atualização há +7 dias</p>
                </div>
              </Link>
            )}
            {stats.unregisteredOwners > 0 && (
              <Link to="/admin/clientes" className="flex items-center gap-3 rounded-ds-lg bg-white px-3 py-2.5 transition hover:shadow-ds-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-brand-goldDeep">
                  <Users className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{stats.unregisteredOwners} proprietário{stats.unregisteredOwners === 1 ? '' : 's'} sem cadastro</p>
                  <p className="text-[11px] text-ink-300">Vindos de submissões</p>
                </div>
              </Link>
            )}
            {stats.pendingReview === 0 && stats.hotLeads === 0 && stats.stagnantRegularizations === 0 && stats.unregisteredOwners === 0 && (
              <div className="flex items-center gap-3 px-1 py-4 text-sm text-ink-300">
                <TrendingUp className="h-4 w-4 text-semantic-success" />
                Nada urgente no momento.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfólio destaque */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-ds-display text-lg font-medium text-ink-900">Imóveis em destaque</h2>
            <p className="text-xs text-ink-300">Maior engajamento nos últimos 30 dias</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/imoveis">Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        {stats.topProperties.length === 0 ? (
          <div className="rounded-ds-xl border border-dashed border-cream-200 bg-cream-50 px-6 py-10 text-center text-sm text-ink-300">
            Ainda sem visualizações suficientes para ranquear imóveis.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.topProperties.map((p, idx) => (
              <Link
                key={p.property_id}
                to={`/admin/imoveis/${p.property_id}`}
                className="group overflow-hidden rounded-ds-xl border border-cream-200 bg-white transition-shadow hover:shadow-ds-md"
              >
                <div className="relative aspect-[16/10] bg-cream-100">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-10 w-10 text-cream-300" />
                    </div>
                  )}
                  <Badge className="absolute left-3 top-3 bg-ink-900/80 text-white border-0 backdrop-blur-sm">
                    #{idx + 1}
                  </Badge>
                </div>
                <div className="space-y-2 p-4">
                  <p className="truncate font-ds-display text-[15px] font-medium text-ink-900 group-hover:text-brand-goldDeep">
                    {p.title}
                  </p>
                  <div className="flex items-center justify-between text-xs text-ink-300">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {p.views} acesso{p.views === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-brand-goldDeep">
                      <Clock className="h-3.5 w-3.5" /> {formatTime(p.time_spent)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Chart + activity */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-ds-xl border border-cream-200 bg-white p-5 lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-ds-display text-lg font-medium text-ink-900">Acessos ao catálogo</h2>
              <p className="text-xs text-ink-300">Evolução diária de page views</p>
            </div>
            <div className="flex rounded-ds-pill border border-cream-200 bg-cream-50 p-0.5">
              {(['7', '30'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className={cn(
                    'rounded-ds-pill px-3 py-1 text-xs font-medium transition',
                    chartRange === r ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {r}D
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A961" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A961" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D7" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8E8E8E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#8E8E8E', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E8E4D7',
                    boxShadow: '0 8px 24px -8px rgba(20,18,12,.12)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#1B1B1B', fontWeight: 600 }}
                  formatter={(value: number) => [`${value} acesso${value === 1 ? '' : 's'}`, 'Views']}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#C9A961"
                  strokeWidth={2.5}
                  fill="url(#viewsFill)"
                  activeDot={{ r: 5, fill: '#9C7C3E', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-ds-xl border border-cream-200 bg-white p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-ds-display text-lg font-medium text-ink-900">Atividade recente</h2>
            <Eye className="h-4 w-4 text-ink-300" />
          </div>
          {stats.recentViews.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-300">Nenhum acesso ainda.</p>
          ) : (
            <div className="space-y-1">
              {stats.recentViews.slice(0, 8).map((view, idx) => (
                <div
                  key={`${view.viewed_at}-${idx}`}
                  className="flex items-start gap-3 rounded-ds-lg px-2 py-2.5 transition hover:bg-cream-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-ds-pill bg-brand-goldSoft/35 text-[10px] font-semibold text-brand-goldDeep">
                    {(view.investor_name || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{view.investor_name}</p>
                    <p className="truncate text-xs text-ink-300">{view.property_title}</p>
                    <p className="mt-0.5 text-[10px] text-ink-300">{formatDate(view.viewed_at)}</p>
                  </div>
                  <span
                    className={cn(
                      'whitespace-nowrap text-[11px] font-ds-mono',
                      view.time_spent_seconds > 60 ? 'text-brand-goldDeep font-medium' : 'text-ink-300',
                    )}
                  >
                    {formatTime(view.time_spent_seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot de status */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Rascunhos', value: stats.draftProperties, icon: Building2, href: '/admin/imoveis' },
          { label: 'Regularizações ativas', value: stats.activeRegularizations, icon: ClipboardList, href: '/admin/regularizacoes' },
          { label: 'Links de investidor', value: stats.activeLinks, icon: LinkIcon, href: '/admin/links' },
          { label: 'Aguardando avaliação', value: stats.pendingReview, icon: Inbox, href: '/admin/submissoes', warn: stats.pendingReview > 0 },
        ].map(item => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              'flex items-center gap-4 rounded-ds-xl border bg-white p-4 transition hover:shadow-ds-md',
              item.warn ? 'border-semantic-warning/40 bg-semantic-warning/5' : 'border-cream-200',
            )}
          >
            <span className={cn(
              'flex h-11 w-11 items-center justify-center rounded-ds-lg',
              item.warn ? 'bg-semantic-warning/15 text-semantic-warning' : 'bg-cream-100 text-brand-goldDeep',
            )}>
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-ink-300">{item.label}</p>
              <p className="font-ds-mono text-2xl font-semibold text-ink-900">{item.value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
