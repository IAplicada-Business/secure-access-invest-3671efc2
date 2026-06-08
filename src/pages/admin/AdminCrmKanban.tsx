import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, Instagram, Phone, Users, CalendarDays, HelpCircle, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PageHeader, KanbanBoard, type KanbanColumn, type KanbanCard } from '@/components/ui-system';

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
  incorporator: 'Incorporador',
  individual: 'Pessoa Física',
};

// Cor do badge de perfil (sem cor saturada gratuita).
const TYPE_BADGE: Record<string, string> = {
  investor: 'bg-brand-goldSoft/30 text-brand-goldDeep border-transparent',
  incorporator: 'bg-ink-700/10 text-ink-700 border-transparent',
  individual: 'bg-cream-200 text-ink-700 border-transparent',
};

// Ícone do canal de entrada (origin é texto livre por enquanto; canal_entrada
// estruturado chega no Prompt 6B).
function channelIcon(origin: string | null): LucideIcon {
  const o = (origin ?? '').toLowerCase();
  if (o.includes('instagram')) return Instagram;
  if (o.includes('indica')) return Users;
  if (o.includes('evento')) return CalendarDays;
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

  async function loadData() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar clientes'); setLoading(false); return; }
    const list: CrmClient[] = (data ?? []).map(c => ({
      ...c,
      crm_stage: c.crm_stage ?? 'contato',
    }));
    setClients(list);

    // Último contato = MAX(interaction_date) por cliente.
    const { data: interactions } = await supabase
      .from('client_interactions')
      .select('client_id, interaction_date')
      .order('interaction_date', { ascending: false });
    const map: Record<string, string> = {};
    interactions?.forEach(i => { if (!map[i.client_id]) map[i.client_id] = i.interaction_date; });
    setLastContact(map);
    setLoading(false);
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
        subtitle="Funil de vendas (Kanban). Arraste os cards entre as etapas."
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
            <SelectItem value="incorporator">Incorporador</SelectItem>
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

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map(s => (
            <div key={s.id} className="w-72 flex-shrink-0 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-cream-200" />
              <div className="h-24 animate-pulse rounded-ds-lg bg-cream-100" />
              <div className="h-24 animate-pulse rounded-ds-lg bg-cream-100" />
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          columns={STAGES}
          cards={cards}
          onMove={handleMove}
          emptyHint="Nenhum lead nesta etapa."
        />
      )}
    </div>
  );
}
