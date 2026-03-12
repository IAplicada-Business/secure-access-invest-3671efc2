

# Comunicações com IA para WhatsApp

## Banco de dados

Duas novas tabelas com RLS para admin:

**`communications`**: `id`, `title`, `type` (enum: newsletter/aviso/oferta/personalizada), `tone` (enum: informativo/comercial/relacionamento), `briefing_topic`, `briefing_points`, `generated_content`, `final_content`, `audience_type` (enum: all_partners/partner_type/all_clients/manual), `audience_filter` (text, nullable — armazena tipo de parceiro quando audience_type = partner_type), `status` (enum: rascunho/pronta/enviada), `created_at`

**`communication_recipients`**: `id`, `communication_id` (FK → communications), `contact_type` (enum: partner/client), `contact_id` (uuid), `contact_name` (text), `contact_phone` (text), `sent_at` (timestamp, nullable)

RLS: admin-only para ambas.

## Edge function para geração com IA

Nova edge function `generate-communication` que recebe `type`, `tone`, `topic`, `points` e chama a Lovable AI (modelo `openai/gpt-5-mini`) com prompt estruturado sobre a JMob. Retorna texto formatado para WhatsApp (sem markdown, com bullets •, quebras de linha naturais).

Motivo de usar edge function em vez de chamada direta: a API key fica protegida no servidor.

## Nova página: AdminCommunications

Rota `/admin/comunicacoes` com:

- **Listagem**: tabela com título, tipo, público-alvo, data, status, ações (editar, duplicar, arquivar)
- **Botão "Nova Comunicação"**: abre wizard de 5 etapas

### Wizard de 5 etapas

1. **Configuração**: tipo, público-alvo (com sub-seleção de tipo de parceiro se aplicável), tom
2. **Briefing**: tema principal + pontos obrigatórios → botão "Gerar com IA" chama a edge function
3. **Revisão**: texto gerado exibido formatado como WhatsApp. Botões: editar manualmente, gerar novamente, aceitar
4. **Destinatários**: se manual, lista de contatos (partners + clients ativos com telefone) com checkbox. Se automático, resumo "X contatos". Cada contato mostra nome, tipo, telefone, última interação
5. **Finalização**: salva com status "Pronta". Mostra texto final com botão copiar. Lista de destinatários com botão WhatsApp individual (`https://wa.me/{phone}?text={encoded}`)

## Marcação de envio e histórico

Cada destinatário tem um botão "Marcar como enviado" ao lado do botão WhatsApp. Ao marcar:
- Atualiza `sent_at` em `communication_recipients`
- Insere interação em `partner_interactions` ou `client_interactions` (tipo "newsletter", nota com título da comunicação)

Quando todos os destinatários estão marcados, status da comunicação muda para "Enviada".

## Navegação

Adicionar "Comunicações" como link direto no header do `AdminLayout.tsx` (ícone `MessageSquare`), entre Documentos e CRM. Adicionar rota em `App.tsx`.

## Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar enums + tabelas `communications` e `communication_recipients` |
| `supabase/functions/generate-communication/index.ts` | Nova edge function com Lovable AI |
| `src/pages/admin/AdminCommunications.tsx` | Nova página: listagem + wizard |
| `src/pages/admin/AdminLayout.tsx` | Adicionar link "Comunicações" na nav |
| `src/App.tsx` | Adicionar rota `/admin/comunicacoes` |
| `src/types/database.ts` | Adicionar tipos Communication e CommunicationRecipient |

