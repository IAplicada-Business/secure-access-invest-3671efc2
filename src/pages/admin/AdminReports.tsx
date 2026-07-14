import { useEffect, useState, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Search, TrendingUp, Flame, MessageCircle, Check, Minus, Users, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Partner, PartnerType, PartnerInteraction } from '@/types/database';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  imobiliaria: 'Imobiliária', corretor_autonomo: 'Corretor Autônomo',
  assessor_investimento: 'Assessor', arquiteto: 'Arquiteto',
  engenheiro: 'Engenheiro', contador: 'Contador', outro: 'Outro',
};

interface ViewReport {
  investor_name: string;
  investor_id: string;
  property_title: string;
  property_id: string;
  time_spent_seconds: number;
  scroll_depth_percent: number;
  viewed_at: string;
  has_cta_click: boolean;
  score: number;
}

interface PartnerPerformance {
  id: string;
  name: string;
  type: PartnerType;
  clients_count: number;
  total_generated: number;
  commission_paid: number;
  commission_pending: number;
  last_contact: string | null;
}

type PeriodFilter = '7d' | '30d' | 'all';
type ReportPeriod = 'month' | 'quarter' | 'custom';

function calculateScore(timeSpent: number, scrollDepth: number, hasCtaClick: boolean): number {
  let score = 0;
  if (timeSpent > 120) score += 5;
  else if (timeSpent > 60) score += 3;
  if (scrollDepth > 75) score += 2;
  if (hasCtaClick) score += 10;
  return score;
}

export default function AdminReports() {
  const [views, setViews] = useState<ViewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInvestor, setSearchInvestor] = useState('');
  const [searchProperty, setSearchProperty] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');

  // Partner performance
  const [partnerPerf, setPartnerPerf] = useState<PartnerPerformance[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);

  // Partner report generation
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPartner, setReportPartner] = useState<PartnerPerformance | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('month');
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    loadViews();
    loadPartnerPerformance();
  }, []);

  async function loadPartnerPerformance() {
    const { data: partnersData } = await supabase.from('partners').select('*').order('name');
    if (!partnersData || partnersData.length === 0) { setPartnerLoading(false); return; }

    const partnerIds = partnersData.map(p => p.id);

    // Count clients per partner
    const { data: clientsData } = await supabase.from('clients').select('partner_id').in('partner_id', partnerIds);
    const clientCounts = new Map<string, number>();
    clientsData?.forEach(c => {
      if (c.partner_id) clientCounts.set(c.partner_id, (clientCounts.get(c.partner_id) || 0) + 1);
    });

    // Last interaction per partner
    const { data: interactionsData } = await supabase.from('partner_interactions').select('partner_id, interaction_date').in('partner_id', partnerIds).order('interaction_date', { ascending: false });
    const lastContact = new Map<string, string>();
    interactionsData?.forEach(i => {
      if (!lastContact.has(i.partner_id)) lastContact.set(i.partner_id, i.interaction_date);
    });

    // Real revenue data
    const { data: revenuesData } = await supabase.from('revenues').select('partner_id, amount').in('partner_id', partnerIds);
    const revenueTotals = new Map<string, number>();
    revenuesData?.forEach(r => {
      if (r.partner_id) revenueTotals.set(r.partner_id, (revenueTotals.get(r.partner_id) || 0) + Number(r.amount));
    });

    // Real commission data
    const { data: commissionsData } = await supabase.from('commissions').select('partner_id, amount, status').in('partner_id', partnerIds);
    const commissionPaid = new Map<string, number>();
    const commissionPending = new Map<string, number>();
    commissionsData?.forEach(c => {
      if (c.status === 'paid') {
        commissionPaid.set(c.partner_id, (commissionPaid.get(c.partner_id) || 0) + Number(c.amount));
      } else {
        commissionPending.set(c.partner_id, (commissionPending.get(c.partner_id) || 0) + Number(c.amount));
      }
    });

    const perf: PartnerPerformance[] = partnersData.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type as PartnerType,
      clients_count: clientCounts.get(p.id) || 0,
      total_generated: revenueTotals.get(p.id) || 0,
      commission_paid: commissionPaid.get(p.id) || 0,
      commission_pending: commissionPending.get(p.id) || 0,
      last_contact: lastContact.get(p.id) || null,
    }));

    perf.sort((a, b) => b.clients_count - a.clients_count);
    setPartnerPerf(perf);
    setPartnerLoading(false);
  }

  async function loadViews() {
    const { data: viewsData } = await supabase
      .from('page_views')
      .select('*')
      .order('viewed_at', { ascending: false });

    if (!viewsData || viewsData.length === 0) {
      setLoading(false);
      return;
    }

    const { data: ctaClicks } = await supabase.from('cta_clicks').select('*');
    const ctaClicksMap = new Map<string, boolean>();
    ctaClicks?.forEach(click => {
      const key = `${click.access_link_id}_${click.property_id}`;
      ctaClicksMap.set(key, true);
    });

    const linkIds = [...new Set(viewsData.map(v => v.access_link_id).filter(Boolean))];
    const propertyIds = [...new Set(viewsData.map(v => v.property_id).filter(Boolean))];

    const { data: links } = await supabase.from('access_links').select('id, investor_name').in('id', linkIds as string[]);
    const { data: properties } = await supabase.from('properties').select('id, title').in('id', propertyIds as string[]);

    const linksMap = new Map(links?.map(l => [l.id, l.investor_name]) || []);
    const propertiesMap = new Map(properties?.map(p => [p.id, p.title]) || []);

    const reports: ViewReport[] = viewsData.map(v => {
      const hasCtaClick = ctaClicksMap.get(`${v.access_link_id}_${v.property_id}`) || false;
      const scrollDepth = v.scroll_depth_percent || 0;
      return {
        investor_name: linksMap.get(v.access_link_id || '') || 'Desconhecido',
        investor_id: v.access_link_id || '',
        property_title: propertiesMap.get(v.property_id || '') || 'Imóvel removido',
        property_id: v.property_id || '',
        time_spent_seconds: v.time_spent_seconds || 0,
        scroll_depth_percent: scrollDepth,
        viewed_at: v.viewed_at || '',
        has_cta_click: hasCtaClick,
        score: calculateScore(v.time_spent_seconds || 0, scrollDepth, hasCtaClick),
      };
    });

    reports.sort((a, b) => b.score - a.score);
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
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function getScrollColor(percent: number): string {
    if (percent < 25) return 'bg-red-500';
    if (percent < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  const filteredViews = useMemo(() => {
    let result = views.filter(v =>
      v.investor_name.toLowerCase().includes(searchInvestor.toLowerCase()) &&
      v.property_title.toLowerCase().includes(searchProperty.toLowerCase())
    );
    if (periodFilter !== 'all') {
      const now = new Date();
      const days = periodFilter === '7d' ? 7 : 30;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter(v => new Date(v.viewed_at) >= cutoff);
    }
    return result;
  }, [views, searchInvestor, searchProperty, periodFilter]);

  const highInterestCount = filteredViews.filter(v => v.time_spent_seconds > 60).length;
  const hotLeadsCount = new Set(filteredViews.filter(v => v.score >= 10).map(v => v.investor_id)).size;
  const totalCtaClicks = filteredViews.filter(v => v.has_cta_click).length;

  return (
    <div className="space-y-6 font-ds-body">
      <Tabs defaultValue="interest" className="space-y-0">
        <div>
          <div className="space-y-1">
            <h1 className="font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
              Relatórios
            </h1>
            <p className="text-sm text-ink-500">Interesse de investidores e performance de parceiros.</p>
          </div>
          <TabsList>
            <TabsTrigger value="interest">Interesse de Investidores</TabsTrigger>
            <TabsTrigger value="partners">Performance de Parceiros</TabsTrigger>
          </TabsList>
        </div>

        {/* INTEREST TAB */}
        <TabsContent value="interest" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Visualizações</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{filteredViews.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alto Interesse (+60s)</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold text-primary">{highInterestCount}</div></CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Leads Quentes 🔥</CardTitle>
                <Flame className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold text-destructive">{hotLeadsCount}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cliques no WhatsApp</CardTitle>
                <MessageCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold text-green-600">{totalCtaClicks}</div></CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Filtrar por investidor..." value={searchInvestor} onChange={(e) => setSearchInvestor(e.target.value)} className="pl-9" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Filtrar por imóvel..." value={searchProperty} onChange={(e) => setSearchProperty(e.target.value)} className="pl-9" />
            </div>
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investidor</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead className="hidden md:table-cell">Scroll</TableHead>
                    <TableHead className="hidden sm:table-cell">CTA</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden lg:table-cell">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filteredViews.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma visualização encontrada</TableCell></TableRow>
                  ) : (
                    filteredViews.map((view, idx) => (
                      <TableRow key={idx} className={view.score >= 10 ? 'bg-destructive/5' : view.time_spent_seconds > 60 ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium">{view.investor_name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{view.property_title}</TableCell>
                        <TableCell>
                          <Badge variant={view.time_spent_seconds > 60 ? 'default' : 'secondary'} className={view.time_spent_seconds > 60 ? 'bg-primary' : ''}>
                            <Clock className="mr-1 h-3 w-3" />{formatTime(view.time_spent_seconds)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress value={view.scroll_depth_percent} className={`h-2 w-16 ${getScrollColor(view.scroll_depth_percent)}`} />
                            <span className="text-xs text-muted-foreground">{view.scroll_depth_percent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {view.has_cta_click ? <Check className="h-5 w-5 text-green-600" /> : <Minus className="h-5 w-5 text-muted-foreground/40" />}
                        </TableCell>
                        <TableCell>
                          {view.score >= 10 ? (
                            <Badge variant="destructive" className="gap-1"><Flame className="h-3 w-3" />{view.score}</Badge>
                          ) : view.score >= 5 ? (
                            <Badge className="bg-yellow-500 hover:bg-yellow-500/80 text-white">{view.score}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">{view.score}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(view.viewed_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARTNER PERFORMANCE TAB */}
        <TabsContent value="partners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Performance de Parceiros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parceiro</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Clientes Gerados</TableHead>
                    <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                    <TableHead className="hidden md:table-cell">Comissão Paga</TableHead>
                    <TableHead className="hidden md:table-cell">Comissão Pendente</TableHead>
                    <TableHead className="hidden lg:table-cell">Último Contato</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : partnerPerf.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum parceiro cadastrado</TableCell></TableRow>
                  ) : partnerPerf.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{PARTNER_TYPE_LABELS[p.type]}</Badge></TableCell>
                      <TableCell>
                        <Badge className={p.clients_count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
                          {p.clients_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(p.total_generated)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(p.commission_paid)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(p.commission_pending)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {p.last_contact ? new Date(p.last_contact).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => { setReportPartner(p); setReportDialogOpen(true); }}>
                          <FileText className="mr-1 h-3 w-3" /> Relatório
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Partner Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar Relatório de Parceiro</DialogTitle></DialogHeader>
          {reportPartner && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Parceiro: <span className="font-medium text-foreground">{reportPartner.name}</span></p>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={reportPeriod} onValueChange={(v) => setReportPeriod(v as ReportPeriod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="quarter">Último trimestre</SelectItem>
                    <SelectItem value="custom">Todo o período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancelar</Button>
                <Button onClick={async () => {
                  setReportGenerating(true);
                  try {
                    const periodLabel = reportPeriod === 'month' ? 'Último mês' : reportPeriod === 'quarter' ? 'Último trimestre' : 'Todo o período';

                    // Build variables map
                    const variablesData: Record<string, string> = {
                      nome_parceiro: reportPartner.name,
                      tipo_parceiro: PARTNER_TYPE_LABELS[reportPartner.type],
                      periodo: periodLabel,
                      data_geracao: new Date().toLocaleDateString('pt-BR'),
                      clientes_gerados: String(reportPartner.clients_count),
                      receita_total: formatCurrency(reportPartner.total_generated),
                      comissao_paga: formatCurrency(reportPartner.commission_paid),
                      comissao_pendente: formatCurrency(reportPartner.commission_pending),
                    };

                    // Try to find an active "relatorio" template
                    const { data: template } = await supabase
                      .from('document_templates')
                      .select('*')
                      .eq('type', 'relatorio')
                      .eq('status', 'ativo')
                      .limit(1)
                      .maybeSingle();

                    let content: string;
                    if (template?.content) {
                      // Use configurable template — replace variables
                      content = template.content;
                      for (const [key, value] of Object.entries(variablesData)) {
                        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                      }
                    } else {
                      // Fallback: hardcoded content
                      content = `**RELATÓRIO DE PERFORMANCE DE PARCEIRO**

**Parceiro:** ${reportPartner.name}
**Tipo:** ${PARTNER_TYPE_LABELS[reportPartner.type]}
**Período:** ${periodLabel}
**Data de geração:** ${new Date().toLocaleDateString('pt-BR')}

---

**RESUMO DE MÉTRICAS**

Clientes gerados: ${reportPartner.clients_count}
Receita total gerada: ${formatCurrency(reportPartner.total_generated)}
Comissão paga: ${formatCurrency(reportPartner.commission_paid)}
Comissão pendente: ${formatCurrency(reportPartner.commission_pending)}

---

**Observações:**
Relatório gerado automaticamente pelo sistema Tijolo em Capital.`;
                    }

                    const { data, error } = await supabase.functions.invoke('generate-pdf', {
                      body: { content, variables_data: variablesData, title: `Relatório - ${reportPartner.name}` },
                    });
                    if (error) throw error;

                    // Save as generated document
                    await supabase.from('generated_documents').insert({
                      type: 'relatorio',
                      title: `Relatório - ${reportPartner.name} - ${periodLabel}`,
                      template_id: template?.id || null,
                      variables_data: variablesData,
                      file_url: data.file_url,
                      status: 'rascunho',
                    });

                    // Auto-download
                    const { data: fileData } = await supabase.storage.from('generated-documents').download(data.file_url);
                    if (fileData) {
                      const url = URL.createObjectURL(fileData);
                      const a = document.createElement('a'); a.href = url; a.download = `Relatório_${reportPartner.name}.pdf`; a.click();
                      URL.revokeObjectURL(url);
                    }

                    toast.success('Relatório gerado e baixado!');
                    setReportDialogOpen(false);
                  } catch (err: any) {
                    toast.error('Erro ao gerar relatório: ' + (err.message || 'Erro'));
                  } finally {
                    setReportGenerating(false);
                  }
                }} disabled={reportGenerating}>
                  {reportGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><FileText className="mr-1 h-4 w-4" /> Gerar PDF</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}