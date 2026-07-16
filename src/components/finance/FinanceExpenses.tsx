import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { PeriodFilter, filterByPeriod, type PeriodPreset } from './PeriodFilter';
import { Drawer } from '@/components/ui-system';
import {
  PAYMENT_TYPE_LABELS,
  addMonths,
  splitAmount,
  type PaymentType,
} from '@/lib/financePayments';
import type { ExpenseCategory } from '@/types/database';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salario: 'Salário',
  comissao_paga: 'Comissão Paga',
  fornecedor: 'Fornecedor',
  escritorio: 'Escritório',
  marketing: 'Marketing',
  outro: 'Outro',
};

export function FinanceExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [category, setCategory] = useState<ExpenseCategory>('outro');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>('pix');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceMonths, setRecurrenceMonths] = useState('12');
  const [saving, setSaving] = useState(false);

  const totalAmount = Number(amount) || 0;
  const parcels = Math.max(1, parseInt(installmentCount, 10) || 1);
  const months = Math.max(1, parseInt(recurrenceMonths, 10) || 1);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!description.trim()) {
      toast.error('Informe a descrição');
      return;
    }
    if (!amount || totalAmount <= 0) {
      toast.error('Informe o valor');
      return;
    }
    setSaving(true);

    const rows: Record<string, unknown>[] = [];

    if (isRecurring) {
      // Gera 1 lançamento por mês pelo período informado (valor mensal = amount)
      for (let i = 0; i < months; i++) {
        const due = addMonths(expenseDate, i);
        rows.push({
          category,
          description: description.trim(),
          amount: totalAmount,
          expense_date: due,
          due_date: due,
          payment_type: paymentType,
          is_recurring: true,
          recurrence_months: months,
          installment_count: months,
          installment_number: i + 1,
        });
      }
    } else if (parcels > 1) {
      const parts = splitAmount(totalAmount, parcels);
      parts.forEach((part, idx) => {
        const due = addMonths(expenseDate, idx);
        rows.push({
          category,
          description: description.trim(),
          amount: part,
          expense_date: due,
          due_date: due,
          payment_type: paymentType,
          is_recurring: false,
          recurrence_months: null,
          installment_count: parcels,
          installment_number: idx + 1,
        });
      });
    } else {
      rows.push({
        category,
        description: description.trim(),
        amount: totalAmount,
        expense_date: expenseDate,
        due_date: expenseDate,
        payment_type: paymentType,
        is_recurring: false,
        recurrence_months: null,
        installment_count: 1,
        installment_number: 1,
      });
    }

    const { data: inserted, error } = await supabase.from('expenses').insert(rows).select();
    if (error) {
      toast.error('Erro ao salvar despesa: ' + error.message);
      setSaving(false);
      return;
    }

    const firstId = inserted?.[0]?.id;
    if (firstId && inserted && inserted.length > 1) {
      await supabase
        .from('expenses')
        .update({ parent_expense_id: firstId })
        .in(
          'id',
          inserted.slice(1).map((r) => r.id),
        );
    }

    toast.success(
      rows.length > 1 ? `Despesa lançada em ${rows.length} vencimentos` : 'Despesa registrada',
    );
    setDrawerOpen(false);
    resetForm();
    setSaving(false);
    load();
  }

  function resetForm() {
    setCategory('outro');
    setDescription('');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPaymentType('pix');
    setInstallmentCount('1');
    setIsRecurring(false);
    setRecurrenceMonths('12');
  }

  const filtered = expenses.filter((e) => {
    if (!filterByPeriod(e.expense_date, period, customStart, customEnd)) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.description.toLowerCase().includes(q) &&
        !CATEGORY_LABELS[e.category as ExpenseCategory]?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col flex-wrap items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar despesas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <PeriodFilter
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDrawerOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhuma despesa registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {new Date(e.due_date || e.expense_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CATEGORY_LABELS[e.category as ExpenseCategory] || e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate font-medium">{e.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {PAYMENT_TYPE_LABELS[e.payment_type as PaymentType] || e.payment_type || '—'}
                      </TableCell>
                      <TableCell>
                        {e.installment_count > 1 ? (
                          <Badge variant="secondary">
                            {e.installment_number}/{e.installment_count}
                            {e.is_recurring ? ' · rec.' : ''}
                          </Badge>
                        ) : e.is_recurring ? (
                          <Badge>Recorrente</Badge>
                        ) : (
                          <span className="text-muted-foreground">À vista</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-destructive">
                        {formatCurrency(Number(e.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Nova despesa"
        description="Parcelas, pagamento e recorrência com duração para o fluxo de caixa."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <div className="space-y-5 pb-4">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Dados</h3>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS)
                    .filter(([k]) => k !== 'comissao_paga')
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da despesa"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data base</Label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de pagamento</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Parcelas e recorrência</h3>
            <div className="flex items-center gap-3">
              <Switch
                checked={isRecurring}
                onCheckedChange={(v) => {
                  setIsRecurring(v);
                  if (v) setInstallmentCount('1');
                }}
              />
              <Label>Despesa recorrente</Label>
            </div>
            {isRecurring ? (
              <div className="space-y-2">
                <Label>Recorrência por quantos meses?</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={recurrenceMonths}
                  onChange={(e) => setRecurrenceMonths(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Gera {months} lançamentos mensais de {formatCurrency(totalAmount || 0)}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Nº de parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                />
                {parcels > 1 && totalAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parcels}x de ~{formatCurrency(totalAmount / parcels)}
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
