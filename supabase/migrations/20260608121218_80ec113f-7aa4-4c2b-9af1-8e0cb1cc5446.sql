ALTER TYPE public.crm_stage_enum ADD VALUE IF NOT EXISTS 'contato';
ALTER TYPE public.crm_stage_enum ADD VALUE IF NOT EXISTS 'agendar_reuniao';
ALTER TYPE public.crm_stage_enum ADD VALUE IF NOT EXISTS 'envio_proposta';
ALTER TYPE public.crm_stage_enum ADD VALUE IF NOT EXISTS 'follow_up';
ALTER TYPE public.crm_stage_enum ADD VALUE IF NOT EXISTS 'fechamento';
ALTER TYPE public.crm_stage_enum ADD VALUE IF NOT EXISTS 'aguardando_pagamento';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS endereco text;