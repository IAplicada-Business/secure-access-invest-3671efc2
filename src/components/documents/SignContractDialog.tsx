import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, DollarSign, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { toast } from 'sonner';
import type { ServiceType } from '@/types/database';

const SERVICE_LABELS: Record<ServiceType, string> = {
  regularizacao: 'Regularização',
  venda_plataforma: 'Venda via Plataforma',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

interface SignContractDialogProps {
  doc: {
    id: string;
    title: string;
    type: string;
    client_id: string | null;
    client_name?: string;
    variables_data: Record<string, string>;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function SignContractDialog({ doc, open, onOpenChange, onComplete }: SignContractDialogProps) {
  const [clientName, setClientName] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [commissionRate, setCommissionRate] = useState(0);
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState<ServiceType>('regularizacao');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doc || !open) return;
    setLoading(true);
    setReceivedAt(new Date().toISOString().split('T')[0]);

    // Extract amount from variables_data
    const vars = doc.variables_data || {};
    const rawValue = vars.valor_servico || vars.valor_total || vars.valor || '';
    const numericValue = rawValue.replace(/[^\d.,]/g, '').replace(',', '.');
    setAmount(numericValue || '');

    // Default service type based on doc type
    setServiceType(doc.type === 'contrato' ? 'regularizacao' : 'outro');

    // Fetch client + partner info
    if (doc.client_id) {
      supabase.from('clients').select('id, name, partner_id').eq('id', doc.client_id).single()
        .then(({ data: client }) => {
          if (client) {
            setClientName(client.name);
            if (client.partner_id) {
              supabase.from('partners').select('id, name, commission_rate').eq('id', client.partner_id).single()
                .then(({ data: partner }) => {
                  if (partner) {
                    setPartnerId(partner.id);
                    setPartnerName(partner.name);
                    setCommissionRate(partner.commission_rate || 0);
                  }
                  setLoading(false);
                });
            } else {
              setPartnerId(null);
              setPartnerName('');
              setCommissionRate(0);
              setLoading(false);
            }
          } else {
            setClientName(doc.client_name || 'Cliente não encontrado');
            setLoading(false);
          }
        });
    } else {
      setClientName('');
      setPartnerId(null);
      setPartnerName('');
      setCommissionRate(0);
      setLoading(false);
    }
  }, [doc, open]);

  const parsedAmount = parseFloat(amount) || 0;
  const commissionAmount = commissionRate > 0 ? (parsedAmount * commissionRate) / 100 : 0;

  async function handleSignOnly() {
    if (!doc) return;
    setSaving(true);
    const { error } = await supabase.from('generated_documents').update({ status: 'assinado' }).eq('id', doc.id);
    if (error) { toast.error('Erro ao atualizar status'); setSaving(false); return; }
    toast.success('Documento marcado como assinado');
    setSaving(false);
    onOpenChange(false);
    onComplete();
  }

  async function handleSignAndCreateRevenue() {
    if (!doc) return;
    if (parsedAmount <= 0) { toast.error('Informe o valor do serviço'); return; }
    setSaving(true);

    // 1. Update document status
    const { error: docErr } = await supabase.from('generated_documents').update({ status: 'assinado' }).eq('id', doc.id);
    if (docErr) { toast.error('Erro ao atualizar status'); setSaving(false); return; }

    // 2. Insert revenue
    const { data: rev, error: revErr } = await supabase.from('revenues').insert({
      client_id: doc.client_id,
      partner_id: partnerId,
      service_type: serviceType,
      amount: parsedAmount,
      received_at: receivedAt,
      notes: `Gerado automaticamente do documento: ${doc.title}`,
    }).select('id').single();

    if (revErr || !rev) { toast.error('Erro ao registrar receita'); setSaving(false); return; }

    // 3. Insert commission if applicable
    if (partnerId && commissionRate > 0) {
      await supabase.from('commissions').insert({
        partner_id: partnerId,
        client_id: doc.client_id,
        revenue_id: rev.id,
        rate: commissionRate,
        amount: commissionAmount,
        status: 'pending',
      });
    }

    const msg = partnerId && commissionRate > 0
      ? `Receita de ${formatCurrency(parsedAmount)} registrada e comissão calculada para ${partnerName}`
      : `Receita de ${formatCurrency(parsedAmount)} registrada com sucesso`;
    toast.success(msg);
    setSaving(false);
    onOpenChange(false);
    onComplete();
  }

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Assinar Documento
          </DialogTitle>
          <DialogDescription>
            Registre uma receita automaticamente ao marcar este documento como assinado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Document info */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">{doc.title}</p>
              {clientName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {clientName}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="sign-amount">Valor do Serviço (R$)</Label>
              <Input
                id="sign-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Service type */}
            <div className="space-y-2">
              <Label>Tipo de Serviço</Label>
              <Select value={serviceType} onValueChange={v => setServiceType(v as ServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Received date */}
            <div className="space-y-2">
              <Label htmlFor="sign-date">Data de Recebimento</Label>
              <Input
                id="sign-date"
                type="date"
                value={receivedAt}
                onChange={e => setReceivedAt(e.target.value)}
              />
            </div>

            {/* Commission preview */}
            {partnerId && commissionRate > 0 && parsedAmount > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <p className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  Comissão automática
                </p>
                <p className="text-sm text-muted-foreground">
                  {partnerName} — {commissionRate}% = <span className="font-medium text-foreground">{formatCurrency(commissionAmount)}</span>
                </p>
                <Badge variant="outline" className="text-xs">Pendente</Badge>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleSignAndCreateRevenue} disabled={saving || loading || parsedAmount <= 0} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
            Registrar Receita e Assinar
          </Button>
          <Button variant="outline" onClick={handleSignOnly} disabled={saving || loading} className="w-full">
            Apenas marcar como assinado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
