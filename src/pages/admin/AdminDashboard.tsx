import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Eye,
  Link as LinkIcon,
  Clock,
  Plus,
  TrendingUp,
  TrendingDown,
  Inbox,
  Users,
  ClipboardList,
  ArrowRight,
  Flame,
  Wallet,
  AlertTriangle,
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

interface DashboardStats {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  soldProperties: number;
  pendingReview: number;
  activeLinks: number;
  totalClients: number;
  monthRevenue: number;
  monthExpenses: number;
  pendingCommissions: number;
  previousRevenue: number;
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
  }>;
  viewsByDay: Array<{ day: string; label: string; views: number }>;
  hotLeads: number;
  pipelineOpen: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}min`;
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
  const [chartRange, setChartRange] = useState<'7' | '30'>('7');

  useEffect(() => {
    async function loadStats() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
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
        { data: prevRevenues },
        { data: expenses },
        { data: pendComm },
        { count: hotLeads },
      ] = await Promise.all([
        supabase.from('properties').select('id, status, title, cover_image'),
        supabase.from('access_links').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('clients').select('id, crm_stage'),
        supabase
          .from('page_views')
          .select('time_spent_seconds, viewed_at, access_link_id, property_id')
          .order('viewed_at', { ascending: false })
          .limit(20),
        supabase
          .from('page_views')
          .select('property_id, time_spent_seconds, viewed_at')
          .gte('viewed_at', thirtyDaysAgo),
        supabase.from('property_submissions').select('owner_name'),
        supabase
          .from('regularization_processes')
          .select('id, status, created_at')
          .not('status', 'in', '("concluida","arquivada")'),
        supabase.from('revenues').select('amount').gte('received_at', monthStart).lte('received_at', monthEnd),
        supabase.from('revenues').select('amount').gte('received_at', prevStart).lte('received_at', prevEnd),
        supabase.from('expenses').select('amount').gte('expense_date', monthStart).lte('expense_date', monthEnd),
        supabase.from('commissions').select('amount').eq('status', 'pending'),
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
      if (views?.length) {
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

      // Investidores únicos (primeiro acesso mais recente)
      const uniqueInvestors: DashboardStats['recentViews'] = [];
      const seen = new Set<string>();
      for (const v of recentViews) {
        const key = v.investor_name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueInvestors.push(v);
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
          };
        });
      }

      let unregisteredCount = 0;
      if (submissions?.length) {
        const ownerNames = [...new Set(submissions.map(s => s.owner_name).filter(Boolean))] as string[];
        if (ownerNames.length) {
          const { data: existingClients } = await supabase.from('clients').select('name');
          const clientNames = new Set((existingClients || []).map(c => c.name.toLowerCase()));
          unregisteredCount = ownerNames.filter(n => !clientNames.has(n.toLowerCase())).length;
        }
      }

      const activeReg = regProcs?.length || 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let stagnant = 0;
      if (regProcs?.length) {
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

      const pipelineOpen = (clients || []).filter(c => {
        const s = c.crm_stage || 'contato';
        return s !== 'perdido';
      }).length;

      setStats({
        totalProperties: total,
        publishedProperties: published,
        draftProperties: draft,
        soldProperties: sold,
        pendingReview,
        activeLinks: activeLinks || 0,
        totalClients: clients?.length || 0,
        monthRevenue: (revenues || []).reduce((a, r) => a + Number(r.amount || 0), 0),
        monthExpenses: (expenses || []).reduce((a, r) => a + Number(r.amount || 0), 0),
        pendingCommissions: (pendComm || []).reduce((a, r) => a + Number(r.amount || 0), 0),
        previousRevenue: (prevRevenues || []).reduce((a, r) => a + Number(r.amount || 0), 0),
        monthViews: allViews?.length || 0,
        recentViews: uniqueInvestors,
        unregisteredOwners: unregisteredCount,
        activeRegularizations: activeReg,
        stagnantRegularizations: stagnant,
        topProperties,
        viewsByDay,
        hotLeads: hotLeads || 0,
        pipelineOpen,
      });
      setLoading(false);
    }

    loadStats();
  }, []);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return chartRange === '7' ? stats.viewsByDay.slice(-7) : stats.viewsByDay;
  }, [stats, chartRange]);

  const revenueDelta = useMemo(() => {
    if (!stats || !stats.previousRevenue) return null;
    return Math.round(((stats.monthRevenue - stats.previousRevenue) / stats.previousRevenue) * 100);
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-64 rounded bg-cream-200" />
        <div className="h-10 w-80 rounded bg-cream-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-ds-xl bg-cream-100" />)}
        </div>
        <div className="h-56 rounded-ds-xl bg-cream-100" />
      </div>
    );
  }

  const net = stats.monthRevenue - stats.monthExpenses;
  const pendencias = [
    stats.stagnantRegularizations > 0 && {
      href: '/admin/regularizacoes',
      icon: ClipboardList,
      title: `${stats.stagnantRegularizations} regularização${stats.stagnantRegularizations === 1 ? '' : 'ões'} parada${stats.stagnantRegularizations === 1 ? '' : 's'}`,
      body: 'Sem atualização há mais de 7 dias',
      tone: 'warn' as const,
    },
    stats.pendingReview > 0 && {
      href: '/admin/submissoes',
      icon: Inbox,
      title: `${stats.pendingReview} imóvel${stats.pendingReview === 1 ? '' : 'is'} aguardando avaliação`,
      body: 'Submissões de corretores',
      tone: 'warn' as const,
    },
    stats.hotLeads > 0 && {
      href: '/admin/relatorios',
      icon: Flame,
      title: `${stats.hotLeads} lead${stats.hotLeads === 1 ? '' : 's'} quente${stats.hotLeads === 1 ? '' : 's'}`,
      body: 'Alto engajamento recente',
      tone: 'danger' as const,
    },
    stats.unregisteredOwners > 0 && {
      href: '/admin/clientes',
      icon: Users,
      title: `${stats.unregisteredOwners} proprietário${stats.unregisteredOwners === 1 ? '' : 's'} sem cadastro`,
      body: 'Vindos de submissões',
      tone: 'neutral' as const,
    },
    stats.pendingCommissions > 0 && {
      href: '/admin/financeiro',
      icon: Wallet,
      title: `${formatCurrency(stats.pendingCommissions)} em comissões pendentes`,
      body: 'A pagar a parceiros',
      tone: 'neutral' as const,
    },
  ].filter(Boolean) as Array<{
    href: string;
    icon: typeof Inbox;
    title: string;
    body: string;
    tone: 'warn' | 'danger' | 'neutral';
  }>;

  return (
    <div className="space-y-6 font-ds-body">
      <Tabs defaultValue="estrategico" className="space-y-0">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
                {greeting()}
              </h1>
              <p className="text-sm text-ink-500">
                Visão estratégica do negócio — financeiro, pendências e engajamento.
              </p>
            </div>
            <Button asChild>
              <Link to="/admin/imoveis/novo"><Plus className="mr-2 h-4 w-4" /> Novo imóvel</Link>
            </Button>
          </div>
          <TabsList>
            <TabsTrigger value="estrategico">Estratégico</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="engajamento">Engajamento</TabsTrigger>
          </TabsList>
        </div>

        {/* ——— ESTRATÉGICO ——— */}
        <TabsContent value="estrategico" className="mt-0 space-y-6">
          {/* Financeiro */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">Receita do mês</p>
                <Wallet className="h-4 w-4 text-brand-gold" />
              </div>
              <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">
                {formatCurrency(stats.monthRevenue)}
              </p>
              {revenueDelta != null && (
                <p className={cn(
                  'mt-1 inline-flex items-center gap-0.5 text-xs font-medium',
                  revenueDelta >= 0 ? 'text-semantic-success' : 'text-semantic-danger',
                )}>
                  {revenueDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(revenueDelta)}% vs mês anterior
                </p>
              )}
            </div>
            <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">Despesas do mês</p>
                <TrendingDown className="h-4 w-4 text-ink-300" />
              </div>
              <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">
                {formatCurrency(stats.monthExpenses)}
              </p>
              <Link to="/admin/financeiro" className="mt-1 inline-block text-xs text-brand-goldDeep hover:underline">
                Ver financeiro →
              </Link>
            </div>
            <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">Lucro líquido</p>
                <TrendingUp className="h-4 w-4 text-brand-gold" />
              </div>
              <p className={cn(
                'mt-2 font-ds-mono text-2xl font-semibold',
                net >= 0 ? 'text-ink-900' : 'text-semantic-danger',
              )}>
                {formatCurrency(net)}
              </p>
              <p className="mt-1 text-xs text-ink-300">Receita − despesas</p>
            </div>
            <div className="rounded-ds-xl border border-cream-200 bg-gradient-to-br from-ink-900 to-[#2a2418] p-5 text-white">
              <p className="text-sm text-white/60">Portfólio publicado</p>
              <p className="mt-2 font-ds-display text-3xl font-semibold">{stats.publishedProperties}</p>
              <p className="mt-1 text-xs text-white/50">
                {stats.totalProperties} no total · {stats.soldProperties} vendido{stats.soldProperties === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Pendências estratégicas */}
          <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-ds-display text-lg font-medium text-ink-900">Pendências que pedem atenção</h2>
                <p className="text-xs text-ink-300">Regularizações, submissões e financeiro</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-semantic-warning" />
            </div>
            {pendencias.length === 0 ? (
              <p className="rounded-ds-lg bg-cream-50 px-4 py-6 text-center text-sm text-ink-300">
                Nada urgente no momento.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {pendencias.map(item => (
                  <Link
                    key={item.title}
                    to={item.href}
                    className="flex items-start gap-3 rounded-ds-lg border border-cream-200 px-3 py-3 transition hover:border-brand-gold/40 hover:bg-cream-50"
                  >
                    <span className={cn(
                      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-ds-pill',
                      item.tone === 'danger' && 'bg-semantic-danger/15 text-semantic-danger',
                      item.tone === 'warn' && 'bg-semantic-warning/15 text-semantic-warning',
                      item.tone === 'neutral' && 'bg-brand-goldSoft/35 text-brand-goldDeep',
                    )}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{item.title}</p>
                      <p className="text-xs text-ink-300">{item.body}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Snapshot útil do sistema (compacto, sem cards operacionais pesados) */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-ds-xl border border-cream-200 bg-cream-50 px-4 py-4">
              <p className="text-xs text-ink-300">Clientes / leads no CRM</p>
              <p className="mt-1 font-ds-mono text-xl font-semibold text-ink-900">{stats.totalClients}</p>
              <p className="text-xs text-ink-300">{stats.pipelineOpen} em etapas ativas</p>
            </div>
            <div className="rounded-ds-xl border border-cream-200 bg-cream-50 px-4 py-4">
              <p className="text-xs text-ink-300">Regularizações ativas</p>
              <p className="mt-1 font-ds-mono text-xl font-semibold text-ink-900">{stats.activeRegularizations}</p>
              <Link to="/admin/regularizacoes" className="text-xs text-brand-goldDeep hover:underline">Abrir módulo →</Link>
            </div>
            <div className="rounded-ds-xl border border-cream-200 bg-cream-50 px-4 py-4">
              <p className="text-xs text-ink-300">Acessos ao catálogo (30d)</p>
              <p className="mt-1 font-ds-mono text-xl font-semibold text-ink-900">{stats.monthViews}</p>
              <p className="text-xs text-ink-300">{stats.activeLinks} links ativos</p>
            </div>
          </div>

          {/* Investidores + imóveis — listas compactas lado a lado (sem vão lateral) */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-ds-xl border border-cream-200 bg-white">
              <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
                <div>
                  <h2 className="font-ds-display text-base font-medium text-ink-900">Investidores recentes</h2>
                  <p className="text-[11px] text-ink-300">Últimos a acessar o catálogo</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/admin/relatorios">Ver mais <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
              {stats.recentViews.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-300">Nenhum acesso recente.</p>
              ) : (
                <ul className="divide-y divide-cream-200">
                  {stats.recentViews.slice(0, 4).map((view, idx) => (
                    <li key={`${view.investor_name}-${idx}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-[10px] font-semibold text-brand-goldDeep">
                        {view.investor_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{view.investor_name}</p>
                        <p className="truncate text-[11px] text-ink-300">{view.property_title}</p>
                      </div>
                      <div className="flex-shrink-0 text-right text-[11px] text-ink-300">
                        <p>{formatDate(view.viewed_at)}</p>
                        <p className={cn(
                          'inline-flex items-center gap-1 font-ds-mono',
                          view.time_spent_seconds > 60 && 'text-brand-goldDeep',
                        )}>
                          <Clock className="h-3 w-3" />
                          {formatTime(view.time_spent_seconds)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-ds-xl border border-cream-200 bg-white">
              <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
                <div>
                  <h2 className="font-ds-display text-base font-medium text-ink-900">Imóveis em destaque</h2>
                  <p className="text-[11px] text-ink-300">Maior engajamento (30 dias)</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/admin/imoveis">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
              {stats.topProperties.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-300">Sem engajamento suficiente ainda.</p>
              ) : (
                <ul className="divide-y divide-cream-200">
                  {stats.topProperties.map((p, idx) => (
                    <li key={p.property_id}>
                      <Link
                        to={`/admin/imoveis/${p.property_id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-cream-50"
                      >
                        <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-ds-md bg-cream-100">
                          {p.cover_image ? (
                            <img src={p.cover_image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Building2 className="h-4 w-4 text-cream-300" />
                            </span>
                          )}
                          <span className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 text-[9px] font-medium text-white">
                            {idx + 1}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">{p.title}</p>
                          <p className="text-[11px] text-ink-300">
                            {p.views} acesso{p.views === 1 ? '' : 's'} · {formatTime(p.time_spent)}
                          </p>
                        </div>
                        <Eye className="h-3.5 w-3.5 flex-shrink-0 text-ink-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ——— OPERACIONAL ——— */}
        <TabsContent value="operacional" className="mt-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Rascunhos', value: stats.draftProperties, icon: Building2, href: '/admin/imoveis', warn: false },
              { label: 'Regularizações ativas', value: stats.activeRegularizations, icon: ClipboardList, href: '/admin/regularizacoes', warn: stats.stagnantRegularizations > 0 },
              { label: 'Links de investidor', value: stats.activeLinks, icon: LinkIcon, href: '/admin/links', warn: false },
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
              <h2 className="font-ds-display text-lg font-medium text-ink-900">Fila operacional</h2>
              <p className="mb-4 text-xs text-ink-300">Onde investir tempo hoje</p>
              <div className="space-y-2">
                <Link to="/admin/crm" className="flex items-center justify-between rounded-ds-lg border border-cream-200 px-3 py-3 text-sm hover:bg-cream-50">
                  <span>Leads no CRM</span>
                  <span className="font-ds-mono text-ink-900">{stats.pipelineOpen}</span>
                </Link>
                <Link to="/admin/regularizacoes" className="flex items-center justify-between rounded-ds-lg border border-cream-200 px-3 py-3 text-sm hover:bg-cream-50">
                  <span>Regularizações estagnadas</span>
                  <span className="font-ds-mono text-ink-900">{stats.stagnantRegularizations}</span>
                </Link>
                <Link to="/admin/clientes" className="flex items-center justify-between rounded-ds-lg border border-cream-200 px-3 py-3 text-sm hover:bg-cream-50">
                  <span>Proprietários sem cadastro</span>
                  <span className="font-ds-mono text-ink-900">{stats.unregisteredOwners}</span>
                </Link>
                <Link to="/admin/financeiro" className="flex items-center justify-between rounded-ds-lg border border-cream-200 px-3 py-3 text-sm hover:bg-cream-50">
                  <span>Comissões pendentes</span>
                  <span className="font-ds-mono text-ink-900">{formatCurrency(stats.pendingCommissions)}</span>
                </Link>
              </div>
            </div>

            <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
              <h2 className="font-ds-display text-lg font-medium text-ink-900">Atalhos</h2>
              <p className="mb-4 text-xs text-ink-300">Ir direto ao módulo</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { to: '/admin/crm', label: 'Abrir CRM' },
                  { to: '/admin/regularizacoes', label: 'Regularizações' },
                  { to: '/admin/submissoes', label: 'Submissões' },
                  { to: '/admin/links', label: 'Links de acesso' },
                  { to: '/admin/financeiro', label: 'Financeiro' },
                  { to: '/admin/relatorios', label: 'Relatórios' },
                ].map(a => (
                  <Button key={a.to} asChild variant="outline" className="justify-between">
                    <Link to={a.to}>{a.label} <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ——— ENGAJAMENTO ——— */}
        <TabsContent value="engajamento" className="mt-0 space-y-6">
          <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-ds-display text-lg font-medium text-ink-900">Acessos ao catálogo</h2>
                <p className="text-xs text-ink-300">Page views diários dos links de investidor</p>
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
            <div className="h-52 w-full sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsFillDash" x1="0" y1="0" x2="0" y2="1">
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
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value} acesso${value === 1 ? '' : 's'}`, 'Views']}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#C9A961"
                    strokeWidth={2.5}
                    fill="url(#viewsFillDash)"
                    activeDot={{ r: 4, fill: '#9C7C3E', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-ds-xl border border-cream-200 bg-white">
            <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
              <h2 className="font-ds-display text-base font-medium text-ink-900">Investidores recentes</h2>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/admin/relatorios">Ver mais <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            {stats.recentViews.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-300">Nenhum acesso ainda.</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {stats.recentViews.slice(0, 4).map((view, idx) => (
                  <li key={`eng-${view.investor_name}-${idx}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-[10px] font-semibold text-brand-goldDeep">
                      {view.investor_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{view.investor_name}</p>
                      <p className="truncate text-[11px] text-ink-300">{view.property_title}</p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-ink-300">
                      {formatDate(view.viewed_at)} · {formatTime(view.time_spent_seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
