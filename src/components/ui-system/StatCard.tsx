import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Variação percentual (ex.: 12 ou -4). Verde se >= 0, vermelho se < 0. */
  delta?: number;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

/**
 * Card de métrica para dashboards. Valor em fonte mono para alinhamento.
 */
export function StatCard({ label, value, delta, icon: Icon, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn('border-cream-200', className)}>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  const hasDelta = typeof delta === 'number';
  const positive = (delta ?? 0) >= 0;

  return (
    <Card className={cn('border-cream-200 transition-shadow duration-[240ms] hover:shadow-ds-md', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-500">{label}</span>
          {Icon && <Icon className="h-4 w-4 text-brand-gold" aria-hidden />}
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="font-ds-mono text-2xl font-semibold tabular-nums text-ink-900">{value}</span>
          {hasDelta && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                positive ? 'text-semantic-success' : 'text-semantic-danger',
              )}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta as number)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
