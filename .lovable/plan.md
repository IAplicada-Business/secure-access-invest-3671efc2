
# Sprint 1: Melhorias no Catalogo de Imoveis JMob

Este plano abrange tres blocos principais de funcionalidades: novos campos e filtros, melhorias na pagina de detalhes, e rastreamento avancado de interesse.

---

## Bloco 1 - Novos Campos + Cards + Filtros

### 1.1 Migracao do Banco de Dados

Adicionar novos campos na tabela `properties`:

```text
+------------------------+-------------+----------------------------------+
| Campo                  | Tipo        | Descricao                        |
+------------------------+-------------+----------------------------------+
| highlight_tag          | text        | Tag de destaque (OPORTUNIDADE)   |
| investor_notes         | text        | Notas visiveis na ficha          |
| latitude               | decimal     | Coordenada geografica            |
| longitude              | decimal     | Coordenada geografica            |
| risk_level             | text        | baixo, medio, alto (default)     |
| has_matricula          | boolean     | Documentacao disponivel          |
| has_planta             | boolean     | Documentacao disponivel          |
| has_iptu               | boolean     | Documentacao disponivel          |
| has_certidoes          | boolean     | Documentacao disponivel          |
+------------------------+-------------+----------------------------------+
```

### 1.2 Atualizar PropertyCard

**Arquivo:** `src/components/PropertyCard.tsx`

- Adicionar badge de `highlight_tag` no canto superior esquerdo
- Estilo: fundo dourado (primary), texto branco, fonte bold
- Condicional: so exibe se highlight_tag nao for null/vazio

### 1.3 Filtros e Ordenacao no Catalogo

**Arquivo:** `src/pages/Catalog.tsx`

Adicionar acima da grid:
- **Select de Ordenacao:**
  - Mais recentes (created_at DESC) - padrao
  - Maior valorizacao (calculo percentual DESC)
  - Menor investimento (acquisition_cost ASC)
  - Maior investimento (acquisition_cost DESC)

- **Select de Tipo de Imovel:**
  - Todos, Casa, Terreno, Apartamento, Comercial

- **Select de Cidade:**
  - Dinamico baseado nas cidades distintas dos imoveis publicados

Layout responsivo: empilhado em mobile, lado a lado em desktop.

### 1.4 Atualizar PropertyForm Admin

**Arquivo:** `src/pages/admin/PropertyForm.tsx`

Nova secao "Informacoes Complementares":
- Campo `highlight_tag` (texto, opcional)
- Campo `investor_notes` (textarea, opcional)
- Select `risk_level` (Baixo/Medio/Alto, default Medio)
- Inputs `latitude` e `longitude` (numericos, lado a lado)
- Checkboxes de documentacao (has_matricula, has_planta, has_iptu, has_certidoes)

### 1.5 Atualizar Tipos TypeScript

**Arquivo:** `src/types/database.ts`

Adicionar novos campos na interface Property.

---

## Bloco 2 - Melhorias na Pagina de Detalhes

### 2.1 Carrossel de Imagens

**Arquivo:** `src/pages/PropertyDetails.tsx`

Substituir galeria empilhada por carrossel horizontal:
- Navegacao por setas (esquerda/direita)
- Indicadores de pagina (dots)
- Suporte a swipe/touch em mobile
- Aspect ratio 16:9 com object-fit cover
- Usando Embla Carousel (ja instalado como dependencia)

### 2.2 Secao de Riscos Melhorada

**Arquivo:** `src/pages/PropertyDetails.tsx`

Adicionar badge visual de nivel de risco acima do texto:
- Risco Baixo: fundo verde-claro, icone ShieldCheck
- Risco Medio: fundo amarelo-claro, icone AlertTriangle
- Risco Alto: fundo vermelho-claro, icone AlertOctagon

### 2.3 Secao Documentacao Disponivel

**Arquivo:** `src/pages/PropertyDetails.tsx`

Nova secao com grid 2x2:
- Matricula (FileText)
- Planta Aprovada (Map)
- IPTU em Dia (Receipt)
- Certidoes (FileCheck)

Cada item mostra CheckCircle (verde) se true, XCircle (cinza) se false.

### 2.4 Notas do Investidor

**Arquivo:** `src/pages/PropertyDetails.tsx`

Se `investor_notes` preenchido:
- Card com fundo primary/5%, borda dourada
- Icone Info, titulo "Observacoes para o Investidor"
- Posicionado acima do CTA fixo

### 2.5 Mapa de Localizacao

**Arquivo:** `src/pages/PropertyDetails.tsx`

Se latitude e longitude preenchidos:
- Iframe do Google Maps abaixo do endereco
- Altura 200px mobile, 250px desktop
- Bordas arredondadas

---

## Bloco 3 - Rastreamento Avancado

### 3.1 Migracao: scroll_depth na page_views

```text
ALTER TABLE page_views ADD COLUMN scroll_depth_percent integer DEFAULT 0;
```

### 3.2 Nova Tabela: cta_clicks

```text
+------------------+-------------+----------------------------------+
| Campo            | Tipo        | Descricao                        |
+------------------+-------------+----------------------------------+
| id               | uuid        | Chave primaria                   |
| access_link_id   | uuid        | FK para access_links             |
| property_id      | uuid        | FK para properties               |
| clicked_at       | timestamptz | Timestamp do clique              |
+------------------+-------------+----------------------------------+
```

RLS: insert anonimo permitido, select apenas admin.

### 3.3 Nova Tabela: notifications

```text
+------------------+-------------+----------------------------------+
| Campo            | Tipo        | Descricao                        |
+------------------+-------------+----------------------------------+
| id               | uuid        | Chave primaria                   |
| type             | text        | hot_lead, new_view, system       |
| title            | text        | Titulo da notificacao            |
| message          | text        | Corpo da mensagem                |
| is_read          | boolean     | Lida ou nao                      |
| metadata         | jsonb       | Dados extras                     |
| created_at       | timestamptz | Timestamp de criacao             |
+------------------+-------------+----------------------------------+
```

RLS: full access para admin, insert anonimo permitido.

### 3.4 Rastreamento de Scroll Depth

**Arquivo:** `src/pages/PropertyDetails.tsx`

- Listener de scroll calculando percentual maximo
- Formula: (scrollTop + windowHeight) / documentHeight * 100
- Salvar junto com time_spent_seconds no onUnmount

### 3.5 Rastreamento de Cliques CTA

**Arquivo:** `src/pages/PropertyDetails.tsx`

- Ao clicar no botao WhatsApp, inserir registro em cta_clicks
- Insert assincrono (fire and forget)
- Nao bloqueia abertura do WhatsApp

### 3.6 Sistema de Score de Interesse

**Nova Edge Function:** `supabase/functions/calculate-interest-score/index.ts`

Calculo de pontuacao:
- time_spent > 120s: +5 pontos
- time_spent > 60s: +3 pontos
- scroll_depth > 75%: +2 pontos
- clique no CTA: +10 pontos

Se score >= 10: criar notificacao "hot_lead" (sem duplicar).

### 3.7 Icone de Notificacoes no Admin

**Arquivo:** `src/pages/admin/AdminLayout.tsx`

- Icone Bell no header ao lado do logout
- Badge vermelho com contagem de nao lidas
- Popover com lista das ultimas 20 notificacoes
- Opcao "Marcar todas como lidas"
- Poll automatico a cada 60 segundos

### 3.8 Melhorias no Relatorio Admin

**Arquivo:** `src/pages/admin/AdminReports.tsx`

Novas colunas na tabela:
- **Scroll:** progress bar colorida (vermelho < 25%, amarelo 25-75%, verde > 75%)
- **CTA:** icone Check verde ou traco cinza
- **Score:** pontuacao calculada com destaque visual

Novos cards de metricas:
- Leads Quentes (score >= 10)
- Cliques no WhatsApp (total cta_clicks)

Filtro por periodo: 7 dias, 30 dias, todos.
Ordenacao por score DESC (padrao).

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar novos campos e tabelas |
| `src/types/database.ts` | Adicionar novos tipos |
| `src/components/PropertyCard.tsx` | Badge highlight_tag |
| `src/pages/Catalog.tsx` | Filtros e ordenacao |
| `src/pages/admin/PropertyForm.tsx` | Novos campos |
| `src/pages/PropertyDetails.tsx` | Carrossel, docs, mapa, scroll tracking |
| `src/pages/admin/AdminLayout.tsx` | Sistema notificacoes |
| `src/pages/admin/AdminReports.tsx` | Colunas score, CTA, scroll |
| `supabase/functions/calculate-interest-score/` | Edge function score |

---

## Notas Tecnicas

- **Embla Carousel:** Ja instalado (`embla-carousel-react ^8.6.0`)
- **shadcn/ui:** Usar Select, Popover, Badge, Progress existentes
- **TanStack Query:** Usar para todas queries e mutations
- **RLS:** Tabelas publicas permitem insert anonimo; notifications requer admin
- **Edge Function:** Chamar apos update page_view e insert cta_click (fire and forget)
