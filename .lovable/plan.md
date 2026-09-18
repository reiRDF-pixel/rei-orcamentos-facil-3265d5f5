# Perfil completo do cliente + próximas melhorias

## Entrega principal — Página de perfil do cliente

Hoje o cliente tem apenas um diálogo de histórico limitado (últimos 10 orçamentos).
Criaremos uma **página completa** `/clientes/$id`, acessível pelo nome do cliente na
listagem, reunindo tudo sobre ele em um só lugar:

1. **Cabeçalho do perfil**
   - Nome fantasia / razão social, etiquetas (frota, revenda, oficina...), CNPJ/CPF.
   - Resumo comercial: nº de orçamentos, valor cotado, valor aprovado e ticket médio.

2. **Dados completos do cadastro**
   - Todos os campos: contato, e-mail, telefone, WhatsApp (com botão de abrir
     conversa), endereço completo, inscrição estadual, observações.
   - Botão "Editar cliente" reutilizando o formulário existente.

3. **Máquinas do cliente**
   - Cartões com marca, modelo, ano, KM/horímetro, nº de série, foto e observações.
   - Botões para cadastrar/editar máquina e criar um novo orçamento já com essa
     máquina selecionada.

4. **Todos os orçamentos do cliente**
   - Lista completa (não apenas os 10 últimos), com número, data, vendedor, status
     e valor; clique abre o orçamento.
   - Itens mais cotados e último kit por máquina.

5. **Navegação**
   - Na listagem de Clientes, o nome do cliente vira link para o perfil.
   - O diálogo de histórico passa a apontar para "Ver perfil completo".

## Melhorias seguintes (em ordem, após o perfil)

1. **Envio por e-mail com PDF anexo** ao lado do WhatsApp (requer remetente de e-mail).
2. **Recorrência por máquina**: botão "Repetir último kit" no editor e lembrete de
   troca por data/KM/horímetro — ideal para o negócio de filtros.
3. **Follow-up automático** de orçamentos enviados sem resposta (alerta no sino,
   reenviar, prorrogar validade).
4. **Motivo de perda** ao recusar (preço, prazo, concorrência) + relatório de motivos.
5. **Catálogo inteligente** no editor: autocomplete de itens e favoritos.
6. **Modelos de mensagem de WhatsApp** por etapa (envio, lembrete, aprovação).
7. **Exportação de relatórios** em Excel/CSV.
8. **Paginação no banco** para manter desempenho com o crescimento da base.
9. Mais adiante: pedido interno (A separar → Faturado → Entregue), estoque com livro
   de movimentações e margem/desconto com aprovação de administrador.

## Detalhes técnicos (resumo)

- Nova rota `src/routes/_authenticated/clientes.$id.tsx` usando consultas já
  existentes (clients, machines, quotes, quote_items) — sem mudança de estrutura do
  banco, apenas leitura e reuso dos formulários atuais.
- Máquina e orçamento reutilizam os diálogos/componentes existentes para não
  duplicar código.
- Demais itens futuros terão migrações próprias quando forem implementados.
