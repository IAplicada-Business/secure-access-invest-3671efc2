import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, TrendingUp } from 'lucide-react';

interface ViewReport {
  investor_name: string;
  investor_id: string;
  property_title: string;
  property_id: string;
  time_spent_seconds: number;
  viewed_at: string;
}

export default function AdminReports() {
  const [views, setViews] = useState<ViewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInvestor, setSearchInvestor] = useState('');
  const [searchProperty, setSearchProperty] = useState('');

  useEffect(() => {
    loadViews();
  }, []);

  async function loadViews() {
    const { data: viewsData } = await supabase
      .from('page_views')
      .select('*')
      .order('time_spent_seconds', { ascending: false });

    if (!viewsData || viewsData.length === 0) {
      setLoading(false);
      return;
    }

    const linkIds = [...new Set(viewsData.map(v => v.access_link_id).filter(Boolean))];
    const propertyIds = [...new Set(viewsData.map(v => v.property_id).filter(Boolean))];

    const { data: links } = await supabase
      .from('access_links')
      .select('id, investor_name')
      .in('id', linkIds as string[]);

    const { data: properties } = await supabase
      .from('properties')
      .select('id, title')
      .in('id', propertyIds as string[]);

    const linksMap = new Map(links?.map(l => [l.id, l.investor_name]) || []);
    const propertiesMap = new Map(properties?.map(p => [p.id, p.title]) || []);

    const reports: ViewReport[] = viewsData.map(v => ({
      investor_name: linksMap.get(v.access_link_id || '') || 'Desconhecido',
      investor_id: v.access_link_id || '',
      property_title: propertiesMap.get(v.property_id || '') || 'Imóvel removido',
      property_id: v.property_id || '',
      time_spent_seconds: v.time_spent_seconds,
      viewed_at: v.viewed_at,
    }));

    setViews(reports);
    setLoading(false);
  }

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredViews = views.filter(v => 
    v.investor_name.toLowerCase().includes(searchInvestor.toLowerCase()) &&
    v.property_title.toLowerCase().includes(searchProperty.toLowerCase())
  );

  const highInterestCount = filteredViews.filter(v => v.time_spent_seconds > 60).length;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Relatório de Interesse</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Visualizações
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{views.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alto Interesse (+60s)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{highInterestCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investidores Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(views.map(v => v.investor_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar por investidor..."
            value={searchInvestor}
            onChange={(e) => setSearchInvestor(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar por imóvel..."
            value={searchProperty}
            onChange={(e) => setSearchProperty(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investidor</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredViews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma visualização encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredViews.map((view, idx) => (
                  <TableRow 
                    key={idx}
                    className={view.time_spent_seconds > 60 ? 'bg-primary/5' : ''}
                  >
                    <TableCell className="font-medium">{view.investor_name}</TableCell>
                    <TableCell className="text-muted-foreground">{view.property_title}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={view.time_spent_seconds > 60 ? 'default' : 'secondary'}
                        className={view.time_spent_seconds > 60 ? 'bg-primary' : ''}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {formatTime(view.time_spent_seconds)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatDate(view.viewed_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
