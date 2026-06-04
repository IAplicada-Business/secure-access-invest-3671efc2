import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader, DataTable, EmptyState } from '@/components/ui-system';

const STATUS_LABELS: Record<string, string> = {
  nova: 'Nova', em_analise: 'Em Análise', proposta_enviada: 'Proposta Enviada',
  em_execucao: 'Em Execução', concluida: 'Concluída', arquivada: 'Arquivada',
};
const STATUS_COLORS: Record<string, string> = {
  nova: 'bg-semantic-info/15 text-semantic-info',
  em_analise: 'bg-semantic-warning/15 text-semantic-warning',
  proposta_enviada: 'bg-brand-goldSoft/30 text-brand-goldDeep',
  em_execucao: 'bg-brand-gold/15 text-brand-goldDeep',
  concluida: 'bg-semantic-success/15 text-semantic-success',
  arquivada: 'bg-cream-200 text-ink-500',
};
const CLOSED = ['concluida', 'arquivada'];

interface RegRow {
  id: string;
  title: string;
  address: string | null;
  status: string;
  created_at: string;
  client_id: string | null;
  type_id: string | null;
  clients: { name: string } | null;
  regularization_types: { name: string } | null;
}

export default function AdminRegularizacoes() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RegRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');

  async function load() {
    const { data, error } = await supabase
      .from('regularization_processes')
      .select('id, title, address, status, created_at, client_id, type_id, clients(name), regularization_types(name)')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar regularizações'); setLoading(false); return; }
    setRows((data ?? []) as unknown as RegRow[]);

    const [{ data: cs }, { data: ts }] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('regularization_types').select('id, name').order('name'),
    ]);
    setClients(cs ?? []);
    setTypes(ts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterClient !== 'all' && r.client_id !== filterClient) return false;
    if (filterType !== 'all' && r.type_id !== filterType) return false;
    return true;
  }), [rows, filterStatus, filterClient, filterType]);

  const columns: ColumnDef<RegRow, unknown>[] = [
    {
      id: 'ativo',
      header: 'Ativo',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.original.title}</p>
          {row.original.address && <p className="truncate text-xs text-ink-300">{row.original.address}</p>}
        </div>
      ),
    },
    { id: 'cliente', header: 'Cliente', cell: ({ row }) => row.original.clients?.name ?? <span className="text-ink-300">—</span> },
    { id: 'tipo', header: 'Tipo', cell: ({ row }) => row.original.regularization_types?.name ?? <span className="text-ink-300">—</span> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_COLORS[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'criado',
      header: 'Criado',
      cell: ({ row }) => <span className="text-sm text-ink-300">{formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true, locale: ptBR })}</span>,
    },
    {
      id: 'dias',
      header: 'Dias em aberto',
      cell: ({ row }) => {
        if (CLOSED.includes(row.original.status)) return <span className="text-ink-300">—</span>;
        const d = differenceInCalendarDays(new Date(), new Date(row.original.created_at));
        return <span className={`font-ds-mono text-sm ${d > 7 ? 'text-semantic-warning' : 'text-ink-700'}`}>{d}d</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader title="Regularizações" subtitle="Todos os processos de regularização em um só lugar." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(r) => navigate(`/admin/regularizacoes/${r.id}`)}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma regularização"
            body="Os processos criados a partir do perfil do cliente aparecem aqui."
          />
        }
      />
    </div>
  );
}
