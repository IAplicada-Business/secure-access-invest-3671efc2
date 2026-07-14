-- Retrofit no cadastro de imóveis + tipos de regularização (Adjudicação, Cartório, Prefeitura).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS has_retrofit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retrofit_investment numeric,
  ADD COLUMN IF NOT EXISTS retrofit_completion_time text,
  ADD COLUMN IF NOT EXISTS retrofit_appreciation text,
  ADD COLUMN IF NOT EXISTS retrofit_image text;

COMMENT ON COLUMN public.properties.has_retrofit IS 'Se o imóvel possui opção de retrofit';
COMMENT ON COLUMN public.properties.retrofit_investment IS 'Valor aproximado de investimento do retrofit';
COMMENT ON COLUMN public.properties.retrofit_completion_time IS 'Tempo de conclusão do retrofit';
COMMENT ON COLUMN public.properties.retrofit_appreciation IS 'Valorização esperada após o retrofit';
COMMENT ON COLUMN public.properties.retrofit_image IS 'Imagem única de como o imóvel ficará após a transformação';

-- Tipos de regularização pedidos no documento de ajustes.
INSERT INTO public.regularization_types (name, description, checklist_template, is_active)
SELECT v.name, v.description, '[]'::jsonb, true
FROM (VALUES
  ('Adjudicação', 'Processo de adjudicação do imóvel'),
  ('Cartório',    'Trâmites e regularização em cartório'),
  ('Prefeitura',  'Regularização junto à Prefeitura')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.regularization_types rt WHERE rt.name = v.name
);
