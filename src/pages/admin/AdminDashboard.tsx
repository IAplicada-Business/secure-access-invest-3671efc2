import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Property, AccessLink, PageView } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  FileText, 
  Eye, 
  Link as LinkIcon,
  Clock,
  Plus,
  TrendingUp,
  Inbox,
  Users,
  ClipboardList
} from 'lucide-react';

interface DashboardStats {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  soldProperties: number;
  pendingReview: number;
  activeLinks: number;
  recentViews: Array<{
    investor_name: string;
    property_title: string;
    time_spent_seconds: number;
    viewed_at: string;
  }>;
  unregisteredOwners: number;
  activeRegularizations: number;
  stagnantRegularizations: number;
  topProperties: Array<{ property_id: string; title: string; views: number; time_spent: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    publishedProperties: 0,
    draftProperties: 0,
    soldProperties: 0,
    pendingReview: 0,
    activeLinks: 0,
    recentViews: [],
    unregisteredOwners: 0,
    activeRegularizations: 0,
    stagnantRegularizations: 0,
    topProperties: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      // Get properties count by status
      const { data: properties } = await supabase
        .from('properties')
        .select('id, status');

      const total = properties?.length || 0;
      const published = properties?.filter(p => p.status === 'published').length || 0;
      const draft = properties?.filter(p => p.status === 'draft').length || 0;
      const sold = properties?.filter(p => p.status === 'sold').length || 0;
      const pendingReview = properties?.filter(p => p.status === 'pending_review').length || 0;

      // Get active links count
      const { count: activeLinks } = await supabase
        .from('access_links')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Get recent views with investor and property info
      const { data: views } = await supabase
        .from('page_views')
        .select(`
          time_spent_seconds,
          viewed_at,
          access_link_id,
          property_id
        `)
        .order('viewed_at', { ascending: false })
        .limit(10);

      // Get access links and properties for the views
      let recentViews: DashboardStats['recentViews'] = [];
      
      if (views && views.length > 0) {
        const linkIds = [...new Set(views.map(v => v.access_link_id).filter(Boolean))];
        const propertyIds = [...new Set(views.map(v => v.property_id).filter(Boolean))];

        const { data: links } = await supabase
          .from('access_links')
          .select('id, investor_name')
          .in('id', linkIds as string[]);

        const { data: propertiesData } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', propertyIds as string[]);

        const linksMap = new Map(links?.map(l => [l.id, l.investor_name]) || []);
        const propertiesMap = new Map(propertiesData?.map(p => [p.id, p.title]) || []);

        recentViews = views.map(v => ({
          investor_name: linksMap.get(v.access_link_id || '') || 'Desconhecido',
          property_title: propertiesMap.get(v.property_id || '') || 'Imóvel removido',
          time_spent_seconds: v.time_spent_seconds,
          viewed_at: v.viewed_at,
        }));
      }

      // Top properties by engagement (all page_views aggregated)
      const { data: allViews } = await supabase
        .from('page_views')
        .select('property_id, time_spent_seconds');
      const aggMap = new Map<string, { views: number; time: number }>();
      allViews?.forEach(v => {
        if (!v.property_id) return;
        const cur = aggMap.get(v.property_id) || { views: 0, time: 0 };
        aggMap.set(v.property_id, { views: cur.views + 1, time: cur.time + (v.time_spent_seconds || 0) });
      });
      let topProperties: DashboardStats['topProperties'] = [];
      if (aggMap.size > 0) {
        const topIds = [...aggMap.entries()].sort((a, b) => b[1].time - a[1].time).slice(0, 5).map(([id]) => id);
        const { data: topProps } = await supabase.from('properties').select('id, title').in('id', topIds);
        const titleMap = new Map(topProps?.map(p => [p.id, p.title]) || []);
        topProperties = topIds.map(pid => ({
          property_id: pid,
          title: titleMap.get(pid) || 'Imóvel removido',
          views: aggMap.get(pid)!.views,
          time_spent: aggMap.get(pid)!.time,
        }));
      }

      // Count unregistered owners from submissions
      const { data: submissions } = await supabase
        .from('property_submissions')
        .select('owner_name, property_id');
      
      let unregisteredCount = 0;
      if (submissions && submissions.length > 0) {
        const ownerNames = [...new Set(submissions.map(s => s.owner_name).filter(Boolean))] as string[];
        if (ownerNames.length > 0) {
          const { data: existingClients } = await supabase
            .from('clients')
            .select('name');
          const clientNames = new Set((existingClients || []).map(c => c.name.toLowerCase()));
          unregisteredCount = ownerNames.filter(n => !clientNames.has(n.toLowerCase())).length;
        }
      }
      // Regularizations
      const { data: regProcs } = await supabase
        .from('regularization_processes')
        .select('id, status, created_at')
        .not('status', 'in', '("concluida","arquivada")');
      const activeReg = regProcs?.length || 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      // Estagnado = sem atividade nos últimos 7 dias. Atividade = última interação
      // (MAX(interaction_date) em regularization_interactions); se não houver
      // nenhuma interação, usa created_at como referência.
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

      setStats({
        totalProperties: total,
        publishedProperties: published,
        draftProperties: draft,
        soldProperties: sold,
        pendingReview: pendingReview,
        activeLinks: activeLinks || 0,
        recentViews,
        unregisteredOwners: unregisteredCount,
        activeRegularizations: activeReg,
        stagnantRegularizations: stagnant,
        topProperties,
      });

      setLoading(false);
    }

    loadStats();
  }, []);

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link to="/admin/imoveis/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Imóvel
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Imóveis
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProperties}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Publicados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.publishedProperties}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rascunhos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.draftProperties}</div>
          </CardContent>
        </Card>

        <Card className={stats.pendingReview > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando Avaliação
            </CardTitle>
            <Inbox className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.pendingReview > 0 ? 'text-amber-600' : ''}`}>{stats.pendingReview}</div>
            {stats.pendingReview > 0 && (
              <Link to="/admin/submissoes" className="text-xs text-primary hover:underline mt-1 inline-block">
                Ver submissões →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Links Ativos
            </CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeLinks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Unregistered Owners Alert */}
      {stats.unregisteredOwners > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">{stats.unregisteredOwners} proprietário{stats.unregisteredOwners > 1 ? 's' : ''} sem cadastro</p>
                <p className="text-sm text-muted-foreground">Proprietários de submissões ainda não cadastrados como clientes</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/clientes">Cadastrar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Regularizations Card */}
      {stats.activeRegularizations > 0 && (
        <Card className={stats.stagnantRegularizations > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className={`h-5 w-5 ${stats.stagnantRegularizations > 0 ? 'text-amber-500' : 'text-primary'}`} />
              <div>
                <p className="font-medium">{stats.activeRegularizations} regularização{stats.activeRegularizations > 1 ? 'ões' : ''} ativa{stats.activeRegularizations > 1 ? 's' : ''}</p>
                {stats.stagnantRegularizations > 0 && (
                  <p className="text-sm text-amber-600">{stats.stagnantRegularizations} sem atualização há mais de 7 dias</p>
                )}
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/clientes">Ver Clientes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Engajamento: imóveis mais vistos + últimos acessos */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Imóveis mais visualizados (visual) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Imóveis mais visualizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProperties.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Sem visualizações registradas ainda.</p>
            ) : (() => {
              const maxTime = Math.max(1, ...stats.topProperties.map(p => p.time_spent));
              return (
                <div className="space-y-4">
                  {stats.topProperties.map((p) => (
                    <Link key={p.property_id} to={`/admin/imoveis/${p.property_id}`} className="block group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium truncate group-hover:text-primary transition-colors">{p.title}</span>
                        <span className="text-sm text-muted-foreground whitespace-nowrap ml-3">
                          {p.views} {p.views === 1 ? 'acesso' : 'acessos'} • {formatTime(p.time_spent)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(p.time_spent / maxTime) * 100}%`, background: 'linear-gradient(90deg, hsl(41,46%,68%), hsl(41,46%,52%))' }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Últimos acessos (compacto) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Últimos acessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentViews.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Nenhum acesso ainda.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentViews.slice(0, 6).map((view, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{view.investor_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{view.property_title}</p>
                    </div>
                    <span className={`flex items-center gap-1 whitespace-nowrap text-xs ${view.time_spent_seconds > 60 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" />{formatTime(view.time_spent_seconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
