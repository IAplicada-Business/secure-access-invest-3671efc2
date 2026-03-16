import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, CheckCircle, DollarSign, Clock } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { PeriodFilter, filterByPeriod, type PeriodPreset } from './PeriodFilter';

export function FinanceCommissions() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [partners, setPartners] = useState<Map<string, string>>(new Map());
  const [partnerList, setPartnerList] = useState<Array<{ id: string; name: string }>>([]);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filters
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');

  // Pay dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paying, setPaying] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: commData }, { data: pData }, { data: cData }] = await Promise.all([
      supabase.from('commissions').select('*').order('created_at', { ascending: false }),
      supabase.from('partners').select('id, name'),
      supabase.from('clients').select('id, name'),
    ]);
    setCommissions(commData || []);
    setPartnerList(pData || []);
    setPartners(new Map(pData?.map(p => [p.id, p.name]) || []));
    setClients(new Map(cData?.map(c => [c.id, c.name]) || []));
    setLoading(false);
  }

  async function handlePay() {
    if (!selectedCommission) return;
    setPaying(true);

    const { error: commError } = await supabase
      .from('commissions')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', selectedCommission.id);

    if (commError) { toast.error('Erro ao atualizar comissão'); setPaying(false); return; }

    const partnerName = partners.get(selectedCommission.partner_id) || 'Parceiro';
    const { error: expError } = await supabase.from('expenses').insert({
      category: 'comissao_paga',
      description: `Comissão paga — ${partnerName}`,
      amount: selectedCommission.amount,
      expense_date: paidAt,
      is_recurring: false,
      related_commission_id: selectedCommission.id,
    });

    if (expError) { toast.error('Comissão paga, mas erro ao criar despesa'); }

    toast.success('Comissão marcada como paga');
    setPayDialogOpen(false);
    setSelectedCommission(null);
    setPaying(false);
    load();
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const yearStart = `${now.getFullYear()}-01-01`;

  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);
  const paidThisMonth = commissions.filter(c => c.status === 'paid' && c.paid_at >= currentMonthStart).reduce((s, c) => s + Number(c.amount), 0);
  const paidThisYear = commissions.filter(c => c.status === 'paid' && c.paid_at >= yearStart).reduce((s, c) => s + Number(c.amount), 0);

  const filtered = commissions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (partnerFilter !== 'all' && c.partner_id !== partnerFilter) return false;
    const dateField = c.status === 'paid' && c.paid_at ? c.paid_at : c.created_at;
    if (!filterByPeriod(dateField, period, customStart, customEnd)) return false;
    if (search) {
      const pName = partners.get(c.partner_id) || '';
      const cName = clients.get(c.client_id) || '';
      const q = search.toLowerCase();
      if (!pName.toLowerCase().includes(q) && !cName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalPending)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago no Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{formatCurrency(paidThisMonth)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago no Ano</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(paidThisYear)}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por parceiro ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <PeriodFilter period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos parceiros</SelectItem>
            {partnerList.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">%</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Data Pgto.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma comissão encontrada</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{partners.get(c.partner_id) || '-'}</TableCell>
                  <TableCell>{clients.get(c.client_id) || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{c.rate}%</TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(c.amount))}</TableCell>
                  <TableCell>
                    {c.status === 'paid' ? (
                      <Badge className="bg-primary/10 text-primary">Paga</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>
                    {c.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedCommission(c); setPaidAt(new Date().toISOString().split('T')[0]); setPayDialogOpen(true); }}>
                        <CheckCircle className="mr-1 h-3 w-3" />Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Comissão como Paga</DialogTitle>
            <DialogDescription>
              Parceiro: {selectedCommission ? partners.get(selectedCommission.partner_id) : ''} — Valor: {selectedCommission ? formatCurrency(Number(selectedCommission.amount)) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data de Pagamento</Label>
              <Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">Uma despesa do tipo "Comissão paga" será criada automaticamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={paying}>{paying ? 'Processando...' : 'Confirmar Pagamento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
