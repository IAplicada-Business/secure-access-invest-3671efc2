-- Task 3: document templates from core Tijolo em Capital documents.
-- Idempotent by template name and intentionally removes placeholder/test templates.

DELETE FROM public.document_templates
WHERE name ILIKE '%teste%'
   OR name ILIKE '%exemplo%'
   OR name ILIKE '%aleatorio%';

WITH template_input (name, type, content, variables, status) AS (
  VALUES
  (
    'Proposta de Regularização Imobiliária Tijolo em Capital',
    'proposta'::public.document_template_type,
    $tpl$
<article style="font-family: Inter, Arial, sans-serif; color: #2f2a1f; line-height: 1.62;">
  <header style="border-top: 8px solid #b8860b; padding: 28px 0 18px; margin-bottom: 24px;">
    <p style="margin: 0; color: #b8860b; letter-spacing: .18em; text-transform: uppercase; font-size: 12px; font-weight: 700;">Tijolo em Capital</p>
    <h1 style="font-family: Fraunces, Georgia, serif; margin: 8px 0 6px; color: #1f1b14; font-size: 30px;">Proposta de Regularização Imobiliária</h1>
    <p style="margin: 0; color: #6f6655;">Diagnóstico documental, due diligence e condução técnica de regularização de imóvel.</p>
  </header>

  <section style="background: #fbf6ea; border-left: 5px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
    <p style="margin: 0;"><strong>Cliente:</strong> {{cliente_nome}}</p>
    <p style="margin: 4px 0 0;"><strong>CPF/CNPJ:</strong> {{cliente_documento}}</p>
    <p style="margin: 4px 0 0;"><strong>E-mail:</strong> {{cliente_email}} &nbsp; <strong>Telefone:</strong> {{cliente_telefone}}</p>
    <p style="margin: 4px 0 0;"><strong>Imóvel:</strong> {{imovel_endereco}}</p>
    <p style="margin: 4px 0 0;"><strong>Data de emissão:</strong> {{data_emissao}}</p>
  </section>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10; border-bottom: 1px solid #d8c089; padding-bottom: 6px;">1. Objetivo da proposta</h2>
  <p>A Tijolo em Capital apresenta proposta para prestação de serviços técnicos especializados de diagnóstico documental, due diligence e regularização imobiliária do imóvel indicado pelo(a) cliente, com metodologia própria e acompanhamento das etapas aplicáveis ao caso concreto.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10; border-bottom: 1px solid #d8c089; padding-bottom: 6px;">2. Escopo sugerido</h2>
  <p>{{servicos_contratados}}</p>
  <ul>
    <li>Análise da matrícula e documentação disponível do imóvel.</li>
    <li>Identificação de pendências registrais, fiscais, urbanísticas ou edilícias.</li>
    <li>Plano de regularização com etapas, riscos e documentos necessários.</li>
    <li>Acompanhamento junto a cartórios, prefeituras e órgãos competentes, quando contratado.</li>
  </ul>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10; border-bottom: 1px solid #d8c089; padding-bottom: 6px;">3. Entregáveis</h2>
  <p>{{entregaveis}}</p>

  <table style="width: 100%; border-collapse: collapse; margin: 22px 0; font-size: 14px;">
    <tbody>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Valor total</th><td style="border: 1px solid #d8c089; padding: 10px;">{{valor_total}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Forma de pagamento</th><td style="border: 1px solid #d8c089; padding: 10px;">{{forma_pagamento}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Prazo estimado</th><td style="border: 1px solid #d8c089; padding: 10px;">{{prazo_dias}} dias, contados do recebimento da documentação completa.</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Validade</th><td style="border: 1px solid #d8c089; padding: 10px;">{{validade_dias}} dias a partir da emissão.</td></tr>
    </tbody>
  </table>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10; border-bottom: 1px solid #d8c089; padding-bottom: 6px;">4. Premissas e despesas de terceiros</h2>
  <p>Custas, emolumentos, certidões, taxas, tributos, deslocamentos e despesas de profissionais terceiros não estão incluídos no valor acima, salvo previsão expressa em proposta complementar aprovada pelo(a) cliente.</p>
  <p>{{observacoes}}</p>

  <footer style="margin-top: 36px; border-top: 1px solid #d8c089; padding-top: 16px;">
    <p>Atenciosamente,</p>
    <p><strong>Juliê de Mattos</strong><br />Tijolo em Capital - J IMOBI Gestão e Negócios Ltda.<br />contato@tijoloemcapital.com.br</p>
  </footer>
</article>
$tpl$,
    '[
      {"name":"cliente_nome","required":true},
      {"name":"cliente_documento","required":false},
      {"name":"cliente_email","required":false},
      {"name":"cliente_telefone","required":false},
      {"name":"imovel_endereco","required":true},
      {"name":"servicos_contratados","required":true,"type":"textarea"},
      {"name":"entregaveis","required":false,"type":"textarea"},
      {"name":"valor_total","required":true},
      {"name":"forma_pagamento","required":true},
      {"name":"prazo_dias","required":true},
      {"name":"validade_dias","required":false},
      {"name":"observacoes","required":false,"type":"textarea"},
      {"name":"data_emissao","required":true}
    ]'::jsonb,
    'ativo'::public.document_template_status
  ),
  (
    'Contrato de Prestação de Serviços - Regularização Imobiliária',
    'contrato'::public.document_template_type,
    $tpl$
<article style="font-family: Inter, Arial, sans-serif; color: #2f2a1f; line-height: 1.6;">
  <header style="border-top: 8px solid #b8860b; padding: 28px 0 18px; margin-bottom: 22px;">
    <p style="margin: 0; color: #b8860b; letter-spacing: .18em; text-transform: uppercase; font-size: 12px; font-weight: 700;">Tijolo em Capital</p>
    <h1 style="font-family: Fraunces, Georgia, serif; margin: 8px 0 6px; color: #1f1b14; font-size: 28px;">Contrato de Prestação de Serviços de Diagnóstico e Regularização Imobiliária</h1>
    <p style="margin: 0; color: #6f6655;">Serviços técnicos especializados em regularização de imóveis irregulares e atípicos.</p>
  </header>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Partes</h2>
  <p><strong>Contratada:</strong> TIJOLO EM CAPITAL J IMOBI GESTÃO E NEGÓCIOS LTDA., CNPJ 43.126.462/0001-62, com endereço comercial na Rua Santo Antônio, nº 43, salas 406 e 407, Centro, Guarulhos/SP, CEP 07110-150, e e-mail contato@tijoloemcapital.com.br.</p>
  <p><strong>Contratante:</strong> {{cliente_nome}}, CPF/CNPJ {{cliente_documento}}, com endereço em {{cliente_endereco}}, e-mail {{cliente_email}} e telefone {{cliente_telefone}}.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 1 - Objeto</h2>
  <p>O presente contrato tem por objeto a prestação, pela Contratada ao(à) Contratante, de serviços técnicos especializados de diagnóstico documental, due diligence e/ou regularização do imóvel identificado abaixo, mediante metodologia própria da Contratada, incluindo, conforme aplicável, Método DRI, Método IDP, elaboração de laudo estruturado e demais entregáveis contratados.</p>

  <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
    <tbody>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Imóvel objeto</th><td style="border: 1px solid #d8c089; padding: 10px;">{{imovel_endereco}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Matrícula / Cartório</th><td style="border: 1px solid #d8c089; padding: 10px;">{{imovel_matricula}} - {{imovel_cartorio}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Serviços contratados</th><td style="border: 1px solid #d8c089; padding: 10px;">{{servicos_contratados}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Entregáveis</th><td style="border: 1px solid #d8c089; padding: 10px;">{{entregaveis}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Valor total</th><td style="border: 1px solid #d8c089; padding: 10px;">{{valor_total}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Forma de pagamento</th><td style="border: 1px solid #d8c089; padding: 10px;">{{forma_pagamento}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Prazo estimado</th><td style="border: 1px solid #d8c089; padding: 10px;">{{prazo_dias}} dias</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Data de início</th><td style="border: 1px solid #d8c089; padding: 10px;">{{data_inicio}}</td></tr>
    </tbody>
  </table>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 2 - Escopo, entregáveis e aceite</h2>
  <p>O escopo específico dos serviços, etapas, documentos e relatórios a serem entregues ao(à) Contratante está descrito neste instrumento. Serviços adicionais decorrentes de exigências supervenientes, pendências não identificáveis no diagnóstico inicial ou alteração legislativa serão previamente comunicados e orçados, somente sendo executados mediante aprovação expressa.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 3 - Prazo de execução</h2>
  <p>O prazo estimado de execução é de {{prazo_dias}} dias, contado da assinatura e do recebimento da documentação e informações necessárias. O prazo poderá ser prorrogado por fatores alheios à vontade da Contratada, incluindo prazos de cartórios, prefeituras, órgãos públicos, concessionárias ou atraso no fornecimento de documentos pelo(a) Contratante.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 4 - Valor, pagamento e despesas</h2>
  <p>Pelos serviços, o(a) Contratante pagará à Contratada o valor de {{valor_total}}, na forma {{forma_pagamento}}. Custas, emolumentos, taxas, tributos, certidões, deslocamentos e despesas de terceiros necessários à regularização do imóvel serão de responsabilidade exclusiva do(a) Contratante, salvo ajuste expresso em contrário.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 5 - Obrigações do(a) Contratante</h2>
  <ul>
    <li>Fornecer documentos, informações e autorizações necessários à execução dos serviços.</li>
    <li>Responder pela veracidade, exatidão e completude das informações fornecidas.</li>
    <li>Outorgar procuração específica quando necessária para atuação perante órgãos competentes.</li>
    <li>Efetuar pagamentos e reembolsos nos prazos pactuados.</li>
  </ul>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 6 - Obrigações da Contratada</h2>
  <p>A Contratada empregará seus melhores esforços técnicos e diligência profissional, manterá o(a) Contratante informado(a) sobre o andamento dos trabalhos, guardará sigilo das informações recebidas, emitirá documento fiscal/recibo e zelará pelos documentos originais eventualmente entregues.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 7 - Natureza da obrigação</h2>
  <p>Os serviços constituem obrigação de meio, e não de resultado, pois a regularização imobiliária depende de atos, prazos, exigências e decisões de terceiros e órgãos públicos alheios ao controle da Contratada.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 8 - Confidencialidade, propriedade intelectual e LGPD</h2>
  <p>As partes manterão sigilo sobre informações e documentos trocados em razão deste contrato. Laudos, pareceres, relatórios, planilhas, metodologias e materiais elaborados pela Contratada permanecem de sua propriedade intelectual. As partes tratarão dados pessoais conforme a Lei nº 13.709/2018 (LGPD).</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">Cláusula 9 - Vigência, rescisão, assinatura eletrônica e foro</h2>
  <p>Este contrato vigora até a conclusão do objeto contratado ou pelo prazo ajustado. As partes reconhecem a validade da assinatura eletrônica via D4Sign. Fica eleito o foro da Comarca de {{foro}}, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

  <footer style="margin-top: 36px; border-top: 1px solid #d8c089; padding-top: 16px;">
    <p>{{data_emissao}}</p>
    <p><strong>Contratada:</strong> Tijolo em Capital - J IMOBI Gestão e Negócios Ltda.</p>
    <p><strong>Contratante:</strong> {{cliente_nome}}</p>
  </footer>
</article>
$tpl$,
    '[
      {"name":"cliente_nome","required":true},
      {"name":"cliente_documento","required":true},
      {"name":"cliente_email","required":false},
      {"name":"cliente_telefone","required":false},
      {"name":"cliente_endereco","required":false},
      {"name":"imovel_endereco","required":true},
      {"name":"imovel_matricula","required":false},
      {"name":"imovel_cartorio","required":false},
      {"name":"servicos_contratados","required":true,"type":"textarea"},
      {"name":"entregaveis","required":false,"type":"textarea"},
      {"name":"valor_total","required":true},
      {"name":"forma_pagamento","required":true},
      {"name":"prazo_dias","required":true},
      {"name":"data_inicio","required":false},
      {"name":"foro","required":false},
      {"name":"data_emissao","required":true}
    ]'::jsonb,
    'ativo'::public.document_template_status
  ),
  (
    'NDA Investidor Tijolo em Capital',
    'contrato'::public.document_template_type,
    $tpl$
<article style="font-family: Inter, Arial, sans-serif; color: #2f2a1f; line-height: 1.62;">
  <header style="border-top: 8px solid #b8860b; padding: 28px 0 18px; margin-bottom: 22px;">
    <p style="margin: 0; color: #b8860b; letter-spacing: .18em; text-transform: uppercase; font-size: 12px; font-weight: 700;">Tijolo em Capital</p>
    <h1 style="font-family: Fraunces, Georgia, serif; margin: 8px 0 6px; color: #1f1b14; font-size: 28px;">Termo de Confidencialidade e Acesso Personalizado a Oportunidades Imobiliárias</h1>
    <p style="margin: 0; color: #6f6655;">Acesso exclusivo à carteira de imóveis da Tijolo em Capital - NDA.</p>
  </header>

  <p><strong>Tijolo em Capital:</strong> TIJOLO EM CAPITAL J IMOBI GESTÃO E NEGÓCIOS LTDA., CNPJ 43.126.462/0001-62, Rua Santo Antônio, nº 43, salas 406 e 407, Centro, Guarulhos/SP.</p>
  <p><strong>Investidor(a):</strong> {{cliente_nome}}, CPF/CNPJ {{cliente_documento}}, endereço {{cliente_endereco}}, e-mail {{cliente_email}}, telefone {{cliente_telefone}}.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">1. Objeto</h2>
  <p>A Tijolo em Capital disponibilizará ao(à) investidor(a), de forma personalizada e adequada ao seu perfil e interesse de investimento, acesso a informações sobre imóveis, oportunidades de aquisição, análises técnicas e demais dados constantes de sua carteira e plataforma de oportunidades imobiliárias.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">2. Informações confidenciais</h2>
  <p>São informações confidenciais todos os dados, documentos e materiais disponibilizados pela Tijolo em Capital, incluindo endereços, matrículas, dados de proprietários, valores, condições de negociação, status de regularização, listas, carteiras, laudos, metodologias próprias, propostas e projeções financeiras.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">3. Obrigações do(a) investidor(a)</h2>
  <ul>
    <li>Manter sigilo absoluto sobre as informações recebidas.</li>
    <li>Não divulgar, compartilhar, reproduzir, fotografar, encaminhar ou disponibilizar informações a terceiros sem autorização prévia e escrita.</li>
    <li>Utilizar as informações exclusivamente para avaliação de investimento próprio.</li>
  </ul>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">4. Não circunvenção</h2>
  <p>O(a) investidor(a) compromete-se a não negociar direta ou indiretamente com proprietários, possuidores ou terceiros identificados por meio das informações confidenciais, sem a intermediação da Tijolo em Capital, pelo prazo de {{prazo_nao_circunvencao_meses}} meses.</p>
  <p>O descumprimento sujeitará o(a) investidor(a) ao pagamento de multa de {{multa_nao_circunvencao}}, sem prejuízo de perdas e danos e cancelamento do acesso.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">5. Propriedade, vigência e LGPD</h2>
  <p>As informações, carteira, portfólio, metodologias e materiais permanecem de propriedade exclusiva da Tijolo em Capital. As obrigações de confidencialidade permanecerão em vigor por {{prazo_confidencialidade_anos}} anos. As partes tratarão dados pessoais conforme a LGPD.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">6. Revogação, assinatura eletrônica e foro</h2>
  <p>A Tijolo em Capital poderá suspender ou cancelar o acesso a qualquer tempo, sem prejuízo das obrigações de confidencialidade e não circunvenção. As partes reconhecem a assinatura eletrônica via D4Sign. Fica eleito o foro da Comarca de {{foro}}.</p>

  <footer style="margin-top: 36px; border-top: 1px solid #d8c089; padding-top: 16px;">
    <p>{{data_emissao}}</p>
    <p><strong>Tijolo em Capital</strong> - Juliê de Mattos</p>
    <p><strong>Investidor(a):</strong> {{cliente_nome}}</p>
  </footer>
</article>
$tpl$,
    '[
      {"name":"cliente_nome","required":true},
      {"name":"cliente_documento","required":true},
      {"name":"cliente_email","required":false},
      {"name":"cliente_telefone","required":false},
      {"name":"cliente_endereco","required":false},
      {"name":"prazo_nao_circunvencao_meses","required":true},
      {"name":"multa_nao_circunvencao","required":true},
      {"name":"prazo_confidencialidade_anos","required":true},
      {"name":"foro","required":false},
      {"name":"data_emissao","required":true}
    ]'::jsonb,
    'ativo'::public.document_template_status
  ),
  (
    'Termo de Parceria com Imobiliárias',
    'contrato'::public.document_template_type,
    $tpl$
<article style="font-family: Inter, Arial, sans-serif; color: #2f2a1f; line-height: 1.62;">
  <header style="border-top: 8px solid #b8860b; padding: 28px 0 18px; margin-bottom: 22px;">
    <p style="margin: 0; color: #b8860b; letter-spacing: .18em; text-transform: uppercase; font-size: 12px; font-weight: 700;">Tijolo em Capital</p>
    <h1 style="font-family: Fraunces, Georgia, serif; margin: 8px 0 6px; color: #1f1b14; font-size: 28px;">Termo de Parceria Comercial para Indicação de Clientes</h1>
    <p style="margin: 0; color: #6f6655;">Comissionamento por indicação e fechamento efetivo de clientes de regularização imobiliária.</p>
  </header>

  <p><strong>Tijolo em Capital:</strong> TIJOLO EM CAPITAL J IMOBI GESTÃO E NEGÓCIOS LTDA., CNPJ 43.126.462/0001-62.</p>
  <p><strong>Parceira:</strong> {{parceiro_nome}}, CPF/CNPJ {{parceiro_documento}}, CRECI {{parceiro_creci}}, endereço {{parceiro_endereco}}, e-mail {{parceiro_email}}, telefone {{parceiro_telefone}}, representada por {{parceiro_representante_nome}}.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">1. Objeto</h2>
  <p>Este termo estabelece parceria comercial pela qual a Parceira indicará à Tijolo em Capital pessoas físicas ou jurídicas proprietárias, possuidoras, promitentes compradoras ou interessadas em imóveis irregulares, atípicos ou com pendências documentais, com interesse nos serviços de diagnóstico, regularização, due diligence e consultoria imobiliária.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">2. Formalização da indicação</h2>
  <p>Toda indicação deverá ser formalizada por escrito, contendo nome ou razão social do cliente indicado, telefone e/ou e-mail de contato e breve descrição da demanda ou do imóvel envolvido. A Tijolo em Capital confirmará o recebimento em até 2 dias úteis, marco inicial de vinculação do cliente à Parceira.</p>
  <p>A vinculação vigorará pelo prazo de {{prazo_vinculacao_dias}} dias corridos, contados da confirmação de recebimento.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">3. Comissão</h2>
  <p>Pela indicação que resultar em contratação e pagamento efetivo dos serviços, a Tijolo em Capital pagará à Parceira comissão correspondente a {{percentual_comissao}} sobre o valor líquido recebido a título de serviços de regularização, diagnóstico, consultoria ou correlatos.</p>
  <p>O pagamento será realizado em até {{prazo_pagamento_dias}} dias úteis do recebimento de cada valor pago pelo cliente indicado, mediante depósito ou transferência para os dados bancários informados abaixo.</p>

  <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
    <tbody>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Titular</th><td style="border: 1px solid #d8c089; padding: 10px;">{{banco_titular}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">CPF/CNPJ</th><td style="border: 1px solid #d8c089; padding: 10px;">{{banco_documento}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Banco / Agência / Conta</th><td style="border: 1px solid #d8c089; padding: 10px;">{{banco_nome}} - {{banco_agencia}} - {{banco_conta}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">PIX</th><td style="border: 1px solid #d8c089; padding: 10px;">{{banco_pix}}</td></tr>
    </tbody>
  </table>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">4. Responsabilidade e transparência</h2>
  <p>A Parceira atua exclusivamente como agente de indicação, não participando da execução técnica, jurídica ou operacional dos serviços de regularização, cuja responsabilidade é exclusiva da Tijolo em Capital. As partes comprometem-se a atuar com transparência recíproca e a informar situações de conflito de interesses.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">5. Confidencialidade, marca e dados pessoais</h2>
  <p>As partes manterão sigilo sobre informações confidenciais trocadas em razão da parceria, incluindo dados de clientes, condições comerciais e metodologias próprias. O uso de marca, nome, logotipo ou imagem dependerá de autorização prévia e expressa. As partes tratarão dados pessoais em conformidade com a LGPD.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">6. Vigência, rescisão e foro</h2>
  <p>O termo vigorará por {{vigencia_meses}} meses, renovando-se automaticamente por períodos iguais, salvo manifestação contrária. Qualquer parte poderá rescindir mediante aviso prévio de {{aviso_previo_dias}} dias. Fica eleito o foro da Comarca de {{foro}}.</p>

  <footer style="margin-top: 36px; border-top: 1px solid #d8c089; padding-top: 16px;">
    <p>{{data_emissao}}</p>
    <p><strong>Tijolo em Capital</strong> - Juliê de Mattos</p>
    <p><strong>Parceira:</strong> {{parceiro_nome}}</p>
  </footer>
</article>
$tpl$,
    '[
      {"name":"parceiro_nome","required":true},
      {"name":"parceiro_documento","required":true},
      {"name":"parceiro_creci","required":false},
      {"name":"parceiro_endereco","required":false},
      {"name":"parceiro_email","required":false},
      {"name":"parceiro_telefone","required":false},
      {"name":"parceiro_representante_nome","required":false},
      {"name":"percentual_comissao","required":true},
      {"name":"prazo_vinculacao_dias","required":true},
      {"name":"prazo_pagamento_dias","required":true},
      {"name":"banco_titular","required":false},
      {"name":"banco_documento","required":false},
      {"name":"banco_nome","required":false},
      {"name":"banco_agencia","required":false},
      {"name":"banco_conta","required":false},
      {"name":"banco_pix","required":false},
      {"name":"vigencia_meses","required":false},
      {"name":"aviso_previo_dias","required":false},
      {"name":"foro","required":false},
      {"name":"data_emissao","required":true}
    ]'::jsonb,
    'ativo'::public.document_template_status
  ),
  (
    'Termo de Autorização de Imóvel na Plataforma Tijolo em Capital',
    'contrato'::public.document_template_type,
    $tpl$
<article style="font-family: Inter, Arial, sans-serif; color: #2f2a1f; line-height: 1.62;">
  <header style="border-top: 8px solid #b8860b; padding: 28px 0 18px; margin-bottom: 22px;">
    <p style="margin: 0; color: #b8860b; letter-spacing: .18em; text-transform: uppercase; font-size: 12px; font-weight: 700;">Tijolo em Capital</p>
    <h1 style="font-family: Fraunces, Georgia, serif; margin: 8px 0 6px; color: #1f1b14; font-size: 28px;">Termo de Autorização para Divulgação de Imóvel na Plataforma</h1>
    <p style="margin: 0; color: #6f6655;">Autorização do(a) proprietário(a) com anuência da imobiliária parceira indicadora.</p>
  </header>

  <p><strong>Tijolo em Capital:</strong> TIJOLO EM CAPITAL J IMOBI GESTÃO E NEGÓCIOS LTDA., CNPJ 43.126.462/0001-62.</p>
  <p><strong>Parceira:</strong> {{parceiro_nome}}, CPF/CNPJ {{parceiro_documento}}, CRECI {{parceiro_creci}}, e-mail {{parceiro_email}}.</p>
  <p><strong>Proprietário(a):</strong> {{cliente_nome}}, CPF/CNPJ {{cliente_documento}}, endereço {{cliente_endereco}}, e-mail {{cliente_email}}, telefone {{cliente_telefone}}.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">1. Objeto</h2>
  <p>O(a) proprietário(a) autoriza a Tijolo em Capital a incluir o imóvel identificado neste termo em sua plataforma e carteira de oportunidades imobiliárias, para fins de diagnóstico, análise documental, eventual regularização e/ou divulgação a investidores cadastrados.</p>
  <p>A Parceira figura como responsável pela indicação do imóvel e do(a) proprietário(a), nos termos de parceria comercial próprio.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">2. Imóvel</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
    <tbody>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Endereço</th><td style="border: 1px solid #d8c089; padding: 10px;">{{imovel_endereco}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Matrícula</th><td style="border: 1px solid #d8c089; padding: 10px;">{{imovel_matricula}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Cartório</th><td style="border: 1px solid #d8c089; padding: 10px;">{{imovel_cartorio}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Irregularidade conhecida</th><td style="border: 1px solid #d8c089; padding: 10px;">{{tipo_irregularidade}}</td></tr>
      <tr><th style="text-align: left; background: #f4e9ce; color: #7a5c10; border: 1px solid #d8c089; padding: 10px;">Valor pretendido</th><td style="border: 1px solid #d8c089; padding: 10px;">{{valor_pretendido}}</td></tr>
    </tbody>
  </table>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">3. Natureza da autorização</h2>
  <p>A autorização é concedida em caráter {{autorizacao_exclusividade}}, pelo prazo de {{prazo_meses}} meses, não obrigando o(a) proprietário(a) a vender, alugar ou dispor do imóvel, tampouco garantindo a efetivação de negócio jurídico.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">4. Divulgação e confidencialidade</h2>
  <p>As informações e documentos do imóvel poderão ser disponibilizados a investidores cadastrados e vinculados a termo de confidencialidade específico, sendo vedada divulgação pública, irrestrita ou indiscriminada dos dados do imóvel e do(a) proprietário(a). Fotografias, plantas e descrições poderão ser utilizadas para diagnóstico interno e apresentação controlada.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">5. Veracidade, gratuidade e serviços futuros</h2>
  <p>O(a) proprietário(a) declara deter poderes para autorizar a divulgação e responde pela veracidade das informações fornecidas. A inclusão do imóvel na plataforma, por si só, não gera obrigação de pagamento. Serviços de diagnóstico, regularização ou consultoria serão contratados por instrumento específico.</p>

  <h2 style="font-family: Fraunces, Georgia, serif; color: #7a5c10;">6. Prazo, revogação, LGPD e foro</h2>
  <p>A autorização vigorará por {{prazo_meses}} meses, renovando-se automaticamente salvo manifestação contrária. O(a) proprietário(a) poderá revogar a autorização por escrito. As partes tratarão dados pessoais conforme a LGPD. Fica eleito o foro da Comarca de {{foro}}.</p>

  <footer style="margin-top: 36px; border-top: 1px solid #d8c089; padding-top: 16px;">
    <p>{{data_emissao}}</p>
    <p><strong>Tijolo em Capital</strong> - Juliê de Mattos</p>
    <p><strong>Parceira:</strong> {{parceiro_nome}}</p>
    <p><strong>Proprietário(a):</strong> {{cliente_nome}}</p>
  </footer>
</article>
$tpl$,
    '[
      {"name":"cliente_nome","required":true},
      {"name":"cliente_documento","required":true},
      {"name":"cliente_email","required":false},
      {"name":"cliente_telefone","required":false},
      {"name":"cliente_endereco","required":false},
      {"name":"parceiro_nome","required":false},
      {"name":"parceiro_documento","required":false},
      {"name":"parceiro_creci","required":false},
      {"name":"parceiro_email","required":false},
      {"name":"imovel_endereco","required":true},
      {"name":"imovel_matricula","required":false},
      {"name":"imovel_cartorio","required":false},
      {"name":"tipo_irregularidade","required":false},
      {"name":"valor_pretendido","required":false},
      {"name":"autorizacao_exclusividade","required":false},
      {"name":"prazo_meses","required":true},
      {"name":"foro","required":false},
      {"name":"data_emissao","required":true}
    ]'::jsonb,
    'ativo'::public.document_template_status
  )
),
updated AS (
  UPDATE public.document_templates AS target
  SET
    type = source.type,
    content = source.content,
    variables = source.variables,
    status = source.status
  FROM template_input AS source
  WHERE target.name = source.name
  RETURNING target.name
)
INSERT INTO public.document_templates (name, type, content, variables, status)
SELECT source.name, source.type, source.content, source.variables, source.status
FROM template_input AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM updated
  WHERE updated.name = source.name
);
