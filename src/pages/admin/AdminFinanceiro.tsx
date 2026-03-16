import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { FinanceRevenues } from '@/components/finance/FinanceRevenues';
import { FinanceExpenses } from '@/components/finance/FinanceExpenses';
import { FinanceCommissions } from '@/components/finance/FinanceCommissions';

export default function AdminFinanceiro() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Financeiro</h1>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="revenues">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FinanceOverview />
        </TabsContent>

        <TabsContent value="revenues" className="space-y-6">
          <FinanceRevenues />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <FinanceExpenses />
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <FinanceCommissions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
