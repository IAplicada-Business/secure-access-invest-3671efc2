import { supabase } from '@/integrations/supabase/client';
import type { ServiceType } from '@/types/database';

export type CreateCommissionInput = {
  partnerId: string;
  clientId?: string | null;
  revenueId?: string | null;
  dealAmount: number;
  rate: number;
  notes?: string | null;
};

export type CreateRevenueWithCommissionInput = {
  clientId: string | null;
  partnerId?: string | null;
  serviceType: ServiceType;
  amount: number;
  receivedAt: string;
  notes?: string | null;
  category?: string | null;
  paymentType?: string | null;
  /** Se true e houver partnerId, busca commission_rate do parceiro. */
  autoCommission?: boolean;
};

/**
 * Cria comissão pendente a partir de um negócio.
 * amount da comissão = dealAmount * rate / 100.
 */
export async function createCommissionFromDeal(input: CreateCommissionInput) {
  if (!input.partnerId) {
    return { data: null, error: new Error('Parceiro obrigatório') };
  }
  if (input.rate <= 0 || input.dealAmount <= 0) {
    return { data: null, error: null }; // nada a lançar
  }

  const commissionAmount = Math.round(((input.dealAmount * input.rate) / 100) * 100) / 100;

  return supabase
    .from('commissions')
    .insert({
      partner_id: input.partnerId,
      client_id: input.clientId || null,
      revenue_id: input.revenueId || null,
      rate: input.rate,
      amount: commissionAmount,
      status: 'pending',
      notes: input.notes || null,
    })
    .select('id, amount')
    .single();
}

/**
 * Lança receita e, se o cliente/parceiro tiver taxa, gera comissão automática.
 * Retorna a receita criada e a comissão (se houver).
 */
export async function createRevenueWithCommission(input: CreateRevenueWithCommissionInput) {
  let partnerId = input.partnerId || null;
  let rate = 0;

  if (input.autoCommission !== false) {
    if (!partnerId && input.clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('partner_id')
        .eq('id', input.clientId)
        .maybeSingle();
      partnerId = client?.partner_id || null;
    }
    if (partnerId) {
      const { data: partner } = await supabase
        .from('partners')
        .select('commission_rate')
        .eq('id', partnerId)
        .maybeSingle();
      rate = Number(partner?.commission_rate || 0);
    }
  }

  const { data: rev, error: revErr } = await supabase
    .from('revenues')
    .insert({
      client_id: input.clientId,
      partner_id: partnerId,
      service_type: input.serviceType,
      amount: input.amount,
      received_at: input.receivedAt,
      notes: input.notes || null,
      category: input.category || null,
      payment_type: input.paymentType || null,
      due_date: input.receivedAt,
      installment_count: 1,
      installment_number: 1,
    })
    .select('id')
    .single();

  if (revErr || !rev) {
    return { revenue: null, commission: null, error: revErr || new Error('Falha ao criar receita') };
  }

  let commission: { id: string; amount: number } | null = null;
  if (partnerId && rate > 0) {
    const { data: comm, error: commErr } = await createCommissionFromDeal({
      partnerId,
      clientId: input.clientId,
      revenueId: rev.id,
      dealAmount: input.amount,
      rate,
      notes: input.notes || 'Gerada automaticamente a partir da receita',
    });
    if (!commErr && comm) commission = comm;
  }

  return { revenue: rev, commission, partnerId, rate, error: null };
}

/** Busca partner_id + taxa a partir do cliente. */
export async function getClientPartnerCommission(clientId: string) {
  const { data: client } = await supabase
    .from('clients')
    .select('partner_id, partner_name')
    .eq('id', clientId)
    .maybeSingle();

  if (!client?.partner_id) {
    return { partnerId: null as string | null, partnerName: client?.partner_name || null, rate: 0 };
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('id, name, commission_rate')
    .eq('id', client.partner_id)
    .maybeSingle();

  return {
    partnerId: partner?.id || client.partner_id,
    partnerName: partner?.name || client.partner_name || null,
    rate: Number(partner?.commission_rate || 0),
  };
}
