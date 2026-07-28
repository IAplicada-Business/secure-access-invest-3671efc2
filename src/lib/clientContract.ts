import { z } from 'zod';

export interface ContractFormValues {
  valor_contrato: string;
  data_inicio_contrato: string;
  data_fim_contrato: string;
}

export interface ContractPayload {
  valor_contrato: number | null;
  data_inicio_contrato: string | null;
  data_fim_contrato: string | null;
}

export const emptyContractFormValues: ContractFormValues = {
  valor_contrato: '',
  data_inicio_contrato: '',
  data_fim_contrato: '',
};

const contractSchema = z.object({
  valor_contrato: z.number().nullable(),
  data_inicio_contrato: z.string().nullable(),
  data_fim_contrato: z.string().nullable(),
}).superRefine((values, ctx) => {
  if (values.valor_contrato !== null && values.valor_contrato <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valor_contrato'],
      message: 'Informe um valor de contrato maior que zero.',
    });
  }

  if (
    values.data_inicio_contrato &&
    values.data_fim_contrato &&
    values.data_fim_contrato <= values.data_inicio_contrato
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data_fim_contrato'],
      message: 'A data fim do contrato deve ser posterior à data de início.',
    });
  }
});

export function maskBrlCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(digits) / 100);
}

export function formatContractValueForInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseBrlCurrencyInput(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  return Number((Number(digits) / 100).toFixed(2));
}

export function contractFormFromClient(client: {
  valor_contrato?: number | null;
  data_inicio_contrato?: string | null;
  data_fim_contrato?: string | null;
}): ContractFormValues {
  return {
    valor_contrato: formatContractValueForInput(client.valor_contrato),
    data_inicio_contrato: client.data_inicio_contrato ?? '',
    data_fim_contrato: client.data_fim_contrato ?? '',
  };
}

export function normalizeContractForm(values: ContractFormValues):
  | { success: true; data: ContractPayload }
  | { success: false; message: string } {
  const payload: ContractPayload = {
    valor_contrato: parseBrlCurrencyInput(values.valor_contrato),
    data_inicio_contrato: values.data_inicio_contrato || null,
    data_fim_contrato: values.data_fim_contrato || null,
  };
  const parsed = contractSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Revise os dados do contrato.',
    };
  }

  return { success: true, data: parsed.data };
}
