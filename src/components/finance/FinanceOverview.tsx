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
  const [serviceTypeData, setServiceTypeData] = useState<ClientTypeData[]>([]);
  const [imobiliariaRanking, setImobiliariaRanking] = useState<ClientTypeData[]>([]);
  const [includeCommissions, setIncludeCommissions] = useState(true);
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
      
      const typeLabels: Record<string, string> = { investor: 'Investidor', incorporator: 'Regularização', individual: 'Pessoa Física' };
      const typeTotals: Record<string, number> = {};
      revenuesByClient.forEach(r => {
        const type = r.client_id ? (typeMap.get(r.client_id) || 'individual') : 'individual';
        const label = typeLabels[type] || type;
        typeTotals[label] = (typeTotals[label] || 0) + Number(r.amount);
      });
      setClientTypeData(Object.entries(typeTotals).map(([name, value]) => ({ name, value })));
    }

    // Revenue by service type ("origem")
    const { data: revByService } = await supabase.from('revenues').select('amount, service_type');
    const serviceLabels: Record<string, string> = {
      regularizacao: 'Regularização', venda_plataforma: 'Venda Plataforma',
      consultoria: 'Consultoria', outro: 'Outro',
    };
    const svcTotals: Record<string, number> = {};
    revByService?.forEach(r => {
      const label = serviceLabels[r.service_type] || r.service_type;
      svcTotals[label] = (svcTotals[label] || 0) + Number(r.amount);
    });
    setServiceTypeData(Object.entries(svcTotals).map(([name, value]) => ({ name, value })));

    // Ranking de imobiliárias: agrega receita pela imobiliária do parceiro
    // (parent_partner_id; se o parceiro for a própria imobiliária ou autônomo, usa o nome dele).
    const { data: revByPartner } = await supabase.from('revenues').select('amount, partner_id').not('partner_id', 'is', null);
    const { data: allPartners } = await supabase.from('partners').select('id, name, parent_partner_id');
    if (revByPartner && revByPartner.length > 0) {
      const pMap = new Map((allPartners ?? []).map(p => [p.id, p]));
      const agg: Record<string, number> = {};
      revByPartner.forEach(r => {
        const p = r.partner_id ? pMap.get(r.partner_id) : null;
        if (!p) return;
        const parent = p.parent_partner_id ? pMap.get(p.parent_partner_id) : null;
        const key = parent?.name ?? p.name;
        agg[key] = (agg[key] || 0) + Number(r.amount);
      });
      setImobiliariaRanking(
        Object.entries(agg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      );
    }

    setLoading(false);
  }

  const netProfit = currentRevenue - currentExpenses - (includeCommissions ? pendingCommissions : 0);
  const maxRanking = Math.max(1, ...imobiliariaRanking.map(r => r.value));

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
          <CardContent><div className="text-xl sm:text-2xl font-bold">{formatCurrency(currentRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-destructive">{formatCurrency(currentExpenses)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(netProfit)}
            </div>
            <button
              type="button"
              onClick={() => setIncludeCommissions(v => !v)}
              className="mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              {includeCommissions ? 'descontando comissões' : 'sem descontar comissões'}
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissões a Pagar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold">{formatCurrency(pendingCommissions)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Anterior</CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-muted-foreground">{formatCurrency(previousRevenue)}</div></CardContent>
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

      {/* Ranking de imobiliárias + Receita por origem */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Imobiliárias</CardTitle>
          </CardHeader>
          <CardContent>
            {imobiliariaRanking.length > 0 ? (
              <div className="space-y-3">
                {imobiliariaRanking.map((r) => (
                  <div key={r.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-foreground">{r.name}</span>
                      <span className="font-mono text-muted-foreground">{formatCurrency(r.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(r.value / maxRanking) * 100}%`, background: 'linear-gradient(90deg, hsl(41,46%,68%), hsl(41,46%,52%))' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">Sem receitas vinculadas a parceiros</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita por Origem (serviço)</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={serviceTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {serviceTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground">Sem dados para exibir</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
