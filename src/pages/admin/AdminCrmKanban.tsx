import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader, KanbanBoard, type KanbanColumn, type KanbanCard } from '@/components/ui-system';

// ⚠️ Etapas DEFAULT (provisórias) — alinhar com o funil que a Juliê usa.
type CrmStage =
  | 'lead_recebido'
  | 'primeiro_contato'
  | 'reuniao_agendada'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado'
  | 'perdido';

const STAGES: KanbanColumn[] = [
  { id: 'lead_recebido', title: 'Lead recebido' },
  { id: 'primeiro_contato', title: 'Primeiro contato' },
  { id: 'reuniao_agendada', title: 'Reunião agendada' },
  { id: 'proposta_enviada', title: 'Proposta enviada' },
  { id: 'negociacao', title: 'Negociação' },
  { id: 'fechado', title: 'Fechado', accentClassName: 'bg-brand-goldSoft/20' },
  { id: 'perdido', title: 'Perdido', accentClassName: 'bg-ink-300/10' },
];

const TYPE_LABELS: Record<string, string> = {
  investor: 'Investidor',
  incorporator: 'Incorporador',
  individual: 'Pessoa Física',
};

// Tipo local: clients.crm_stage ainda não está no types.ts gerado (o Lovable
// regenera após a migration). Por isso a query usa select('*') + cast pontual.
interface CrmClient {
  id: string;
  name: string;
  type: string;
  phone: string;
  partner_name: string | null;
  created_at: string;
  crm_stage: CrmStage;
}

export default function AdminCrmKanban() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  async function loadClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar clientes'); setLoading(false); return; }
    setClients(((data ?? []) as unknown as CrmClient[]).map(c => ({
      ...c,
      crm_stage: (c.crm_stage ?? 'lead_recebido') as CrmStage,
    })));
    setLoading(false);
  }

  useEffect(() => { loadClients(); }, []);

  async function handleMove(cardId: string, toColumnId: string) {
    const prev = clients;
    // Atualização otimista
    setClients(cs => cs.map(c => (c.id === cardId ? { ...c, crm_stage: toColumnId as CrmStage } : c)));
    const { error } = await supabase
      .from('clients')
      // crm_stage ainda não está no tipo Update gerado — cast pontual.
      .update({ crm_stage: toColumnId } as never)
      .eq('id', cardId);
    if (error) {
      setClients(prev); // rollback
      toast.error('Erro ao mover: ' + error.message);
      return;
    }
    const stage = STAGES.find(s => s.id === toColumnId);
    toast.success(`Movido para "${stage?.title ?? toColumnId}"`);
  }

  const filtered = useMemo(() => clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  }), [clients, search, filterType]);

  const cards: KanbanCard[] = filtered.map(c => ({
    id: c.id,
    columnId: c.crm_stage,
    content: (
      <button
        type="button"
        onClick={() => navigate(`/admin/clientes/${c.id}`)}
        className="flex w-full flex-col gap-1.5 text-left"
      >
        <span className="font-ds-display text-sm font-medium text-ink-900">{c.name}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[c.type] ?? c.type}</Badge>
        </div>
        <span className="text-xs text-ink-300">
          {c.created_at
            ? `cadastrado ${formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}`
            : ''}
        </span>
      </button>
    ),
  }));

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader
        title="CRM"
        subtitle="Funil de clientes (Kanban). Arraste os cards entre as etapas."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="investor">Investidor</SelectItem>
            <SelectItem value="incorporator">Incorporador</SelectItem>
            <SelectItem value="individual">Pessoa Física</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <KanbanBoard columns={STAGES} cards={cards} onMove={handleMove} />
      )}
    </div>
  );
}
