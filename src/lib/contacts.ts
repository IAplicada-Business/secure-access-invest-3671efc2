import type { ClientStatus } from '@/types/database';

/** Relação comercial do contato na base unificada (`clients`). */
export type ContactRelation = 'lead' | 'client';

export const CRM_STAGE_LABELS: Record<string, string> = {
  contato: 'Contato',
  agendar_reuniao: 'Agendar reunião',
  envio_proposta: 'Envio de proposta',
  follow_up: 'Follow Up',
  fechamento: 'Fechamento',
  aguardando_pagamento: 'Aguardando pagamento',
  perdido: 'Perdido',
};

/** Etapas em que o lead passa a ser tratado como cliente. */
export const CLIENT_PROMOTION_STAGES = new Set([
  'fechamento',
  'aguardando_pagamento',
]);

export function contactRelation(status: ClientStatus | string | null | undefined): ContactRelation {
  return status === 'active' || status === 'completed' ? 'client' : 'lead';
}

export function isClientStatus(status: ClientStatus | string | null | undefined): boolean {
  return contactRelation(status) === 'client';
}

export function relationLabel(status: ClientStatus | string | null | undefined): string {
  return contactRelation(status) === 'client' ? 'Cliente' : 'Lead';
}

export const RELATION_BADGE: Record<ContactRelation, string> = {
  lead: 'bg-cream-200 text-ink-700',
  client: 'bg-brand-goldSoft/30 text-brand-goldDeep',
};

export function shouldPromoteToClient(stageId: string): boolean {
  return CLIENT_PROMOTION_STAGES.has(stageId);
}
