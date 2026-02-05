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
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  soldProperties: number;
  activeLinks: number;
  recentViews: Array<{
    investor_name: string;
    property_title: string;
    time_spent_seconds: number;
    viewed_at: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    publishedProperties: 0,
    draftProperties: 0,
    soldProperties: 0,
    activeLinks: 0,
    recentViews: [],
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

      setStats({
        totalProperties: total,
        publishedProperties: published,
        draftProperties: draft,
        soldProperties: sold,
        activeLinks: activeLinks || 0,
        recentViews,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Recent Views */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visualizações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentViews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma visualização registrada ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentViews.map((view, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    view.time_spent_seconds > 60 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted'
                  }`}
                >
                  <div>
                    <p className="font-medium">{view.investor_name}</p>
                    <p className="text-sm text-muted-foreground">{view.property_title}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium flex items-center gap-1 ${
                      view.time_spent_seconds > 60 ? 'text-primary' : ''
                    }`}>
                      <Clock className="h-3 w-3" />
                      {formatTime(view.time_spent_seconds)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(view.viewed_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
