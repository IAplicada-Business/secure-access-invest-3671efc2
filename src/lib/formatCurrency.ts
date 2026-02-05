export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function calculateAppreciation(
  acquisitionCost: number | null | undefined,
  projectedValue: number | null | undefined
): number {
  if (!acquisitionCost || !projectedValue || acquisitionCost === 0) return 0;
  return ((projectedValue - acquisitionCost) / acquisitionCost) * 100;
}
