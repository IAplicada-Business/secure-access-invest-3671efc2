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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import { PeriodFilter, filterByPeriod, type PeriodPreset } from './PeriodFilter';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filters
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [category, setCategory] = useState<ExpenseCategory>('outro');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!description.trim()) { toast.error('Informe a descrição'); return; }
    if (!amount || Number(amount) <= 0) { toast.error('Informe o valor'); return; }
    setSaving(true);

    const { error } = await supabase.from('expenses').insert({
      category,
      description: description.trim(),
      amount: Number(amount),
      expense_date: expenseDate,
      is_recurring: isRecurring,
    });

    if (error) { toast.error('Erro ao salvar despesa'); setSaving(false); return; }
    toast.success('Despesa registrada');
    setDialogOpen(false);
    resetForm();
    setSaving(false);
    load();
  }

  function resetForm() {
    setCategory('outro');
    setDescription('');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
  }

  const filtered = expenses.filter(e => {
    if (!filterByPeriod(e.expense_date, period, customStart, customEnd)) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.description.toLowerCase().includes(q) &&
          !CATEGORY_LABELS[e.category as ExpenseCategory]?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar despesas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <PeriodFilter period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Despesa</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="hidden md:table-cell">Recorrente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma despesa registrada</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.expense_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell><Badge variant="outline">{CATEGORY_LABELS[e.category as ExpenseCategory] || e.category}</Badge></TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">{e.description}</TableCell>
                  <TableCell className="font-medium text-destructive">{formatCurrency(Number(e.amount))}</TableCell>
                  <TableCell className="hidden md:table-cell">{e.is_recurring ? <Badge>Sim</Badge> : <span className="text-muted-foreground">Não</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={v => setCategory(v as ExpenseCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'comissao_paga').map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da despesa" />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              <Label>Despesa recorrente</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
