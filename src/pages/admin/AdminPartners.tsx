import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Partner, PartnerType, PartnerStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, MessageCircle, Search, Eye, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { EmptyState, Drawer } from '@/components/ui-system';

const TYPE_LABELS: Record<PartnerType, string> = {
  imobiliaria: 'Imobiliária',
  corretor_autonomo: 'Corretor Autônomo',
  assessor_investimento: 'Assessor de Investimento',
  arquiteto: 'Arquiteto',
  engenheiro: 'Engenheiro',
  contador: 'Contador',
  outro: 'Outro',
};

const STATUS_LABELS: Record<PartnerStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

const STATUS_COLORS: Record<PartnerStatus, string> = {
  active: 'bg-primary/10 text-primary',
  inactive: 'bg-muted text-muted-foreground',
};

const defaultForm = {
  name: '', type: 'outro' as PartnerType, phone: '', email: '',
  affiliated_agency: '', website: '', creci: '', commission_rate: '',
  notes: '', status: 'active' as PartnerStatus, parent_partner_id: '',
};

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [agencies, setAgencies] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState(defaultForm);

  async function loadPartners() {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar parceiros'); return; }
    const list = data || [];
    setPartners(list);
    setAgencies(list.filter(p => p.type === 'imobiliaria'));
    setLoading(false);
  }

  useEffect(() => { loadPartners(); }, []);

  function openDrawer() {
    setForm(defaultForm);
    setDrawerOpen(true);
  }

  function handleDrawerChange(open: boolean) {
    setDrawerOpen(open);
    if (!open) setForm(defaultForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('partners').insert({
      name: form.name,
      type: form.type,
      phone: form.phone,
      email: form.email || null,
      affiliated_agency: form.affiliated_agency || null,
      website: form.website || null,
      creci: form.creci || null,
      commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
      notes: form.notes || null,
      status: form.status,
      parent_partner_id: form.parent_partner_id || null,
    });
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
    toast.success('Parceiro cadastrado!');
    setDrawerOpen(false);
    setForm(defaultForm);
    setSaving(false);
    loadPartners();
  }

  const filtered = partners.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  function openWhatsApp(phone: string, name: string) {
    const msg = encodeURIComponent(`Olá ${name}!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Parceiros</h1>
        <Button onClick={openDrawer}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Parceiro
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
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
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Comissão (%)</TableHead>
                <TableHead className="hidden lg:table-cell">Total Gerado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="p-0"><EmptyState icon={Users} title="Nenhum parceiro encontrado" body="Cadastre um parceiro ou ajuste os filtros." action={<Button onClick={openDrawer}><Plus className="mr-2 h-4 w-4" /> Novo Parceiro</Button>} /></TableCell></TableRow>
              ) : filtered.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell><Badge variant="outline">{TYPE_LABELS[partner.type]}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{partner.commission_rate != null ? `${partner.commission_rate}%` : '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{formatCurrency(0)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[partner.status]}>{STATUS_LABELS[partner.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openWhatsApp(partner.phone, partner.name)} title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                        <Link to={`/admin/parceiros/${partner.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Drawer
        open={drawerOpen}
        onOpenChange={handleDrawerChange}
        title="Novo parceiro"
        description="Cadastre imobiliárias, corretores e outros parceiros da rede."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-5 pb-4">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Identificação</h3>
            <div className="space-y-2">
              <Label>Nome completo / Razão social *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v as PartnerType, parent_partner_id: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v as PartnerStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Contato</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone/WhatsApp *</Label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="5511999999999" required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CRECI</Label>
                <Input value={form.creci} onChange={(e) => setForm(p => ({ ...p, creci: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Comissão padrão (%)</Label>
                <Input type="number" step="0.1" value={form.commission_rate} onChange={(e) => setForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="10" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Vínculo e presença</h3>
            {form.type === 'corretor_autonomo' ? (
              <div className="space-y-2">
                <Label>Imobiliária vinculada</Label>
                <Select value={form.parent_partner_id || 'none'} onValueChange={(v) => setForm(p => ({ ...p, parent_partner_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma imobiliária..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Imobiliária vinculada (texto livre)</Label>
                <Input value={form.affiliated_agency} onChange={(e) => setForm(p => ({ ...p, affiliated_agency: e.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Site / Portfólio</Label>
              <Input value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Contexto do relacionamento, condições comerciais..." rows={3} />
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => handleDrawerChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
