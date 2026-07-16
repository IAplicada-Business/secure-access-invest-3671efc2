export type PaymentType = 'pix' | 'ted' | 'boleto' | 'cartao' | 'dinheiro' | 'outro';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  pix: 'PIX',
  ted: 'TED / Transferência',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

export const REVENUE_CATEGORY_LABELS: Record<string, string> = {
  operacional: 'Operacional',
  projeto: 'Projeto / Deal',
  recorrente: 'Recorrente',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

/** Adiciona meses a uma data ISO (YYYY-MM-DD), preservando dia quando possível. */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function splitAmount(total: number, parts: number): number[] {
  if (parts <= 1) return [round2(total)];
  const base = Math.floor((total / parts) * 100) / 100;
  const values = Array.from({ length: parts }, () => base);
  const sum = values.reduce((a, b) => a + b, 0);
  values[values.length - 1] = round2(total - (sum - base));
  return values;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
