import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { FinanceRevenues } from '@/components/finance/FinanceRevenues';
import { FinanceExpenses } from '@/components/finance/FinanceExpenses';
import { FinanceCommissions } from '@/components/finance/FinanceCommissions';

export default function AdminFinanceiro() {
  return (
    <div className="space-y-6 font-ds-body">
      <Tabs defaultValue="overview" className="space-y-0">
        <div>
          <div className="space-y-1">
            <h1 className="font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
              Financeiro
            </h1>
            <p className="text-sm text-ink-500">Receitas, despesas, comissões e performance do período.</p>
          </div>
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="revenues">Receitas</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
          </TabsList>
        </div>

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
