import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Building2, Inbox, TrendingUp, Users, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PageHeader,
  StatCard,
  EmptyState,
  DataTable,
  KanbanBoard,
  TimelineItem,
  Drawer,
  type KanbanColumn,
  type KanbanCard,
} from '@/components/ui-system';

interface DemoRow {
  name: string;
  city: string;
  value: number;
}

const demoRows: DemoRow[] = [
  { name: 'Ana Souza', city: 'São Paulo', value: 125000 },
  { name: 'Bruno Lima', city: 'Campinas', value: 84000 },
  { name: 'Carla Dias', city: 'Santos', value: 210000 },
];

const demoColumns: ColumnDef<DemoRow, unknown>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'city', header: 'Cidade' },
  {
    accessorKey: 'value',
    header: 'Valor',
    cell: ({ row }) => (
      <span className="font-ds-mono tabular-nums">
        {row.original.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    ),
  },
];

const kanbanColumns: KanbanColumn[] = [
  { id: 'novo', title: 'Novo lead' },
  { id: 'negociacao', title: 'Em negociação' },
  { id: 'fechado', title: 'Fechado', accentClassName: 'bg-brand-goldSoft/20' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-ds-display text-xl font-medium text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Galeria do Design System — oculta no menu, acessível via /admin/design-system.
 * Mostra cada componente em seus estados (default, loading, empty).
 */
export default function AdminDesignSystem() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cards, setCards] = useState<KanbanCard[]>([
    { id: '1', columnId: 'novo', content: <span className="text-sm font-medium text-ink-900">Ana Souza</span> },
    { id: '2', columnId: 'novo', content: <span className="text-sm font-medium text-ink-900">Bruno Lima</span> },
    { id: '3', columnId: 'negociacao', content: <span className="text-sm font-medium text-ink-900">Carla Dias</span> },
  ]);

  function move(cardId: string, toColumnId: string) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, columnId: toColumnId } : c)));
  }

  return (
    <div className="space-y-10 font-ds-body">
      <PageHeader
        title="Design System"
        subtitle="Galeria dos componentes-padrão (Tijolo em Capital). Oculta no menu."
        actions={<Button onClick={() => setDrawerOpen(true)}>Abrir Drawer</Button>}
      />

      <Section title="StatCard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Recebido no mês" value="R$ 42.300" delta={12} icon={TrendingUp} />
          <StatCard label="A receber" value="R$ 18.900" delta={-4} icon={Clock} />
          <StatCard label="Imóveis" value="37" icon={Building2} />
          <StatCard label="Carregando" value="" loading icon={Users} />
        </div>
      </Section>

      <Section title="DataTable">
        <DataTable columns={demoColumns} data={demoRows} />
      </Section>

      <Section title="DataTable — loading / empty">
        <div className="grid gap-6 lg:grid-cols-2">
          <DataTable columns={demoColumns} data={[]} loading />
          <DataTable
            columns={demoColumns}
            data={[]}
            empty={
              <EmptyState
                icon={Inbox}
                title="Nenhum registro"
                body="Cadastre o primeiro item para vê-lo aqui."
                action={<Button size="sm">Novo</Button>}
              />
            }
          />
        </div>
      </Section>

      <Section title="KanbanBoard">
        <KanbanBoard columns={kanbanColumns} cards={cards} onMove={move} />
      </Section>

      <Section title="TimelineItem">
        <div className="max-w-md">
          <TimelineItem icon={FileText} title="Processo criado" body="A partir da submissão do corretor" meta="há 2 dias" />
          <TimelineItem icon={TrendingUp} title="Status alterado" body="Em análise → Laudo emitido" meta="ontem" />
          <TimelineItem icon={Clock} title="Interação registrada" meta="há 3 h" last />
        </div>
      </Section>

      <Section title="Badges & cores">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-brand-goldSoft/30 text-brand-goldDeep">Investidor</Badge>
          <Badge variant="outline" className="text-ink-700">Proprietário</Badge>
          <span className="rounded-ds-pill bg-semantic-success/15 px-2.5 py-0.5 text-xs font-medium text-semantic-success">Pago</span>
          <span className="rounded-ds-pill bg-semantic-danger/15 px-2.5 py-0.5 text-xs font-medium text-semantic-danger">Atrasado</span>
        </div>
      </Section>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Exemplo de Drawer" description="Wrapper do Sheet para edição lateral.">
        <p className="text-sm text-ink-700">Conteúdo do drawer vai aqui.</p>
      </Drawer>
    </div>
  );
}
