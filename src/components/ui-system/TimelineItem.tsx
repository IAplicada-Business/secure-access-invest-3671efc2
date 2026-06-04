import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  icon?: LucideIcon;
  title: string;
  body?: ReactNode;
  meta?: string;
  /** Último item da lista esconde a linha vertical. */
  last?: boolean;
  className?: string;
}

/**
 * Item de linha do tempo / histórico. Usar em listas verticais.
 */
export function TimelineItem({ icon: Icon, title, body, meta, last, className }: TimelineItemProps) {
  return (
    <div className={cn('relative flex gap-3 pb-5', className)}>
      {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-cream-200" aria-hidden />}
      <span className="z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-ds-pill bg-cream-100 text-brand-goldDeep">
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink-900">{title}</p>
          {meta && <span className="flex-shrink-0 text-xs text-ink-300">{meta}</span>}
        </div>
        {body && <div className="mt-0.5 text-sm text-ink-700">{body}</div>}
      </div>
    </div>
  );
}
