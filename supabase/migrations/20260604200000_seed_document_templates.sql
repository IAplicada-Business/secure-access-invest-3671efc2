-- Templates provisórios de documentos (Prompt 09).
-- ⚠️ Conteúdo PROVISÓRIO — a Juliê ajusta o texto depois em Configurações.
-- Idempotente: insere cada template só se ainda não existir um com o mesmo nome.
-- O wizard de documentos já consome o template ATIVO por tipo; o AdminReports
-- já usa o template 'relatorio' ativo (as chaves abaixo batem com variablesData).

-- 1) Proposta
INSERT INTO public.document_templates (name, type, content, variables, status)
SELECT
  'Proposta Padrão Tijolo em Capital',
  'proposta',
  E'TIJOLO EM CAPITAL\nPlataforma de Gestão e Regularização de Imóveis\n\n----------------------------------------\n\nPROPOSTA DE PRESTAÇÃO DE SERVIÇOS\n\nData: {{data}}\n\nAo(À) Sr.(a) {{nome_cliente}},\n\nApresentamos a proposta para regularização/aquisição do imóvel\n{{imovel}}, localizado em {{endereco}}.\n\nESCOPO\n- Diagnóstico do imóvel e da documentação\n- Condução do processo de regularização\n- Acompanhamento até a conclusão\n\nVALOR DO SERVIÇO: {{valor_servico}}\nPRAZO ESTIMADO: {{prazo}}\n\nValidade desta proposta: 15 dias.\n\nAtenciosamente,\nTijolo em Capital',
  '[
    {"name":"data","required":true},
    {"name":"nome_cliente","required":true},
    {"name":"imovel","required":true},
    {"name":"endereco","required":false},
    {"name":"valor_servico","required":true},
    {"name":"prazo","required":false}
  ]'::jsonb,
  'ativo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_templates WHERE name = 'Proposta Padrão Tijolo em Capital'
);

-- 2) Contrato
INSERT INTO public.document_templates (name, type, content, variables, status)
SELECT
  'Contrato Padrão Tijolo em Capital',
  'contrato',
  E'TIJOLO EM CAPITAL\nPlataforma de Gestão e Regularização de Imóveis\n\n----------------------------------------\n\nCONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nCONTRATANTE: {{nome_cliente}}, CPF/CNPJ {{cpf_cnpj}}.\nCONTRATADA: Tijolo em Capital.\n\nOBJETO\nPrestação de serviços de regularização/assessoria referente ao imóvel\n{{imovel}}, localizado em {{endereco}}.\n\nVALOR: {{valor_servico}}\nPRAZO: {{prazo}}\n\nFORO: {{foro}}\n\nData: {{data}}\n\n____________________________        ____________________________\n      {{nome_cliente}}                    Tijolo em Capital',
  '[
    {"name":"nome_cliente","required":true},
    {"name":"cpf_cnpj","required":true},
    {"name":"imovel","required":true},
    {"name":"endereco","required":false},
    {"name":"valor_servico","required":true},
    {"name":"prazo","required":false},
    {"name":"foro","required":false},
    {"name":"data","required":true}
  ]'::jsonb,
  'ativo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_templates WHERE name = 'Contrato Padrão Tijolo em Capital'
);

-- 3) Relatório de parceiros (chaves batem com variablesData do AdminReports)
INSERT INTO public.document_templates (name, type, content, variables, status)
SELECT
  'Relatório de Parceiros Tijolo em Capital',
  'relatorio',
  E'TIJOLO EM CAPITAL\nRelatório de Performance de Parceiro\n\n----------------------------------------\n\nParceiro: {{nome_parceiro}}\nTipo: {{tipo_parceiro}}\nPeríodo: {{periodo}}\nData de geração: {{data_geracao}}\n\nRESUMO DE MÉTRICAS\n- Clientes gerados: {{clientes_gerados}}\n- Receita total gerada: {{receita_total}}\n- Comissão paga: {{comissao_paga}}\n- Comissão pendente: {{comissao_pendente}}\n\n----------------------------------------\nRelatório gerado automaticamente pela plataforma Tijolo em Capital.',
  '[
    {"name":"nome_parceiro","required":true},
    {"name":"tipo_parceiro","required":false},
    {"name":"periodo","required":false},
    {"name":"data_geracao","required":false},
    {"name":"clientes_gerados","required":false},
    {"name":"receita_total","required":false},
    {"name":"comissao_paga","required":false},
    {"name":"comissao_pendente","required":false}
  ]'::jsonb,
  'ativo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_templates WHERE name = 'Relatório de Parceiros Tijolo em Capital'
);
