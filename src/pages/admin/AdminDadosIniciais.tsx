import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, Users, TrendingUp, Receipt, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui-system';

const PARTNER_TYPES: Record<string, string> = {
  imobiliaria: 'Imobiliária', corretor_autonomo: 'Corretor Autônomo',
  assessor_investimento: 'Assessor de Investimento', arquiteto: 'Arquiteto',
  engenheiro: 'Engenheiro', contador: 'Contador', outro: 'Outro',
};
const SERVICE_TYPES: Record<string, string> = {
  regularizacao: 'Regularização', venda_plataforma: 'Venda Plataforma',
  consultoria: 'Consultoria', outro: 'Outro',
};
const EXPENSE_CATEGORIES: Record<string, string> = {
  salario: 'Salário', comissao_paga: 'Comissão Paga', fornecedor: 'Fornecedor',
  escritorio: 'Escritório', marketing: 'Marketing', outro: 'Outro',
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminDadosIniciais() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ partners: 0, revenues: 0, expenses: 0 });
  const [partnersList, setPartnersList] = useState<{ id: string; name: string }[]>([]);

  const [pForm, setPForm] = useState({ name: '', type: 'imobiliaria', phone: '', email: '' });
  const [rForm, setRForm] = useState({ service_type: 'regularizacao', amount: '', received_at: today(), partner_id: '', notes: '' });
  const [eForm, setEForm] = useState({ category: 'fornecedor', description: '', amount: '', expense_date: today() });
  const [savingP, setSavingP] = useState(false);
  const [savingR, setSavingR] = useState(false);
  const [savingE, setSavingE] = useState(false);

  async function refresh() {
    const [p, r, e, list] = await Promise.all([
      supabase.from('partners').select('id', { count: 'exact', head: true }),
      supabase.from('revenues').select('id', { count: 'exact', head: true }),
      supabase.from('expenses').select('id', { count: 'exact', head: true }),
      supabase.from('partners').select('id, name').eq('status', 'active').order('name'),
    ]);
    setCounts({ partners: p.count ?? 0, revenues: r.count ?? 0, expenses: e.count ?? 0 });
    setPartnersList(list.data ?? []);
  }

  useEffect(() => { refresh(); }, []);

  async function addPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!pForm.name.trim() || !pForm.phone.trim()) return;
    setSavingP(true);
    const { error } = await supabase.from('partners').insert({
      name: pForm.name.trim(), type: pForm.type as never, phone: pForm.phone.trim(),
      email: pForm.email || null, status: 'active',
    });
    setSavingP(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Parceiro adicionado!');
    setPForm({ name: '', type: 'imobiliaria', phone: '', email: '' });
    refresh();
  }

  async function addRevenue(e: React.FormEvent) {
    e.preventDefault();
    if (!rForm.amount) return;
    setSavingR(true);
    const { error } = await supabase.from('revenues').insert({
      service_type: rForm.service_type as never,
      amount: Number(rForm.amount),
      received_at: rForm.received_at,
      due_date: rForm.received_at,
      vencimento: rForm.received_at,
      status: 'aguardando',
      partner_id: rForm.partner_id || null,
      notes: rForm.notes || null,
    });
    setSavingR(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Receita lançada!');
    setRForm({ service_type: 'regularizacao', amount: '', received_at: today(), partner_id: '', notes: '' });
    refresh();
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!eForm.description.trim() || !eForm.amount) return;
    setSavingE(true);
    const { error } = await supabase.from('expenses').insert({
      category: eForm.category as never,
      description: eForm.description.trim(),
      amount: Number(eForm.amount),
      expense_date: eForm.expense_date,
    });
    setSavingE(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Despesa lançada!');
    setEForm({ category: 'fornecedor', description: '', amount: '', expense_date: today() });
    refresh();
  }

  const Stat = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) => (
    <div className="flex items-center gap-3 rounded-ds-md border border-cream-200 bg-white px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-ds-pill bg-brand-goldSoft/30 text-brand-goldDeep">
        {value > 0 ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <div>
        <p className="font-ds-mono text-lg font-semibold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 font-ds-body">
      <Button variant="ghost" onClick={() => navigate('/admin/configuracoes')} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Configurações
      </Button>

      <PageHeader
        title="Dados Iniciais"
        subtitle="Cadastre rapidamente seus parceiros e lançamentos reais para os painéis deixarem de ficar vazios."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="parceiros" value={counts.partners} />
        <Stat icon={TrendingUp} label="receitas" value={counts.revenues} />
        <Stat icon={Receipt} label="despesas" value={counts.expenses} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Parceiros */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-brand-goldDeep" /><CardTitle className="text-base">Parceiro</CardTitle></div>
            <CardDescription>Imobiliárias e corretores que trabalham com você.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addPartner} className="space-y-3">
              <div className="space-y-1.5"><Label>Nome *</Label><Input value={pForm.name} onChange={(e) => setPForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={pForm.type} onValueChange={(v) => setPForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PARTNER_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Telefone *</Label><Input value={pForm.phone} onChange={(e) => setPForm(p => ({ ...p, phone: e.target.value }))} placeholder="5511999999999" required /></div>
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={pForm.email} onChange={(e) => setPForm(p => ({ ...p, email: e.target.value }))} /></div>
              <Button type="submit" disabled={savingP} className="w-full">{savingP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Adicionar parceiro</Button>
            </form>
          </CardContent>
        </Card>

        {/* Receitas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-goldDeep" /><CardTitle className="text-base">Receita</CardTitle></div>
            <CardDescription>Lançamentos recebidos (últimos meses).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addRevenue} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tipo de serviço</Label>
                <Select value={rForm.service_type} onValueChange={(v) => setRForm(p => ({ ...p, service_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SERVICE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={rForm.amount} onChange={(e) => setRForm(p => ({ ...p, amount: e.target.value }))} required /></div>
                <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={rForm.received_at} onChange={(e) => setRForm(p => ({ ...p, received_at: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Parceiro (opcional)</Label>
                <Select value={rForm.partner_id || 'none'} onValueChange={(v) => setRForm(p => ({ ...p, partner_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {partnersList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Observação</Label><Input value={rForm.notes} onChange={(e) => setRForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button type="submit" disabled={savingR} className="w-full">{savingR ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Lançar receita</Button>
            </form>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-brand-goldDeep" /><CardTitle className="text-base">Despesa</CardTitle></div>
            <CardDescription>Custos recorrentes ou pontuais.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addExpense} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={eForm.category} onValueChange={(v) => setEForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Descrição *</Label><Input value={eForm.description} onChange={(e) => setEForm(p => ({ ...p, description: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={eForm.amount} onChange={(e) => setEForm(p => ({ ...p, amount: e.target.value }))} required /></div>
                <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={eForm.expense_date} onChange={(e) => setEForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
              </div>
              <Button type="submit" disabled={savingE} className="w-full">{savingE ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Lançar despesa</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
