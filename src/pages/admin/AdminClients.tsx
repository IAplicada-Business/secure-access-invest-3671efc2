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
  Plus, Loader2, MessageCircle, Search, ExternalLink, Trash2, Pencil,
  Share2, Phone, Users, CalendarDays, Globe, HelpCircle, Inbox, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader, DataTable, EmptyState, Drawer } from '@/components/ui-system';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CRM_STAGE_LABELS,
  contactRelation,
  relationLabel,
  RELATION_BADGE,
  type ContactRelation,
} from '@/lib/contacts';

const TYPE_LABELS: Record<ClientType, string> = {
  investor: 'Investidor', incorporator: 'Regularização', individual: 'Pessoa Física',
};

const CANAL: Record<string, { label: string; icon: LucideIcon }> = {
  redes_sociais: { label: 'Redes sociais', icon: Share2 },
  indicacao: { label: 'Indicação', icon: Users },
  corretor: { label: 'Corretor', icon: Phone },
  evento: { label: 'Evento', icon: CalendarDays },
  organico: { label: 'Orgânico', icon: Globe },
  outro: { label: 'Outro', icon: HelpCircle },
};

const STAGE_OPTIONS = Object.entries(CRM_STAGE_LABELS);

interface ContactRow extends Client {
  canal_entrada: string | null;
  canal_entrada_detalhe: string | null;
  cidade: string | null;
  drive_link: string | null;
  observacoes: string | null;
  tags: string[] | null;
  crm_stage: string | null;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

const emptyForm = {
  name: '', type: 'investor' as ClientType, cpf_cnpj: '', cnpj: '', phone: '', email: '',
  data_nascimento: '', endereco: '', cidade: '', canal_entrada: '', canal_entrada_detalhe: '',
  partner_id: '', partner_name: '', relation: 'lead' as ContactRelation,
  drive_link: '', tags: '', observacoes: '',
};

function relationToStatus(relation: ContactRelation): ClientStatus {
  return relation === 'client' ? 'active' : 'prospect';
}

export default function AdminClients() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [partners, setPartners] = useState<Pick<Partner, 'id' | 'name'>[]>([]);
  const [lastContact, setLastContact] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRelation, setFilterRelation] = useState<'all' | ContactRelation>('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterCanal, setFilterCanal] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [filterTag, setFilterTag] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadContacts() {
    const { data, error } = await supabase
      .from('clients').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar contatos'); setLoading(false); return; }
    setContacts((data ?? []) as ContactRow[]);

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

  useEffect(() => { loadContacts(); loadPartners(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const selectedPartner = partners.find(p => p.id === form.partner_id);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const status = relationToStatus(form.relation);
    const payload = {
      name: form.name,
      type: form.type,
      cpf_cnpj: form.cpf_cnpj || null,
      cnpj: form.cnpj || null,
      phone: form.phone,
      email: form.email || null,
      data_nascimento: form.data_nascimento || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      canal_entrada: form.canal_entrada || null,
      canal_entrada_detalhe: form.canal_entrada_detalhe || null,
      origin: form.canal_entrada ? CANAL[form.canal_entrada]?.label : null,
      partner_id: form.partner_id || null,
      partner_name: selectedPartner ? selectedPartner.name : (form.partner_name || null),
      status,
      crm_stage: form.relation === 'client' ? 'fechamento' : 'contato',
      drive_link: form.drive_link || null,
      tags,
      observacoes: form.observacoes || null,
    };
    const { error } = await supabase.from('clients').insert(payload);
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
    toast.success(form.relation === 'client' ? 'Cliente cadastrado!' : 'Lead cadastrado!');
    setDrawerOpen(false);
    setForm(emptyForm);
    setSaving(false);
    loadContacts();
  }

  async function handleDeleteContact() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success(`"${deleteTarget.name}" excluído.`);
    setDeleteTarget(null);
    loadContacts();
  }

  const allTags = useMemo(
    () => [...new Set(contacts.flatMap(c => c.tags ?? []))].sort(),
    [contacts],
  );

  const counts = useMemo(() => {
    let leads = 0;
    let clients = 0;
    for (const c of contacts) {
      if (contactRelation(c.status) === 'client') clients += 1;
      else leads += 1;
    }
    return { leads, clients, total: contacts.length };
  }, [contacts]);

  const filtered = useMemo(() => {
    const cutoff = filterPeriod === 'all'
      ? null
      : subDays(new Date(), filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90);

    return contacts.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRelation !== 'all' && contactRelation(c.status) !== filterRelation) return false;
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (filterStage !== 'all' && (c.crm_stage ?? 'contato') !== filterStage) return false;
      if (filterCanal !== 'all' && c.canal_entrada !== filterCanal) return false;
      if (filterTag !== 'all' && !(c.tags ?? []).includes(filterTag)) return false;
      if (cutoff && new Date(c.created_at) < cutoff) return false;
      return true;
    });
  }, [contacts, search, filterRelation, filterType, filterStage, filterCanal, filterTag, filterPeriod]);

  function openWhatsApp(phone: string, name: string) {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${name}!`)}`, '_blank');
  }

  const columns: ColumnDef<ContactRow, unknown>[] = [
    {
      id: 'contato',
      header: 'Contato',
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
      id: 'relacao',
      header: 'Relação',
      cell: ({ row }) => {
        const rel = contactRelation(row.original.status);
        return <Badge className={RELATION_BADGE[rel]}>{relationLabel(row.original.status)}</Badge>;
      },
    },
    {
      id: 'etapa',
      header: 'Etapa no funil',
      cell: ({ row }) => {
        const stage = row.original.crm_stage ?? 'contato';
        return (
          <span className="text-sm text-ink-700">
            {CRM_STAGE_LABELS[stage] ?? stage}
          </span>
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
      id: 'entrada',
      header: 'Entrada',
      cell: ({ row }) => (
        <span className="text-sm text-ink-300">
          {format(new Date(row.original.created_at), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      id: 'ultimo',
      header: 'Último contato',
      cell: ({ row }) => {
        const c = lastContact[row.original.id] ?? row.original.created_at;
        return (
          <span className="text-sm text-ink-300">
            {c ? formatDistanceToNow(new Date(c), { addSuffix: true, locale: ptBR }) : '—'}
          </span>
        );
      },
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
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/contatos/${row.original.id}`)}
            title="Abrir / editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openWhatsApp(row.original.phone, row.original.name)} title="WhatsApp">
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row.original)}
            title="Excluir contato"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader
        title="Contatos"
        subtitle="Leads e clientes em uma só base — filtre por relação, funil, canal e período."
        actions={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo contato</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterRelation('all')}
          className={`rounded-ds-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterRelation === 'all'
              ? 'border-ink-900 bg-ink-900 text-white'
              : 'border-cream-200 bg-white text-ink-700 hover:border-brand-gold'
          }`}
        >
          Todos · {counts.total}
        </button>
        <button
          type="button"
          onClick={() => setFilterRelation('lead')}
          className={`rounded-ds-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterRelation === 'lead'
              ? 'border-ink-900 bg-ink-900 text-white'
              : 'border-cream-200 bg-white text-ink-700 hover:border-brand-gold'
          }`}
        >
          Leads · {counts.leads}
        </button>
        <button
          type="button"
          onClick={() => setFilterRelation('client')}
          className={`rounded-ds-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterRelation === 'client'
              ? 'border-ink-900 bg-ink-900 text-white'
              : 'border-cream-200 bg-white text-ink-700 hover:border-brand-gold'
          }`}
        >
          Clientes · {counts.clients}
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="investor">Investidor</SelectItem>
            <SelectItem value="incorporator">Regularização</SelectItem>
            <SelectItem value="individual">Pessoa Física</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {STAGE_OPTIONS.map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {Object.entries(CANAL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as typeof filterPeriod)}>
          <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
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
        onRowClick={(c) => navigate(`/admin/contatos/${c.id}`)}
        empty={
          <EmptyState
            icon={Inbox}
            title="Nenhum contato encontrado"
            body="Cadastre um lead ou cliente, ou ajuste os filtros."
            action={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo contato</Button>}
          />
        }
      />

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Novo contato"
        description="Lead entra no funil; cliente já está avançado no negócio."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-5 pb-4">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Relação</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, relation: 'lead' }))}
                className={`rounded-ds-md border px-3 py-3 text-left transition-colors ${
                  form.relation === 'lead'
                    ? 'border-brand-gold bg-brand-goldSoft/20'
                    : 'border-cream-200 hover:border-brand-gold/50'
                }`}
              >
                <p className="text-sm font-medium text-ink-900">Lead</p>
                <p className="mt-0.5 text-[11px] text-ink-300">Entra no pipeline (etapa Contato)</p>
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, relation: 'client' }))}
                className={`rounded-ds-md border px-3 py-3 text-left transition-colors ${
                  form.relation === 'client'
                    ? 'border-brand-gold bg-brand-goldSoft/20'
                    : 'border-cream-200 hover:border-brand-gold/50'
                }`}
              >
                <p className="text-sm font-medium text-ink-900">Cliente</p>
                <p className="mt-0.5 text-[11px] text-ink-300">Já convertido / em fechamento</p>
              </button>
            </div>
          </section>

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
                    <SelectItem value="incorporator">Regularização</SelectItem>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm(p => ({ ...p, cpf_cnpj: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CNPJ (opcional)</Label>
                <Input value={form.cnpj} onChange={(e) => setForm(p => ({ ...p, cnpj: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Aniversário</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => setForm(p => ({ ...p, data_nascimento: e.target.value }))} />
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
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro" />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm(p => ({ ...p, cidade: e.target.value }))} />
            </div>
          </section>

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
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Contexto relevante sobre o contato..." rows={3} />
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar</Button>
          </div>
        </form>
      </Drawer>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove permanentemente <strong>{deleteTarget?.name}</strong> e os dados vinculados
              (documentos, interações, histórico do funil). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
