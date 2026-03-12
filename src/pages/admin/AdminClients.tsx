import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Client, ClientType, ClientStatus, Partner } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, MessageCircle, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS: Record<ClientType, string> = {
  investor: 'Investidor',
  incorporator: 'Incorporador',
  individual: 'Pessoa Física',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  active: 'Ativo',
  completed: 'Concluído',
};

const STATUS_COLORS: Record<ClientStatus, string> = {
  prospect: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-accent text-accent-foreground',
};

const ORIGIN_OPTIONS = [
  'Indicação de parceiro',
  'Instagram',
  'Evento',
  'Outro',
];

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState({
    name: '', type: 'investor' as ClientType, cpf_cnpj: '', phone: '',
    email: '', origin: '', partner_id: '', partner_name: '', status: 'prospect' as ClientStatus, notes: '',
  });

  async function loadClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar clientes'); return; }
    setClients((data as unknown as Client[]) || []);
    setLoading(false);
  }

  async function loadPartners() {
    const { data } = await supabase.from('partners').select('id, name').eq('status', 'active').order('name');
    setPartners((data || []) as unknown as Partner[]);
  }

  useEffect(() => { loadClients(); loadPartners(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const selectedPartner = partners.find(p => p.id === form.partner_id);
    const { error } = await supabase.from('clients').insert({
      name: form.name,
      type: form.type,
      cpf_cnpj: form.cpf_cnpj || null,
      phone: form.phone,
      email: form.email || null,
      origin: form.origin || null,
      partner_id: form.partner_id || null,
      partner_name: selectedPartner ? selectedPartner.name : (form.partner_name || null),
      status: form.status,
      notes: form.notes || null,
    } as any);
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
    toast.success('Cliente cadastrado!');
    setDialogOpen(false);
    setForm({ name: '', type: 'investor', cpf_cnpj: '', phone: '', email: '', origin: '', partner_id: '', partner_name: '', status: 'prospect', notes: '' });
    setSaving(false);
    loadClients();
  }

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  function openWhatsApp(phone: string, name: string) {
    const msg = encodeURIComponent(`Olá ${name}!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="investor">Investidor</SelectItem>
            <SelectItem value="incorporator">Incorporador</SelectItem>
            <SelectItem value="individual">Pessoa Física</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Parceiro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
              ) : filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell><Badge variant="outline">{TYPE_LABELS[client.type]}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{client.partner_name || '-'}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[client.status]}>{STATUS_LABELS[client.status]}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{new Date(client.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openWhatsApp(client.phone, client.name)} title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                        <Link to={`/admin/clientes/${client.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v as ClientType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investor">Investidor</SelectItem>
                    <SelectItem value="incorporator">Incorporador</SelectItem>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm(p => ({ ...p, cpf_cnpj: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone/WhatsApp *</Label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="5511999999999" required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={form.origin} onValueChange={(v) => setForm(p => ({ ...p, origin: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ORIGIN_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Indicado por (parceiro)</Label>
                <Select value={form.partner_id || 'none'} onValueChange={(v) => setForm(p => ({ ...p, partner_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um parceiro..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Texto livre</SelectItem>
                    {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(!form.partner_id || form.partner_id === 'none') && (
              <div className="space-y-2">
                <Label>Parceiro (texto livre)</Label>
                <Input value={form.partner_name} onChange={(e) => setForm(p => ({ ...p, partner_name: e.target.value }))} placeholder="Nome de quem indicou (se não cadastrado)" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v as ClientStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Contexto relevante sobre o cliente..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
