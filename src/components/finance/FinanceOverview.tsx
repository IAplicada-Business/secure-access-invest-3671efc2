import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatCurrency';
import { DollarSign, TrendingDown, TrendingUp, Clock, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
}

interface ClientTypeData {
  name: string;
  value: number;
}

const COLORS = ['hsl(41, 46%, 59%)', 'hsl(0, 0%, 24%)', 'hsl(41, 46%, 75%)'];

export function FinanceOverview() {
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [currentExpenses, setCurrentExpenses] = useState(0);
  const [pendingCommissions, setPendingCommissions] = useState(0);
  const [previousRevenue, setPreviousRevenue] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [clientTypeData, setClientTypeData] = useState<ClientTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Current month revenue
    const { data: curRev } = await supabase
      .from('revenues')
      .select('amount')
      .gte('received_at', currentMonthStart)
      .lte('received_at', currentMonthEnd);
    setCurrentRevenue(curRev?.reduce((s, r) => s + Number(r.amount), 0) || 0);

    // Previous month revenue
    const { data: prevRev } = await supabase
      .from('revenues')
      .select('amount')
      .gte('received_at', previousMonthStart)
      .lte('received_at', previousMonthEnd);
    setPreviousRevenue(prevRev?.reduce((s, r) => s + Number(r.amount), 0) || 0);

    // Current month expenses
    const { data: curExp } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', currentMonthStart)
      .lte('expense_date', currentMonthEnd);
    setCurrentExpenses(curExp?.reduce((s, r) => s + Number(r.amount), 0) || 0);

    // Pending commissions
    const { data: pendComm } = await supabase
      .from('commissions')
      .select('amount')
      .eq('status', 'pending');
    setPendingCommissions(pendComm?.reduce((s, r) => s + Number(r.amount), 0) || 0);

    // Last 6 months chart data
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
    const { data: allRevenues } = await supabase.from('revenues').select('amount, received_at').gte('received_at', sixMonthsAgo);
    const { data: allExpenses } = await supabase.from('expenses').select('amount, expense_date').gte('expense_date', sixMonthsAgo);

    const months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const monthRevenues = allRevenues?.filter(r => r.received_at.startsWith(key)) || [];
      const monthExpenses = allExpenses?.filter(e => e.expense_date.startsWith(key)) || [];
      months.push({
        month: label.charAt(0).toUpperCase() + label.slice(1),
        receitas: monthRevenues.reduce((s, r) => s + Number(r.amount), 0),
        despesas: monthExpenses.reduce((s, e) => s + Number(e.amount), 0),
      });
    }
    setMonthlyData(months);

    // Revenue by client type
    const { data: revenuesByClient } = await supabase
      .from('revenues')
      .select('amount, client_id');
    
    if (revenuesByClient && revenuesByClient.length > 0) {
      const clientIds = [...new Set(revenuesByClient.map(r => r.client_id).filter(Boolean))];
      const { data: clients } = await supabase.from('clients').select('id, type').in('id', clientIds as string[]);
      const typeMap = new Map(clients?.map(c => [c.id, c.type]) || []);
      
      const typeLabels: Record<string, string> = { investor: 'Investidor', incorporator: 'Incorporador', individual: 'Pessoa Física' };
      const typeTotals: Record<string, number> = {};
      revenuesByClient.forEach(r => {
        const type = r.client_id ? (typeMap.get(r.client_id) || 'individual') : 'individual';
        const label = typeLabels[type] || type;
        typeTotals[label] = (typeTotals[label] || 0) + Number(r.amount);
      });
      setClientTypeData(Object.entries(typeTotals).map(([name, value]) => ({ name, value })));
    }

    setLoading(false);
  }

  const netProfit = currentRevenue - currentExpenses - pendingCommissions;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(currentRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(currentExpenses)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissões a Pagar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(pendingCommissions)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Anterior</CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-muted-foreground">{formatCurrency(previousRevenue)}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(41, 46%, 59%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 0%, 24%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados para exibir</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita por Tipo de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {clientTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={clientTypeData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {clientTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados para exibir</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
