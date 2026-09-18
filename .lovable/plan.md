# Próximas melhorias — Sistema Rei dos Filtros

O sistema já cobre orçamentos completos, PDFs, aprovação online, lixeira, metas,
relatórios, PWA e cadastro por CNPJ. Abaixo está o que ainda pode elevar o nível,
organizado por prioridade e impacto.

## 1. Alta prioridade — valor comercial imediato

1. **Envio por e-mail com PDF anexo**
   - Botão "Enviar por e-mail" ao lado do WhatsApp na tela do orçamento.
   - Envia o PDF do cliente anexado com mensagem padrão (nome, número, valor, validade).
   - Requer configurar um domínio/remetente de e-mail do projeto.

2. **Recorrência por máquina (ideal para filtros)**
   - Histórico de itens usados em cada máquina do cliente.
   - Botão "Repetir último kit" dentro do editor ao selecionar a máquina.
   - Lembrete de troca por data, KM ou horímetro, gerando notificação ao vendedor.

3. **Follow-up automático de orçamentos enviados**
   - Alerta no sino quando um orçamento enviado fica X dias sem resposta.
   - Ações rápidas: reenviar pelo WhatsApp, prorrogar validade ou duplicar.

4. **Motivo de perda**
   - Ao marcar como recusado, escolher motivo (preço, prazo, concorrência, outro).
   - Relatório de motivos de perda por período e vendedor.

## 2. Média prioridade — produtividade

5. **Catálogo inteligente no editor**
   - Autocomplete por código, descrição e marca (não só Enter no código exato).
   - Itens frequentes e favoritos sugeridos ao adicionar linha.

6. **Modelos de mensagem de WhatsApp**
   - Textos prontos por etapa: envio, lembrete, aprovação, retirada.
   - Preenchimento automático com cliente, número, valor, validade e link.

7. **Exportação de relatórios em Excel/CSV**
   - Exportar a aba Relatórios e o relatório por vendedor com filtros aplicados.

8. **Paginação no banco**
   - Orçamentos, clientes e produtos passam a paginar no servidor, mantendo
     desempenho conforme a base cresce.

## 3. Longo prazo — operação completa

9. **Pedido interno a partir de orçamento aprovado**
   - Fluxo: A separar → Separado → Faturado → Entregue/Retirado, usando o PDF interno.

10. **Controle de estoque verdadeiro**
    - Livro de movimentações (entradas, saídas, ajustes, reservas) com alertas de estoque baixo.

11. **Governança de preço e margem**
    - Margem por item visível só para admin; desconto máximo configurável com aprovação.

## Sugestão de entrega

Começar pelo bloco 1 (e-mail + recorrência por máquina + follow-up + motivo de perda),
que fecha o ciclo comercial. Posso detalhar qualquer item e iniciar a implementação
daquele que você escolher primeiro — ou executar o bloco 1 inteiro de uma vez.

## Detalhes técnicos (resumo)

- E-mail: função no servidor com provedor de e-mail transacional; requer segredo de API.
- Recorrência: consulta de `quote_items` por `machine_id`; lembretes via tabela de
  notificações existente + job diário (pg_cron).
- Follow-up: regra sobre `quotes.status = 'enviado'` e `data_envio`, reaproveitando o
  job diário de expiração já existente.
- Motivo de perda: coluna `motivo_perda` em `quotes` + seletor na mudança de status.
- Paginação: migração das listagens para consultas paginadas com filtros na URL.
