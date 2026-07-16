import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, CheckCircle, DollarSign, Clock, LayoutGrid, List, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { PeriodFilter, filterByPeriod, type PeriodPreset } from './PeriodFilter';
import { Drawer, KanbanBoard, type KanbanCard, type KanbanColumn } from '@/components/ui-system';
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
import type { ServiceType } from '@/types/database';

const SERVICE_LABELS: Record<ServiceType, string> = {
  regularizacao: 'Regularização',
  venda_plataforma: 'Venda plataforma',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'pending', title: 'Pendentes', accentClassName: 'bg-cream-100' },
  { id: 'paid', title: 'Pagas', accentClassName: 'bg-brand-goldSoft/20' },
];

interface CommissionRow {
  id: string;
  partner_id: string;
  client_id: string | null;
  revenue_id: string | null;
  rate: number;
  amount: number;
  status: 'pending' | 'paid';
  paid_at: string | null;
  created_at: string;
  service_type: ServiceType | null;
}

export function FinanceCommissions() {
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [partners, setPartners] = useState<Map<string, string>>(new Map());
  const [partnerList, setPartnerList] = useState<Array<{ id: string; name: string }>>([]);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [view, setView] = useState<'table' | 'kanban'>('table');

  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<CommissionRow | null>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paying, setPaying] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: commData }, { data: pData }, { data: cData }, { data: revData }] = await Promise.all([
      supabase.from('commissions').select('*').order('created_at', { ascending: false }),
      supabase.from('partners').select('id, name'),
      supabase.from('clients').select('id, name'),
      supabase.from('revenues').select('id, service_type'),
    ]);

    const revMap = new Map((revData || []).map(r => [r.id, r.service_type as ServiceType]));
    const rows: CommissionRow[] = (commData || []).map(c => ({
      id: c.id,
      partner_id: c.partner_id,
      client_id: c.client_id,
      revenue_id: c.revenue_id,
      rate: Number(c.rate),
      amount: Number(c.amount),
      status: c.status as 'pending' | 'paid',
      paid_at: c.paid_at,
      created_at: c.created_at,
      service_type: c.revenue_id ? (revMap.get(c.revenue_id) ?? null) : null,
    }));

    setCommissions(rows);
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

  function openPay(commission: CommissionRow) {
    setSelectedCommission(commission);
    setPaidAt(new Date().toISOString().split('T')[0]);
    setPayDialogOpen(true);
  }

  async function handleKanbanMove(cardId: string, toColumnId: string) {
    const commission = commissions.find(c => c.id === cardId);
    if (!commission || commission.status === toColumnId) return;

    if (toColumnId === 'paid') {
      openPay(commission);
      return;
    }

    // Reabrir como pendente (não remove despesa já lançada — ajuste financeiro manual se necessário)
    const { error } = await supabase
      .from('commissions')
      .update({ status: 'pending', paid_at: null })
      .eq('id', cardId);
    if (error) {
      toast.error('Erro ao mover comissão');
      return;
    }
    toast.message('Comissão voltou para pendente.');
    load();
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const yearStart = `${now.getFullYear()}-01-01`;

  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const paidThisMonth = commissions.filter(c => c.status === 'paid' && c.paid_at && c.paid_at >= currentMonthStart).reduce((s, c) => s + c.amount, 0);
  const paidThisYear = commissions.filter(c => c.status === 'paid' && c.paid_at && c.paid_at >= yearStart).reduce((s, c) => s + c.amount, 0);
  const regPending = commissions
    .filter(c => c.status === 'pending' && c.service_type === 'regularizacao')
    .reduce((s, c) => s + c.amount, 0);
  const regPaidYear = commissions
    .filter(c => c.status === 'paid' && c.service_type === 'regularizacao' && c.paid_at && c.paid_at >= yearStart)
    .reduce((s, c) => s + c.amount, 0);
  const pendingCount = commissions.filter(c => c.status === 'pending').length;

  const filtered = commissions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (partnerFilter !== 'all' && c.partner_id !== partnerFilter) return false;
    if (typeFilter !== 'all' && (c.service_type || 'outro') !== typeFilter) return false;
    const dateField = c.status === 'paid' && c.paid_at ? c.paid_at : c.created_at;
    if (!filterByPeriod(dateField, period, customStart, customEnd)) return false;
    if (search) {
      const pName = partners.get(c.partner_id) || '';
      const cName = clients.get(c.client_id || '') || '';
      const q = search.toLowerCase();
      if (!pName.toLowerCase().includes(q) && !cName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const regEvolution = useMemo(() => {
    const refNow = new Date();
    const months: Array<{ key: string; label: string; pending: number; paid: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refNow.getFullYear(), refNow.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }),
        pending: 0,
        paid: 0,
      });
    }
    commissions
      .filter(c => c.service_type === 'regularizacao')
      .forEach(c => {
        const ref = (c.status === 'paid' && c.paid_at ? c.paid_at : c.created_at).slice(0, 7);
        const bucket = months.find(m => m.key === ref);
        if (!bucket) return;
        if (c.status === 'paid') bucket.paid += c.amount;
        else bucket.pending += c.amount;
      });
    return months;
  }, [commissions]);

  const kanbanCards: KanbanCard[] = filtered.map(c => ({
    id: c.id,
    columnId: c.status,
    content: (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-ink-900">
            {partners.get(c.partner_id) || 'Parceiro'}
          </p>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {c.service_type ? SERVICE_LABELS[c.service_type] : '—'}
          </Badge>
        </div>
        <p className="truncate text-xs text-ink-300">{clients.get(c.client_id || '') || 'Sem cliente'}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="font-ds-mono text-sm font-semibold text-ink-900">{formatCurrency(c.amount)}</p>
          {c.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                openPay(c);
              }}
            >
              Pagar
            </Button>
          )}
        </div>
      </div>
    ),
  }));

  return (
    <div className="space-y-6 font-ds-body">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Total pendente</p>
            <Clock className="h-4 w-4 text-ink-300" />
          </div>
          <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">{formatCurrency(totalPending)}</p>
          <p className="mt-1 text-xs text-ink-300">{pendingCount} comissão{pendingCount === 1 ? '' : 'ões'}</p>
        </div>
        <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Pago no mês</p>
            <DollarSign className="h-4 w-4 text-brand-gold" />
          </div>
          <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">{formatCurrency(paidThisMonth)}</p>
          <p className="mt-1 text-xs text-ink-300">Ano: {formatCurrency(paidThisYear)}</p>
        </div>
        <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Reg. pendente</p>
            <TrendingUp className="h-4 w-4 text-brand-goldDeep" />
          </div>
          <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">{formatCurrency(regPending)}</p>
          <p className="mt-1 text-xs text-ink-300">Só de regularizações</p>
        </div>
        <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Reg. paga no ano</p>
            <CheckCircle className="h-4 w-4 text-semantic-success" />
          </div>
          <p className="mt-2 font-ds-mono text-2xl font-semibold text-ink-900">{formatCurrency(regPaidYear)}</p>
          <p className="mt-1 text-xs text-ink-300">Comissões de regularização</p>
        </div>
      </div>

      {/* Evolution of regularization commissions */}
      <div className="rounded-ds-xl border border-cream-200 bg-white p-5">
        <div className="mb-1">
          <h2 className="font-ds-display text-lg font-medium text-ink-900">Evolução — comissões de regularização</h2>
          <p className="text-xs text-ink-300">Últimos 6 meses · pendentes vs pagas</p>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={regEvolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="commPaidFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A961" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C9A961" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="commPendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8E8E8E" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8E8E8E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D7" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8E8E8E', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#8E8E8E', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) =>
                  Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #E8E4D7', fontSize: 12 }}
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'paid' ? 'Pagas' : 'Pendentes']}
              />
              <Area type="monotone" dataKey="pending" name="pending" stroke="#8E8E8E" strokeWidth={2} fill="url(#commPendFill)" />
              <Area type="monotone" dataKey="paid" name="paid" stroke="#C9A961" strokeWidth={2.5} fill="url(#commPaidFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por parceiro ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <PeriodFilter period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(k => (
              <SelectItem key={k} value={k}>{SERVICE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos parceiros</SelectItem>
            {partnerList.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-ds-pill border border-cream-200 bg-cream-50 p-0.5">
          <button
            type="button"
            onClick={() => setView('table')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-ds-pill px-3 py-1.5 text-xs font-medium transition',
              view === 'table' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-ds-pill px-3 py-1.5 text-xs font-medium transition',
              view === 'kanban' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map(c => (
              <div key={c.id} className="w-72 flex-shrink-0 space-y-2">
                <div className="h-5 w-28 animate-pulse rounded bg-cream-200" />
                <div className="h-28 animate-pulse rounded-ds-lg bg-cream-100" />
              </div>
            ))}
          </div>
        ) : (
          <KanbanBoard
            columns={KANBAN_COLUMNS}
            cards={kanbanCards}
            onMove={handleKanbanMove}
            emptyHint="Nenhuma comissão nesta coluna."
            columnMinHeight="min-h-[320px]"
          />
        )
      ) : (
        <div className="overflow-hidden rounded-ds-xl border border-cream-200 bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">%</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Data Pgto.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma comissão encontrada</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{partners.get(c.partner_id) || '-'}</TableCell>
                    <TableCell>{clients.get(c.client_id || '') || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {c.service_type ? SERVICE_LABELS[c.service_type] : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.rate}%</TableCell>
                    <TableCell className="font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      {c.status === 'paid' ? (
                        <Badge className="bg-brand-goldSoft/30 text-brand-goldDeep">Paga</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      {c.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => openPay(c)}>
                          <CheckCircle className="mr-1 h-3 w-3" />Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Drawer
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        title="Marcar comissão como paga"
        description={`Parceiro: ${selectedCommission ? partners.get(selectedCommission.partner_id) : ''} — Valor: ${selectedCommission ? formatCurrency(selectedCommission.amount) : ''}`}
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <div className="space-y-5 pb-4">
          <div className="space-y-2">
            <Label>Data de pagamento</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Uma despesa do tipo “Comissão paga” será criada automaticamente.
          </p>
          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePay} disabled={paying}>
              {paying ? 'Processando...' : 'Confirmar pagamento'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
