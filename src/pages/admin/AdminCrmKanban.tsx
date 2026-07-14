import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, Share2, Phone, Users, CalendarDays, Globe, HelpCircle, Plus, Columns3, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PageHeader, KanbanBoard, Drawer, type KanbanColumn, type KanbanCard } from '@/components/ui-system';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

const HIDDEN_STAGES_KEY = 'crm_hidden_stages';

function loadHiddenStages(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_STAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveHiddenStages(ids: string[]) {
  localStorage.setItem(HIDDEN_STAGES_KEY, JSON.stringify(ids));
}

// Canais de entrada (como o lead chegou).
const CANAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'redes_sociais', label: 'Redes sociais' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'corretor', label: 'Corretor' },
  { value: 'evento', label: 'Evento' },
  { value: 'organico', label: 'Orgânico' },
  { value: 'outro', label: 'Outro' },
];
const CANAL_LABEL: Record<string, string> = Object.fromEntries(CANAL_OPTIONS.map(c => [c.value, c.label]));

// Etapas do funil de vendas:
//   Contato · Agendar reunião · Envio de proposta · Follow Up ·
//   Fechamento · Aguardando pagamento  (+ Perdido, lateral)
type CrmStage =
  | 'contato'
  | 'agendar_reuniao'
  | 'envio_proposta'
  | 'follow_up'
  | 'fechamento'
  | 'aguardando_pagamento'
  | 'perdido';

const STAGES: KanbanColumn[] = [
  { id: 'contato', title: 'Contato', accentClassName: 'bg-cream-50' },
  { id: 'agendar_reuniao', title: 'Agendar reunião' },
  { id: 'envio_proposta', title: 'Envio de proposta' },
  { id: 'follow_up', title: 'Follow Up' },
  { id: 'fechamento', title: 'Fechamento', accentClassName: 'bg-brand-goldSoft/20' },
  { id: 'aguardando_pagamento', title: 'Aguardando pagamento', accentClassName: 'bg-brand-goldSoft/30 border-t-2 border-brand-gold/50' },
  { id: 'perdido', title: 'Perdido', accentClassName: 'bg-ink-300/10' },
];

const TYPE_LABELS: Record<string, string> = {
  investor: 'Investidor',
  incorporator: 'Regularização',
  individual: 'Pessoa Física',
};

// Cor do badge de perfil (sem cor saturada gratuita).
const TYPE_BADGE: Record<string, string> = {
  investor: 'bg-brand-goldSoft/30 text-brand-goldDeep border-transparent',
  incorporator: 'bg-ink-700/10 text-ink-700 border-transparent',
  individual: 'bg-cream-200 text-ink-700 border-transparent',
};

// Ícone do canal de entrada.
function channelIcon(origin: string | null): LucideIcon {
  const o = (origin ?? '').toLowerCase();
  if (o.includes('rede') || o.includes('instagram') || o.includes('social')) return Share2;
  if (o.includes('indica')) return Users;
  if (o.includes('evento')) return CalendarDays;
  if (o.includes('organic') || o.includes('orgânic')) return Globe;
  if (o.includes('corretor') || o.includes('telefone') || o.includes('ligacao')) return Phone;
  return HelpCircle;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

interface CrmClient {
  id: string;
  name: string;
  type: string;
  origin: string | null;
  created_at: string;
  crm_stage: CrmStage;
}

export default function AdminCrmKanban() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [lastContact, setLastContact] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [hiddenStages, setHiddenStages] = useState<string[]>(() => loadHiddenStages());

  // Novo lead
  const emptyLead = {
    name: '', type: 'investor', cpf_cnpj: '', cnpj: '', phone: '', email: '',
    data_nascimento: '', endereco: '', cidade: '', canal_entrada: '', canal_entrada_detalhe: '', partner_id: '',
  };
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState(emptyLead);
  const [leadSaving, setLeadSaving] = useState(false);

  function setStageHidden(stageId: string, hidden: boolean) {
    setHiddenStages(prev => {
      const next = hidden
        ? [...new Set([...prev, stageId])]
        : prev.filter(id => id !== stageId);
      // Nunca ocultar todas — pelo menos uma etapa visível.
      if (hidden && next.length >= STAGES.length) {
        toast.error('Mantenha ao menos uma etapa visível no funil.');
        return prev;
      }
      saveHiddenStages(next);
      return next;
    });
  }

  function hideStage(stageId: string) {
    if (hiddenStages.length >= STAGES.length - 1) {
      toast.error('Mantenha ao menos uma etapa visível no funil.');
      return;
    }
    const count = clients.filter(c => c.crm_stage === stageId).length;
    setStageHidden(stageId, true);
    const stage = STAGES.find(s => s.id === stageId);
    toast.message(
      count > 0
        ? `"${stage?.title}" ocultada (${count} lead${count === 1 ? '' : 's'} nesta etapa).`
        : `"${stage?.title}" ocultada.`,
    );
  }

  function showStage(stageId: string) {
    setStageHidden(stageId, false);
  }

  function showAllStages() {
    setHiddenStages([]);
    saveHiddenStages([]);
  }

  async function loadData() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar clientes'); setLoading(false); return; }
    const list: CrmClient[] = (data ?? []).map(c => ({
      ...c,
      crm_stage: (c.crm_stage ?? 'contato') as CrmStage,
    })) as CrmClient[];
    setClients(list);

    // Último contato = MAX(interaction_date) por cliente.
    const { data: interactions } = await supabase
      .from('client_interactions')
      .select('client_id, interaction_date')
      .order('interaction_date', { ascending: false });
    const map: Record<string, string> = {};
    interactions?.forEach(i => { if (!map[i.client_id]) map[i.client_id] = i.interaction_date; });
    setLastContact(map);

    const { data: ps } = await supabase.from('partners').select('id, name').eq('status', 'active').order('name');
    setPartners(ps ?? []);
    setLoading(false);
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!lead.name.trim() || !lead.phone.trim()) {
      toast.error('Informe ao menos nome e telefone.');
      return;
    }
    setLeadSaving(true);
    const selectedPartner = partners.find(p => p.id === lead.partner_id);
    const { error } = await supabase.from('clients').insert({
      name: lead.name.trim(),
      type: lead.type as 'investor' | 'incorporator' | 'individual',
      cpf_cnpj: lead.cpf_cnpj || null,
      cnpj: lead.cnpj || null,
      phone: lead.phone.trim(),
      email: lead.email || null,
      data_nascimento: lead.data_nascimento || null,
      endereco: lead.endereco || null,
      cidade: lead.cidade || null,
      canal_entrada: lead.canal_entrada || null,
      canal_entrada_detalhe: lead.canal_entrada_detalhe || null,
      origin: lead.canal_entrada ? CANAL_LABEL[lead.canal_entrada] : null,
      partner_id: lead.partner_id || null,
      partner_name: selectedPartner ? selectedPartner.name : null,
      crm_stage: 'contato',
      status: 'prospect',
    });
    setLeadSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Lead cadastrado em "Contato"!');
    setLeadOpen(false);
    setLead(emptyLead);
    loadData();
  }

  useEffect(() => { loadData(); }, []);

  // Atalho global Cmd/Ctrl+K → foca a busca.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleMove(cardId: string, toColumnId: string) {
    const prev = clients;
    setClients(cs => cs.map(c => (c.id === cardId ? { ...c, crm_stage: toColumnId as CrmStage } : c)));
    const { error } = await supabase
      .from('clients')
      .update({ crm_stage: toColumnId as CrmStage })
      .eq('id', cardId);
    if (error) {
      setClients(prev);
      toast.error('Erro ao mover: ' + error.message);
      return;
    }
    const stage = STAGES.find(s => s.id === toColumnId);
    toast.success(`Movido para "${stage?.title ?? toColumnId}"`);
  }

  const channels = useMemo(
    () => [...new Set(clients.map(c => c.origin).filter(Boolean))] as string[],
    [clients],
  );

  const filtered = useMemo(() => clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterChannel !== 'all' && c.origin !== filterChannel) return false;
    return true;
  }), [clients, search, filterType, filterChannel]);

  const visibleStages = useMemo(
    () => STAGES.filter(s => !hiddenStages.includes(s.id)),
    [hiddenStages],
  );

  const hiddenStageMeta = useMemo(
    () => STAGES
      .filter(s => hiddenStages.includes(s.id))
      .map(s => ({
        ...s,
        count: filtered.filter(c => c.crm_stage === s.id).length,
      })),
    [hiddenStages, filtered],
  );

  const cards: KanbanCard[] = filtered.map(c => {
    const ChannelIcon = channelIcon(c.origin);
    const contact = lastContact[c.id] ?? c.created_at;
    return {
      id: c.id,
      columnId: c.crm_stage,
      content: (
        <button
          type="button"
          onClick={() => navigate(`/admin/clientes/${c.id}`)}
          className="flex w-full items-start gap-3 text-left"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-xs font-semibold text-brand-goldDeep">
            {initials(c.name) || '–'}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-ds-display text-[15px] font-medium leading-tight text-ink-900">{c.name}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={cn('text-[10px]', TYPE_BADGE[c.type] ?? 'bg-cream-200 text-ink-700 border-transparent')}>
                {TYPE_LABELS[c.type] ?? c.type}
              </Badge>
              {c.origin && (
                <span className="inline-flex items-center gap-1 text-[10px] text-ink-300">
                  <ChannelIcon className="h-3 w-3" />
                  {c.origin}
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-300">
              {contact
                ? `contato ${formatDistanceToNow(new Date(contact), { addSuffix: true, locale: ptBR })}`
                : 'sem contato'}
            </p>
          </div>
        </button>
      ),
    };
  });

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader
        title="CRM"
        subtitle="Funil de vendas (Kanban). Arraste os cards entre as etapas. Oculte as que não estiver usando."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Columns3 className="mr-2 h-4 w-4" />
                  Etapas
                  {hiddenStages.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {hiddenStages.length} ocultas
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-900">Etapas do funil</p>
                  {hiddenStages.length > 0 && (
                    <button
                      type="button"
                      onClick={showAllStages}
                      className="text-xs text-brand-goldDeep hover:underline"
                    >
                      Mostrar todas
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {STAGES.map(stage => {
                    const count = clients.filter(c => c.crm_stage === stage.id).length;
                    const visible = !hiddenStages.includes(stage.id);
                    return (
                      <div
                        key={stage.id}
                        className="flex items-center justify-between gap-3 rounded-ds-md border border-cream-200 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{stage.title}</p>
                          <p className="text-[11px] text-ink-300">
                            {count} lead{count === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {visible ? (
                            <Eye className="h-3.5 w-3.5 text-ink-300" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-ink-300" />
                          )}
                          <Switch
                            checked={visible}
                            onCheckedChange={(checked) => setStageHidden(stage.id, !checked)}
                            aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${stage.title}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={() => setLeadOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo lead</Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Buscar por nome…  (⌘K / Ctrl+K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="investor">Investidor</SelectItem>
            <SelectItem value="incorporator">Regularização</SelectItem>
            <SelectItem value="individual">Pessoa Física</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Canal de entrada" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {channels.map(ch => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {hiddenStageMeta.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-ds-lg border border-cream-200 bg-cream-50 px-3 py-2">
          <span className="text-xs font-medium text-ink-500">Etapas ocultas:</span>
          {hiddenStageMeta.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => showStage(s.id)}
              className="inline-flex items-center gap-1.5 rounded-ds-pill border border-cream-200 bg-white px-2.5 py-1 text-xs text-ink-700 transition-colors hover:border-brand-gold hover:text-brand-goldDeep"
              title={`Mostrar "${s.title}"`}
            >
              <EyeOff className="h-3 w-3 text-ink-300" />
              {s.title}
              <span className="font-ds-mono text-ink-300">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {visibleStages.map(s => (
            <div key={s.id} className="w-72 flex-shrink-0 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-cream-200" />
              <div className="h-24 animate-pulse rounded-ds-lg bg-cream-100" />
              <div className="h-24 animate-pulse rounded-ds-lg bg-cream-100" />
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          columns={visibleStages}
          cards={cards}
          onMove={handleMove}
          onHideColumn={hideStage}
          emptyHint="Nenhum lead nesta etapa."
          columnMinHeight="min-h-[calc(100vh-20rem)]"
        />
      )}

      {/* Novo lead */}
      <Drawer open={leadOpen} onOpenChange={setLeadOpen} title="Novo lead" description="Cadastra um lead direto na etapa Contato." className="w-full overflow-y-auto sm:max-w-md">
        <form onSubmit={handleCreateLead} className="space-y-4 pb-4">
          <div className="space-y-2"><Label>Nome *</Label><Input value={lead.name} onChange={(e) => setLead(p => ({ ...p, name: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={lead.type} onValueChange={(v) => setLead(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="investor">Investidor</SelectItem>
                  <SelectItem value="incorporator">Regularização</SelectItem>
                  <SelectItem value="individual">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>CPF</Label><Input value={lead.cpf_cnpj} onChange={(e) => setLead(p => ({ ...p, cpf_cnpj: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>CNPJ (opcional)</Label><Input value={lead.cnpj} onChange={(e) => setLead(p => ({ ...p, cnpj: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Aniversário</Label><Input type="date" value={lead.data_nascimento} onChange={(e) => setLead(p => ({ ...p, data_nascimento: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Telefone/WhatsApp *</Label><Input value={lead.phone} onChange={(e) => setLead(p => ({ ...p, phone: e.target.value }))} placeholder="5511999999999" required /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={lead.email} onChange={(e) => setLead(p => ({ ...p, email: e.target.value }))} /></div>
          </div>
          <div className="space-y-2"><Label>Endereço</Label><Input value={lead.endereco} onChange={(e) => setLead(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro" /></div>
          <div className="space-y-2"><Label>Cidade</Label><Input value={lead.cidade} onChange={(e) => setLead(p => ({ ...p, cidade: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Como chegou até mim</Label>
            <Select value={lead.canal_entrada || 'none'} onValueChange={(v) => setLead(p => ({ ...p, canal_entrada: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                {CANAL_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(lead.canal_entrada === 'indicacao' || lead.canal_entrada === 'corretor') && (
            <div className="space-y-2">
              <Label>Imobiliária / parceiro que indicou</Label>
              <Select value={lead.partner_id || 'none'} onValueChange={(v) => setLead(p => ({ ...p, partner_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2"><Label>Detalhe (opcional)</Label><Input value={lead.canal_entrada_detalhe} onChange={(e) => setLead(p => ({ ...p, canal_entrada_detalhe: e.target.value }))} placeholder="Ex: quem indicou, qual evento…" /></div>
          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setLeadOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={leadSaving}>{leadSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar lead</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
