import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { FinanceRevenues } from '@/components/finance/FinanceRevenues';
import { FinanceExpenses } from '@/components/finance/FinanceExpenses';
import { FinanceCommissions } from '@/components/finance/FinanceCommissions';

const tabTriggerClass =
  'rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-1 text-sm font-medium text-ink-300 shadow-none data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-ink-900 data-[state=active]:shadow-none';

export default function AdminFinanceiro() {
  return (
    <div className="space-y-6 font-ds-body">
      <Tabs defaultValue="overview" className="space-y-6">
        <div>
          <div className="space-y-1">
            <h1 className="font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
              Financeiro
            </h1>
            <p className="text-sm text-ink-500">Receitas, despesas, comissões e performance do período.</p>
          </div>
          <TabsList className="mt-4 h-auto w-full justify-start gap-6 rounded-none border-b border-cream-200 bg-transparent p-0">
            <TabsTrigger value="overview" className={tabTriggerClass}>Visão geral</TabsTrigger>
            <TabsTrigger value="revenues" className={tabTriggerClass}>Receitas</TabsTrigger>
            <TabsTrigger value="expenses" className={tabTriggerClass}>Despesas</TabsTrigger>
            <TabsTrigger value="commissions" className={tabTriggerClass}>Comissões</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <FinanceOverview />
        </TabsContent>
        <TabsContent value="revenues" className="mt-0 space-y-6">
          <FinanceRevenues />
        </TabsContent>
        <TabsContent value="expenses" className="mt-0 space-y-6">
          <FinanceExpenses />
        </TabsContent>
        <TabsContent value="commissions" className="mt-0 space-y-6">
          <FinanceCommissions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
