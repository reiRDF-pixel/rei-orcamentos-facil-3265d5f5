## Objetivo

Permitir que múltiplas pessoas que compartilham a mesma conta de login escolham, na hora de criar/editar o orçamento, **qual vendedor** aparece no PDF e no link público — sem misturar nomes.

## Como vai funcionar (visão do usuário)

1. Na tela **Meu Perfil**, além do perfil da conta, aparece uma nova seção **"Vendedores desta conta"** com uma lista de perfis de vendedor cadastráveis (nome, cargo, telefone, WhatsApp, e-mail, assinatura, logo, PIX, mensagem padrão, etc. — os mesmos campos que já existem hoje no perfil).
   - Botões: Adicionar, Editar, Excluir, marcar um como **"padrão"**.
2. No **editor de orçamentos** (novo e edição de rascunho), no topo aparece um campo **"Vendedor responsável"** com a lista de vendedores da conta. Vem pré-selecionado o padrão; a pessoa troca antes de salvar se for o caso.
3. Ao salvar, o orçamento grava um **snapshot imutável** dos dados do vendedor escolhido (nome, contatos, assinatura, logo, PIX, mensagem). O **PDF** e o **link público `/q/$id`** passam a mostrar exclusivamente os dados desse vendedor — nunca os do outro.
4. Orçamentos já aprovados continuam mostrando o vendedor que foi gravado no momento da criação (snapshot preserva histórico).

## Escopo

- **Não** mudamos autenticação nem RLS de posse: quem pode editar/excluir continua sendo definido pelo dono da conta (`vendedor_id = auth.uid()`), como já é hoje.
- **Não** mexemos em clientes, produtos, máquinas, dashboard nem templates de PDF.
- Perfis de vendedor pertencem à conta que os criou; só quem está logado nessa conta enxerga e usa.

## Detalhes técnicos

### Banco
Nova migração:
- Tabela `public.sales_reps` com os campos de identidade hoje espalhados em `profiles` (full_name/nome_pdf, cargo, phone_comercial, whatsapp, email, signature_url, logo_url, empresa_nome, endereco, cep, cidade, estado, site, instagram, facebook, linkedin, mensagem_padrao, pix_key), `owner_id uuid` referenciando `auth.users`, `is_default boolean`, timestamps + trigger `updated_at`.
- GRANTs (`authenticated` full, `service_role` all), RLS ligado, políticas: `SELECT/INSERT/UPDATE/DELETE` restritas a `auth.uid() = owner_id`.
- Coluna nova em `quotes`: `sales_rep_id uuid` referenciando `sales_reps(id)` ON DELETE SET NULL (opcional; snapshot é a fonte de verdade para exibição).
- Atualizar RPC `create_quote_with_items` e `update_quote_with_items`:
  - Aceitar `sales_rep_id` no payload.
  - Se informado, validar que `owner_id = auth.uid()`, montar `vendedor_snapshot` a partir da linha de `sales_reps` e gravar em `quotes.vendedor_snapshot` + `sales_rep_id`.
  - Fallback: se não informado, manter comportamento atual (snapshot do `profiles`).
- `get_public_quote` já usa `vendedor_snapshot` — nenhuma mudança necessária.

### Frontend
- `src/routes/_authenticated/meu-perfil.tsx`: nova seção "Vendedores desta conta" (lista + diálogo add/edit + marcar padrão + excluir). Reaproveita os campos do `vendor-profile-form`.
- `src/components/quote-editor.tsx`: novo campo Select "Vendedor responsável" no topo, alimentado por `sales_reps` do usuário. Estado `sales_rep_id` no `QuoteFormState`. Pré-seleciona o `is_default = true` na criação; na edição, pré-seleciona o que estiver salvo no orçamento.
- `src/routes/_authenticated/orcamentos.novo.tsx` e `orcamentos.$id.editar.tsx`: incluir `sales_rep_id` no payload enviado às server functions.
- `src/lib/quotes.functions.ts`: passar `sales_rep_id` no payload de create/update.
- Nada muda em `quote-document.tsx` nem em `/q/$id` — ambos já leem de `vendedor_snapshot`.

### Migração de dados existentes
- Para cada usuário atual, criar automaticamente um `sales_reps` "padrão" copiando os campos do `profiles` correspondente, marcado `is_default = true`, para não quebrar o fluxo de quem só quer continuar como está.

## Fora do escopo (posso fazer depois se quiser)
- Estatísticas por vendedor no dashboard.
- Lembrar no navegador o último vendedor usado.
- Permitir que o admin veja/edite vendedores de outras contas.