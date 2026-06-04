-- Seed inicial de tipos de regularização (Prompt 12). Idempotente: insere
-- cada tipo só se ainda não existir um com o mesmo nome.
INSERT INTO public.regularization_types (name, description, checklist_template, is_active)
SELECT v.name, v.description, '[]'::jsonb, true
FROM (VALUES
  ('Averbação',            'Averbação de construção/ampliação na matrícula'),
  ('Herança',              'Regularização de transmissão por herança'),
  ('Inventário',           'Inventário (judicial ou extrajudicial)'),
  ('Usucapião',            'Usucapião (extrajudicial ou judicial)'),
  ('AVCB',                 'Auto de Vistoria do Corpo de Bombeiros'),
  ('IPTU',                 'Regularização de IPTU / situação fiscal'),
  ('Retificação de área',  'Retificação de área/registro'),
  ('Ação demarcatória',    'Demarcação de limites do imóvel'),
  ('Divórcio',             'Partilha de bens em divórcio'),
  ('Espólio',              'Regularização de espólio')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.regularization_types rt WHERE rt.name = v.name
);
