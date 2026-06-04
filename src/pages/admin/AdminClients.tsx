import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { Client, ClientType, ClientStatus, Partner } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Loader2, MessageCircle, Search, ExternalLink,
  Instagram, Phone, Users, CalendarDays, Globe, HelpCircle, Inbox, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PageHeader, DataTable, EmptyState, Drawer } from '@/components/ui-system';

const TYPE_LABELS: Record<ClientType, string> = {
  investor: 'Investidor', incorporator: 'Incorporador', individual: 'Pessoa Física',
};
const STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect', active: 'Ativo', completed: 'Concluído',
};
const STATUS_COLORS: Record<ClientStatus, string> = {
  prospect: 'bg-cream-200 text-ink-700', active: 'bg-brand-goldSoft/30 text-brand-goldDeep', completed: 'bg-semantic-success/15 text-semantic-success',
};

const CANAL: Record<string, { label: string; icon: LucideIcon }> = {
  instagram: { label: 'Instagram', icon: Instagram },
  indicacao: { label: 'Indicação', icon: Users },
  corretor: { label: 'Corretor', icon: Phone },
  evento: { label: 'Evento', icon: CalendarDays },
  organico: { label: 'Orgânico', icon: Globe },
  outro: { label: 'Outro', icon: HelpCircle },
};

// Campos novos (canal_entrada, cidade, drive_link, observacoes, tags) ainda não
// estão no types.ts gerado — o Lovable regenera após a migration. Tipo local + cast.
interface ClientExt extends Client {
  canal_entrada: string | null;
  canal_entrada_detalhe: string | null;
  cidade: string | null;
  drive_link: string | null;
  observacoes: string | null;
  tags: string[] | null;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

const emptyForm = {
  name: '', type: 'investor' as ClientType, cpf_cnpj: '', phone: '', email: '',
  cidade: '', canal_entrada: '', canal_entrada_detalhe: '',
  partner_id: '', partner_name: '', status: 'prospect' as ClientStatus,
  drive_link: '', tags: '', observacoes: '',
};

export default function AdminClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientExt[]>([]);
  const [partners, setPartners] = useState<Pick<Partner, 'id' | 'name'>[]>([]);
  const [lastContact, setLastContact] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCanal, setFilterCanal] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [form, setForm] = useState(emptyForm);

  async function loadClients() {
    const { data, error } = await supabase
      .from('clients').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar clientes'); setLoading(false); return; }
    setClients(data ?? []);

    const { data: interactions } = await supabase
      .from('client_interactions')
      .select('client_id, interaction_date')
      .order('interaction_date', { ascending: false });
    const map: Record<string, string> = {};
    interactions?.forEach(i => { if (!map[i.client_id]) map[i.client_id] = i.interaction_date; });
    setLastContact(map);
    setLoading(false);
  }

  async function loadPartners() {
    const { data } = await supabase.from('partners').select('id, name').eq('status', 'active').order('name');
    setPartners(data || []);
  }

  useEffect(() => { loadClients(); loadPartners(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const selectedPartner = partners.find(p => p.id === form.partner_id);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      type: form.type,
      cpf_cnpj: form.cpf_cnpj || null,
      phone: form.phone,
      email: form.email || null,
      cidade: form.cidade || null,
      canal_entrada: form.canal_entrada || null,
      canal_entrada_detalhe: form.canal_entrada_detalhe || null,
      origin: form.canal_entrada ? CANAL[form.canal_entrada]?.label : null,
      partner_id: form.partner_id || null,
      partner_name: selectedPartner ? selectedPartner.name : (form.partner_name || null),
      status: form.status,
      drive_link: form.drive_link || null,
      tags,
      observacoes: form.observacoes || null,
    };
    const { error } = await supabase.from('clients').insert(payload);
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
    toast.success('Cliente cadastrado!');
    setDrawerOpen(false);
    setForm(emptyForm);
    setSaving(false);
    loadClients();
  }

  const allTags = useMemo(
    () => [...new Set(clients.flatMap(c => c.tags ?? []))].sort(),
    [clients],
  );

  const filtered = useMemo(() => clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterCanal !== 'all' && c.canal_entrada !== filterCanal) return false;
    if (filterTag !== 'all' && !(c.tags ?? []).includes(filterTag)) return false;
    return true;
  }), [clients, search, filterType, filterStatus, filterCanal, filterTag]);

  function openWhatsApp(phone: string, name: string) {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${name}!`)}`, '_blank');
  }

  const columns: ColumnDef<ClientExt, unknown>[] = [
    {
      id: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-xs font-semibold text-brand-goldDeep">
              {initials(c.name) || '–'}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900">{c.name}</p>
              {c.cidade && <p className="truncate text-xs text-ink-300">{c.cidade}</p>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'canal',
      header: 'Canal',
      cell: ({ row }) => {
        const canal = row.original.canal_entrada;
        if (!canal) return <span className="text-ink-300">—</span>;
        const Icon = CANAL[canal]?.icon ?? HelpCircle;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-700">
            <Icon className="h-3.5 w-3.5 text-brand-goldDeep" />
            {CANAL[canal]?.label ?? canal}
          </span>
        );
      },
    },
    {
      id: 'perfil',
      header: 'Perfil',
      cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type]}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_COLORS[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>,
    },
    {
      id: 'drive',
      header: 'Drive',
      cell: ({ row }) => row.original.drive_link
        ? (
          <a
            href={row.original.drive_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-sm text-brand-goldDeep hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> abrir
          </a>
        )
        : <span className="text-ink-300">—</span>,
    },
    {
      id: 'contato',
      header: 'Último contato',
      cell: ({ row }) => {
        const c = lastContact[row.original.id] ?? row.original.created_at;
        return <span className="text-sm text-ink-300">{c ? formatDistanceToNow(new Date(c), { addSuffix: true, locale: ptBR }) : '—'}</span>;
      },
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => openWhatsApp(row.original.phone, row.original.name)} title="WhatsApp">
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader
        title="Clientes"
        subtitle="Organize seus clientes — origem, link do Drive, tags e contato."
        actions={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="investor">Investidor</SelectItem>
            <SelectItem value="incorporator">Incorporador</SelectItem>
            <SelectItem value="individual">Pessoa Física</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {Object.entries(CANAL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(c) => navigate(`/admin/clientes/${c.id}`)}
        empty={
          <EmptyState
            icon={Inbox}
            title="Nenhum cliente encontrado"
            body="Cadastre o primeiro cliente ou ajuste os filtros."
            action={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>}
          />
        }
      />

      {/* Create Client Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Novo Cliente" className="w-full overflow-y-auto sm:max-w-md">
        <form onSubmit={handleCreate} className="space-y-5 pb-4">
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Identificação</h3>
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Perfil *</Label>
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
          </section>

          {/* Contato */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Contato</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone/WhatsApp *</Label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="5511999999999" required />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => setForm(p => ({ ...p, cidade: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </section>

          {/* Origem */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Origem</h3>
            <div className="space-y-2">
              <Label>Canal de entrada</Label>
              <Select value={form.canal_entrada || 'none'} onValueChange={(v) => setForm(p => ({ ...p, canal_entrada: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {Object.entries(CANAL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhe do canal</Label>
              <Input value={form.canal_entrada_detalhe} onChange={(e) => setForm(p => ({ ...p, canal_entrada_detalhe: e.target.value }))} placeholder="Ex: quem indicou, qual evento..." />
            </div>
            <div className="space-y-2">
              <Label>Indicado por (parceiro)</Label>
              <Select value={form.partner_id || 'none'} onValueChange={(v) => setForm(p => ({ ...p, partner_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum / Texto livre</SelectItem>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(!form.partner_id || form.partner_id === 'none') && (
              <div className="space-y-2">
                <Label>Parceiro (texto livre)</Label>
                <Input value={form.partner_name} onChange={(e) => setForm(p => ({ ...p, partner_name: e.target.value }))} placeholder="Nome de quem indicou (se não cadastrado)" />
              </div>
            )}
          </section>

          {/* Organização */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Organização</h3>
            <div className="space-y-2">
              <Label>Link do Drive</Label>
              <Input value={form.drive_link} onChange={(e) => setForm(p => ({ ...p, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="vip, recorrente, são paulo" />
            </div>
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
              <Textarea value={form.observacoes} onChange={(e) => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Contexto relevante sobre o cliente..." rows={3} />
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
