import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio obrigatório em listas/tabelas.
 * Título em display, corpo em ink/700, CTA opcional.
 */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-ds-lg border border-dashed border-cream-300 bg-cream-50 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-ds-pill bg-cream-100 text-ink-300">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <h3 className="font-ds-display text-lg font-medium text-ink-900">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-700">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
