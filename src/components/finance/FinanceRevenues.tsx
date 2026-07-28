import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { PeriodFilter, filterByPeriod, type PeriodPreset } from './PeriodFilter';
import { Drawer, KanbanBoard, type KanbanCard, type KanbanColumn } from '@/components/ui-system';
import { cn } from '@/lib/utils';
import {
  PAYMENT_TYPE_LABELS,
  REVENUE_CATEGORY_LABELS,
  addMonths,
  splitAmount,
  type PaymentType,
} from '@/lib/financePayments';
import { createCommissionFromDeal } from '@/lib/financeCommissions';
import type { CommissionStatus, Revenue, RevenueKanbanStatus, RevenueStatus, ServiceType } from '@/types/database';

const SERVICE_LABELS: Record<ServiceType, string> = {
  regularizacao: 'Regularização',
  venda_plataforma: 'Venda via Plataforma',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'aguardando', title: 'Aguardando', accentClassName: 'bg-cream-100' },
  { id: 'em_atraso', title: 'Em atraso', accentClassName: 'bg-[hsl(0,72%,96%)]' },
  { id: 'pago', title: 'Pago', accentClassName: 'bg-brand-goldSoft/20' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function todayInput() {
  return new Date().toISOString().split('T')[0];
}

function dateOnlyToUtc(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

function getRevenueDueDate(revenue: Pick<Revenue, 'vencimento' | 'due_date' | 'received_at'>) {
  return revenue.vencimento || revenue.due_date || revenue.received_at;
}

function getDaysOverdue(revenue: Pick<Revenue, 'status' | 'vencimento' | 'due_date' | 'received_at'>) {
  if (revenue.status === 'pago') return 0;
  const dueUtc = dateOnlyToUtc(getRevenueDueDate(revenue));
  if (!dueUtc) return 0;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((todayUtc - dueUtc) / MS_PER_DAY));
}

function getRevenueKanbanColumn(revenue: Pick<Revenue, 'status' | 'vencimento' | 'due_date' | 'received_at'>): RevenueKanbanStatus {
  if (revenue.status === 'pago') return 'pago';
  return getDaysOverdue(revenue) > 0 ? 'em_atraso' : 'aguardando';
}

interface ClientOption {
  id: string;
  name: string;
  partner_id: string | null;
  partner_name: string | null;
  type: string;
}

interface PartnerOption {
  id: string;
  name: string;
  commission_rate: number | null;
}

export function FinanceRevenues() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [commissionMap, setCommissionMap] = useState<Map<string, CommissionStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'kanban'>('table');

  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  const [clientId, setClientId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('outro');
  const [category, setCategory] = useState('projeto');
  const [paymentType, setPaymentType] = useState<PaymentType>('pix');
  const [amount, setAmount] = useState('');
  const [entrada, setEntrada] = useState('');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [receivedAt, setReceivedAt] = useState(todayInput());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedPartner = selectedClient?.partner_id
    ? partners.find((p) => p.id === selectedClient.partner_id)
    : null;
  const commissionRate = selectedPartner?.commission_rate || 0;
  const totalAmount = Number(amount) || 0;
  const entradaValue = Math.min(Math.max(Number(entrada) || 0, 0), totalAmount);
  const parcels = Math.max(1, parseInt(installmentCount, 10) || 1);
  const saldo = Math.max(totalAmount - entradaValue, 0);
  const commissionAmount = commissionRate > 0 && totalAmount ? (totalAmount * commissionRate) / 100 : 0;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [{ data: revData }, { data: cData }, { data: pData }, { data: commData }] = await Promise.all([
      supabase.from('revenues').select('*').order('received_at', { ascending: false }),
      supabase.from('clients').select('id, name, partner_id, partner_name, type'),
      supabase.from('partners').select('id, name, commission_rate'),
      supabase.from('commissions').select('revenue_id, status'),
    ]);
    setRevenues((revData || []) as Revenue[]);
    setClients(cData || []);
    setPartners(pData || []);
    setCommissionMap(
      new Map(
        (commData || [])
          .filter((c) => c.revenue_id)
          .map((c) => [c.revenue_id as string, c.status as CommissionStatus]),
      ),
    );
    setLoading(false);
  }

  async function handleSave() {
    if (!amount || totalAmount <= 0) {
      toast.error('Informe o valor');
      return;
    }
    setSaving(true);

    const partnerId = selectedClient?.partner_id || null;
    const rows: Record<string, unknown>[] = [];

    if (entradaValue > 0) {
      const dueDate = receivedAt;
      rows.push({
        client_id: clientId || null,
        partner_id: partnerId,
        service_type: serviceType,
        category,
        payment_type: paymentType,
        amount: entradaValue,
        entrada: entradaValue,
        installment_count: parcels,
        installment_number: 0,
        received_at: receivedAt,
        due_date: dueDate,
        vencimento: dueDate,
        status: 'aguardando' satisfies RevenueStatus,
        notes: notes ? `${notes} (entrada)` : 'Entrada',
      });
    }

    if (saldo > 0) {
      const parts = splitAmount(saldo, parcels);
      parts.forEach((part, idx) => {
        const dueDate = addMonths(receivedAt, entradaValue > 0 ? idx + 1 : idx);
        rows.push({
          client_id: clientId || null,
          partner_id: partnerId,
          service_type: serviceType,
          category,
          payment_type: paymentType,
          amount: part,
          entrada: entradaValue > 0 ? entradaValue : null,
          installment_count: parcels,
          installment_number: idx + 1,
          received_at: receivedAt,
          due_date: dueDate,
          vencimento: dueDate,
          status: 'aguardando' satisfies RevenueStatus,
          notes: notes || null,
        });
      });
    }

    if (rows.length === 0) {
      toast.error('Nada para lançar');
      setSaving(false);
      return;
    }

    const { data: inserted, error } = await supabase.from('revenues').insert(rows).select();
    if (error) {
      toast.error('Erro ao salvar receita: ' + error.message);
      setSaving(false);
      return;
    }

    const firstId = inserted?.[0]?.id;
    if (firstId && inserted && inserted.length > 1) {
      await supabase
        .from('revenues')
        .update({ parent_revenue_id: firstId })
        .in(
          'id',
          inserted.slice(1).map((r) => r.id),
        );
    }

    if (partnerId && commissionRate > 0 && firstId) {
      const { error: commErr } = await createCommissionFromDeal({
        partnerId,
        clientId: clientId || null,
        revenueId: firstId,
        dealAmount: totalAmount,
        rate: commissionRate,
        notes: notes || 'Gerada automaticamente a partir da receita',
      });
      if (commErr) {
        toast.error('Receita salva, mas falha ao gerar comissão: ' + commErr.message);
        setDrawerOpen(false);
        resetForm();
        setSaving(false);
        loadAll();
        return;
      }
    }

    toast.success(
      partnerId && commissionRate > 0
        ? rows.length > 1
          ? `Receita em ${rows.length} lançamentos + comissão para o parceiro`
          : 'Receita registrada e comissão gerada para o parceiro'
        : rows.length > 1
          ? `Receita lançada em ${rows.length} lançamentos (entrada/parcelas)`
          : 'Receita registrada',
    );
    setDrawerOpen(false);
    resetForm();
    setSaving(false);
    loadAll();
  }

  function resetForm() {
    setClientId('');
    setServiceType('outro');
    setCategory('projeto');
    setPaymentType('pix');
    setAmount('');
    setEntrada('');
    setInstallmentCount('1');
    setReceivedAt(todayInput());
    setNotes('');
  }

  async function handleKanbanMove(cardId: string, toColumnId: string) {
    const revenue = revenues.find((r) => r.id === cardId);
    if (!revenue) return;

    const nextStatus: RevenueStatus = toColumnId === 'pago' ? 'pago' : 'aguardando';
    const update: { status: RevenueStatus; received_at?: string } = { status: nextStatus };
    if (nextStatus === 'pago') update.received_at = todayInput();

    const { error } = await supabase.from('revenues').update(update).eq('id', cardId);
    if (error) {
      toast.error('Erro ao mover receita: ' + error.message);
      return;
    }

    toast.success(nextStatus === 'pago' ? 'Receita marcada como paga' : 'Receita voltou para aguardando');
    loadAll();
  }

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const partnerMap = new Map(partners.map((p) => [p.id, p.name]));

  const filtered = revenues.filter((r) => {
    if (!filterByPeriod(getRevenueDueDate(r), period, customStart, customEnd)) return false;
    if (serviceTypeFilter !== 'all' && r.service_type !== serviceTypeFilter) return false;
    if (search) {
      const cName = clientMap.get(r.client_id) || '';
      const pName = partnerMap.get(r.partner_id) || '';
      const q = search.toLowerCase();
      if (
        !cName.toLowerCase().includes(q) &&
        !pName.toLowerCase().includes(q) &&
        !SERVICE_LABELS[r.service_type as ServiceType]?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const kanbanCards: KanbanCard[] = useMemo(
    () =>
      filtered
        .map((revenue) => {
          const columnId = getRevenueKanbanColumn(revenue);
          return {
            revenue,
            columnId,
            daysOverdue: getDaysOverdue(revenue),
            dueUtc: dateOnlyToUtc(getRevenueDueDate(revenue)) ?? 0,
          };
        })
        .sort((a, b) => {
          if (a.columnId === 'em_atraso' && b.columnId === 'em_atraso') {
            return b.daysOverdue - a.daysOverdue;
          }
          return a.dueUtc - b.dueUtc;
        })
        .map(({ revenue, columnId, daysOverdue }) => {
          const clientName = clientMap.get(revenue.client_id || '') || 'Sem cliente';
          const partnerName = partnerMap.get(revenue.partner_id || '') || null;
          const parcelLabel =
            revenue.installment_number === 0
              ? 'Entrada'
              : (revenue.installment_count || 1) > 1
                ? `${revenue.installment_number}/${revenue.installment_count}`
                : 'À vista';

          return {
            id: revenue.id,
            columnId,
            className: columnId === 'em_atraso' ? 'border-l-[3px] border-l-semantic-danger' : undefined,
            content: (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-ds-display text-sm font-medium text-ink-900">{clientName}</p>
                    {partnerName && <p className="truncate text-xs text-ink-300">{partnerName}</p>}
                  </div>
                  {columnId === 'em_atraso' ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-semantic-danger/30 bg-[hsl(0,72%,96%)] text-[10px] text-semantic-danger"
                    >
                      {daysOverdue} dia{daysOverdue === 1 ? '' : 's'} em atraso
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {SERVICE_LABELS[revenue.service_type] || revenue.service_type}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-ds-mono text-sm font-semibold text-ink-900">
                    {formatCurrency(Number(revenue.amount))}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {parcelLabel}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-ink-300">
                  <span>Vence {formatDateOnly(getRevenueDueDate(revenue))}</span>
                  {columnId !== 'pago' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKanbanMove(revenue.id, 'pago');
                      }}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Pago
                    </Button>
                  )}
                </div>
              </div>
            ),
          };
        }),
    [filtered, clientMap, partnerMap],
  );

  return (
    <div className="space-y-4 font-ds-body">
      <div className="flex flex-col flex-wrap items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar receitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <PeriodFilter
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
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
        <Button
          onClick={() => {
            resetForm();
            setDrawerOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      {view === 'kanban' ? (
        loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((column) => (
              <div key={column.id} className="w-72 flex-shrink-0 space-y-2">
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
            emptyHint="Nenhuma receita nesta coluna."
            columnMinHeight="min-h-[320px]"
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Nenhuma receita registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const commStatus = commissionMap.get(r.id);
                      const kanbanStatus = getRevenueKanbanColumn(r);
                      const daysOverdue = getDaysOverdue(r);
                      const parcelLabel =
                        r.installment_number === 0
                          ? 'Entrada'
                          : (r.installment_count || 1) > 1
                            ? `${r.installment_number}/${r.installment_count}`
                            : 'À vista';
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{formatDateOnly(getRevenueDueDate(r))}</TableCell>
                          <TableCell className="font-medium">{clientMap.get(r.client_id || '') || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {SERVICE_LABELS[r.service_type as ServiceType] || r.service_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {PAYMENT_TYPE_LABELS[r.payment_type as PaymentType] || r.payment_type || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{parcelLabel}</Badge>
                          </TableCell>
                          <TableCell className="font-ds-mono font-medium">{formatCurrency(Number(r.amount))}</TableCell>
                          <TableCell>
                            {kanbanStatus === 'pago' ? (
                              <Badge className="bg-brand-goldSoft/30 text-brand-goldDeep">Pago</Badge>
                            ) : kanbanStatus === 'em_atraso' ? (
                              <Badge
                                variant="outline"
                                className="border-semantic-danger/30 bg-[hsl(0,72%,96%)] text-semantic-danger"
                              >
                                {daysOverdue} dia{daysOverdue === 1 ? '' : 's'} em atraso
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Aguardando</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {commStatus === 'pending' ? (
                              <Badge variant="secondary">Pendente</Badge>
                            ) : commStatus === 'paid' ? (
                              <Badge className="bg-primary/10 text-primary">Paga</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Nova receita"
        description="Lance com entrada, parcelas e tipo de pagamento para previsibilidade."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <div className="space-y-5 pb-4">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Negócio</h3>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de serviço</Label>
                <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REVENUE_CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Valores e parcelas</h3>
            <div className="space-y-2">
              <Label>Valor total (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entrada (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Nº de parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                />
              </div>
            </div>
            {totalAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Entrada {formatCurrency(entradaValue)} · Saldo {formatCurrency(saldo)} em {parcels}x
                {parcels > 0 && saldo > 0 ? ` de ~${formatCurrency(saldo / parcels)}` : ''}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de pagamento</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vencimento base</Label>
                <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes da receita..." />
            </div>
          </section>

          {selectedPartner && commissionRate > 0 && totalAmount > 0 && (
            <Card className="border-primary/30 bg-accent">
              <CardContent className="p-3">
                <p className="text-sm font-medium">Comissão automática</p>
                <p className="text-xs text-muted-foreground">
                  Parceiro: {selectedPartner.name} — {commissionRate}% ={' '}
                  <strong>{formatCurrency(commissionAmount)}</strong>
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
