import { useEffect, useState } from 'react';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { PeriodFilter, filterByPeriod, type PeriodPreset } from './PeriodFilter';
import type { ServiceType, CommissionStatus } from '@/types/database';

const SERVICE_LABELS: Record<ServiceType, string> = {
  regularizacao: 'Regularização',
  venda_plataforma: 'Venda via Plataforma',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

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
  const [revenues, setRevenues] = useState<any[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [commissionMap, setCommissionMap] = useState<Map<string, CommissionStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filters
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  // Form state
  const [clientId, setClientId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('outro');
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Computed commission preview
  const selectedClient = clients.find(c => c.id === clientId);
  const selectedPartner = selectedClient?.partner_id ? partners.find(p => p.id === selectedClient.partner_id) : null;
  const commissionRate = selectedPartner?.commission_rate || 0;
  const commissionAmount = commissionRate > 0 && amount ? (Number(amount) * commissionRate / 100) : 0;

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [{ data: revData }, { data: cData }, { data: pData }, { data: commData }] = await Promise.all([
      supabase.from('revenues').select('*').order('received_at', { ascending: false }),
      supabase.from('clients').select('id, name, partner_id, partner_name, type'),
      supabase.from('partners').select('id, name, commission_rate'),
      supabase.from('commissions').select('revenue_id, status'),
    ]);
    setRevenues(revData || []);
    setClients(cData || []);
    setPartners(pData || []);
    setCommissionMap(new Map((commData || []).map(c => [c.revenue_id, c.status as CommissionStatus])));
    setLoading(false);
  }

  async function handleSave() {
    if (!amount || Number(amount) <= 0) { toast.error('Informe o valor'); return; }
    setSaving(true);

    const partnerId = selectedClient?.partner_id || null;

    const { data: rev, error } = await supabase.from('revenues').insert({
      client_id: clientId || null,
      partner_id: partnerId,
      service_type: serviceType,
      amount: Number(amount),
      received_at: receivedAt,
      notes: notes || null,
    }).select().single();

    if (error) { toast.error('Erro ao salvar receita'); setSaving(false); return; }

    if (partnerId && commissionRate > 0 && rev) {
      await supabase.from('commissions').insert({
        partner_id: partnerId,
        client_id: clientId || null,
        revenue_id: rev.id,
        rate: commissionRate,
        amount: commissionAmount,
        status: 'pending',
      });
    }

    toast.success('Receita registrada');
    setDialogOpen(false);
    resetForm();
    setSaving(false);
    loadAll();
  }

  function resetForm() {
    setClientId('');
    setServiceType('outro');
    setAmount('');
    setReceivedAt(new Date().toISOString().split('T')[0]);
    setNotes('');
  }

  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  const partnerMap = new Map(partners.map(p => [p.id, p.name]));

  const filtered = revenues.filter(r => {
    if (!filterByPeriod(r.received_at, period, customStart, customEnd)) return false;
    if (serviceTypeFilter !== 'all' && r.service_type !== serviceTypeFilter) return false;
    if (search) {
      const cName = clientMap.get(r.client_id) || '';
      const pName = partnerMap.get(r.partner_id) || '';
      const q = search.toLowerCase();
      if (!cName.toLowerCase().includes(q) && !pName.toLowerCase().includes(q) &&
          !(SERVICE_LABELS[r.service_type as ServiceType]?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar receitas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <PeriodFilter period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Receita</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead className="hidden md:table-cell">Parceiro</TableHead>
                <TableHead className="hidden lg:table-cell">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma receita registrada</TableCell></TableRow>
              ) : filtered.map(r => {
                const commStatus = commissionMap.get(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.received_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">{clientMap.get(r.client_id) || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{SERVICE_LABELS[r.service_type as ServiceType] || r.service_type}</Badge></TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(r.amount))}</TableCell>
                    <TableCell>
                      {commStatus === 'pending' ? (
                        <Badge variant="secondary" className="border-warning text-warning">Pendente</Badge>
                      ) : commStatus === 'paid' ? (
                        <Badge className="bg-primary/10 text-primary">Paga</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{partnerMap.get(r.partner_id) || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">{r.notes || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Revenue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Receita</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={clientId || 'none'} onValueChange={v => setClientId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Serviço</Label>
              <Select value={serviceType} onValueChange={v => setServiceType(v as ServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Data de Recebimento</Label>
              <Input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes da receita..." />
            </div>

            {selectedPartner && commissionRate > 0 && Number(amount) > 0 && (
              <Card className="border-primary/30 bg-accent">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">Comissão automática</p>
                  <p className="text-xs text-muted-foreground">
                    Parceiro: {selectedPartner.name} — {commissionRate}% = <strong>{formatCurrency(commissionAmount)}</strong>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
