import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export type PeriodPreset = 'all' | 'current_month' | 'last_month' | 'quarter' | 'custom';

interface PeriodFilterProps {
  period: PeriodPreset;
  onPeriodChange: (period: PeriodPreset) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

export function PeriodFilter({
  period, onPeriodChange, customStart, customEnd, onCustomStartChange, onCustomEndChange,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <Select value={period} onValueChange={v => onPeriodChange(v as PeriodPreset)}>
        <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="current_month">Mês atual</SelectItem>
          <SelectItem value="last_month">Mês anterior</SelectItem>
          <SelectItem value="quarter">Trimestre</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {period === 'custom' && (
        <>
          <Input type="date" value={customStart} onChange={e => onCustomStartChange(e.target.value)} className="w-[150px]" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={customEnd} onChange={e => onCustomEndChange(e.target.value)} className="w-[150px]" />
        </>
      )}
    </div>
  );
}

export function filterByPeriod(dateStr: string, period: PeriodPreset, customStart: string, customEnd: string): boolean {
  if (period === 'all') return true;
  if (!dateStr) return false;

  const now = new Date();
  const date = dateStr.slice(0, 10); // YYYY-MM-DD

  if (period === 'current_month') {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return date >= start;
  }

  if (period === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`;
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return date >= start && date < end;
  }

  if (period === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = `${now.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}-01`;
    return date >= start;
  }

  if (period === 'custom') {
    if (customStart && date < customStart) return false;
    if (customEnd && date > customEnd) return false;
    return true;
  }

  return true;
}
