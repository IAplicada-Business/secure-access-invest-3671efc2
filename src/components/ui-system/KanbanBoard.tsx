import { ReactNode } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export interface KanbanColumn {
  id: string;
  title: string;
  /** Classe opcional de fundo da coluna (ex.: 'bg-brand-goldSoft/20'). */
  accentClassName?: string;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  content: ReactNode;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  /** Chamado quando um card é solto em outra coluna. */
  onMove: (cardId: string, toColumnId: string) => void;
  /** Texto exibido (sutil) quando uma coluna não tem cards. */
  emptyHint?: string;
  className?: string;
}

function DraggableCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded-ds-lg border border-cream-200 bg-white p-3 shadow-ds-sm transition-shadow duration-[240ms]',
        'hover:shadow-ds-md active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      {card.content}
    </div>
  );
}

function DroppableColumn({ column, children }: { column: KanbanColumn; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      <h3 className="mb-3 px-1 font-ds-display text-base font-medium text-ink-900">{column.title}</h3>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-ds-md p-2 transition-colors duration-[240ms]',
          column.accentClassName ?? 'bg-cream-100',
          isOver && 'ring-2 ring-brand-gold/60',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Kanban genérico com drag-and-drop (@dnd-kit/core).
 * Usado pelo CRM agora; reutilizável para o funil de ativos depois.
 */
export function KanbanBoard({ columns, cards, onMove, emptyHint, className }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const cardId = String(active.id);
    const toColumnId = String(over.id);
    const card = cards.find((c) => c.id === cardId);
    if (card && card.columnId !== toColumnId && columns.some((col) => col.id === toColumnId)) {
      onMove(cardId, toColumnId);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className={cn('flex gap-4 overflow-x-auto pb-2', className)}>
        {columns.map((column) => {
          const colCards = cards.filter((c) => c.columnId === column.id);
          return (
            <DroppableColumn key={column.id} column={column}>
              {colCards.length === 0 && emptyHint ? (
                <p className="px-2 py-6 text-center text-xs text-ink-300">{emptyHint}</p>
              ) : (
                colCards.map((card) => <DraggableCard key={card.id} card={card} />)
              )}
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
