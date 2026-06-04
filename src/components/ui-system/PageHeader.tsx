import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão das telas admin.
 * Título em fonte display (Fraunces), subtítulo em ink/500.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        <h1 className="font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
