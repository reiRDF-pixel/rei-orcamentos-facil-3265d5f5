# Aprovação online do cliente

O cliente recebe o orçamento pelo WhatsApp (link `/q/$id` já existe). Hoje essa
página é só visualização. Vamos transformá-la em uma resposta ativa: o cliente
clica em **Aprovar** ou **Recusar**, o status muda sozinho, o vendedor é notificado
e o log de auditoria registra a decisão — sem nenhuma ação manual.

Tudo já está preparado para isso: a página pública já usa `supabaseAdmin`
(sem expor RLS ao público), já existe uma trigger que notifica o vendedor quando
o status vira `aprovado`/`recusado`, e o log de auditoria já captura mudanças de
status automaticamente. A aprovação do cliente só precisa alterar o status no
servidor — notificação e auditoria acontecem de graça.

## Escopo

1. **Migração de banco** — adicionar 2 colunas opcionais em `quotes`:
   - `client_decision_by TEXT` (nome de quem decidiu, preenchido pelo cliente)
   - `client_decision_note TEXT` (observação/justificativa opcional)
   - Sem nova tabela, sem novas triggers (as existentes cobrem notificação + auditoria).

2. **Nova função de servidor pública** `respondPublicQuote` em
   `src/lib/quotes.functions.ts`:
   - Entrada: `{ id, decision: 'aprovado'|'recusado', name?, note? }`
   - Usa `supabaseAdmin` (bypass de RLS) — endpoint público, sem auth.
   - Valida que o status atual é `enviado` (senão erro).
   - Valida que não expirou (`data_emissao + validade_dias` > agora) — senão erro
     "Orçamento expirado".
   - Atualiza `status`, `approved_at` (quando aprovado), `client_decision_by`,
     `client_decision_note`.
   - A trigger existente cria a notificação para o vendedor e o log de auditoria
     automaticamente.

3. **Página pública** `src/routes/q.$id.tsx` — abaixo do documento:
   - Quando `status === 'enviado'`: card de decisão com campo opcional "Seu nome",
     campo opcional "Mensagem", botão verde **Aprovar orçamento** e botão
     **Recusar**. Após responder, mostra tela de confirmação e recarrega.
   - Quando `status === 'aprovado'`: selo verde "Orçamento aprovado em <data>".
   - Quando `status === 'recusado'`: selo neutro "Orçamento recusado — entre em
     contato com o vendedor".
   - `rascunho`/`expirado`: sem ação.

4. **Tela interna do orçamento** `src/routes/_authenticated/orcamentos.$id.index.tsx`:
   - Mostrar "Decidido pelo cliente: <nome>" quando `client_decision_by` existir.
   - Adicionar assinatura Realtime na linha do orçamento para invalidar o cache
     quando o cliente responde — assim a aba aberta do vendedor atualiza sozinha
     no momento da aprovação.

## Segurança

- O endpoint é público, mas só aceita decisão quando o status é `enviado` e a
  validade não venceu — não permite reabrir orçamentos já decididos ou editar
  dados do orçamento.
- O `id` do orçamento é um UUID não adivinhável (mesmo modelo do link de
  WhatsApp já em uso), então não há exposição adicional além da visualização que
  já existe hoje.
- Nenhuma política RLS de escrita pública é criada; a atualização passa só pelo
  `supabaseAdmin` dentro da função de servidor.

## Verificação

- Build e testes existentes (`bun run test`).
- Teste no navegador: abrir o link público de um orçamento `enviado`, clicar em
  Aprovar/Recusar e confirmar o selo de confirmação.
- Confirmar que a aba interna do vendedor (logado) reflete o novo status ao vivo.
