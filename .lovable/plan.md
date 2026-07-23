## Objetivo

Gerar dois PDFs a partir do orçamento:

1. **PDF do cliente** — o atual. Mostra apenas o **código do cliente** de cada item (nada de "nosso código" ou marca interna).
2. **PDF interno** (separação/faturamento) — inclui **código do cliente + nosso código + marca**, preços, totais e destaca **condição de pagamento + prazo**.

## Mudanças

### 1. Banco de dados (migração)

Na tabela `quote_items`, o campo atual `codigo` passa a significar "código do cliente". Adicionar:

- `codigo_interno text` — nosso código do produto.

`marca` já existe e continua sendo interno.

Atualizar as RPCs `create_quote_with_items` e `update_quote_with_items` para ler/gravar `codigo_interno`. `get_public_quote` continua retornando os itens, mas o PDF público simplesmente ignora `codigo_interno` e `marca` na renderização.

### 2. Editor de orçamento (`src/components/quote-editor.tsx`)

Na linha de item, hoje temos: **Código | Marca | Item/Descrição | Qtd | Preço**.
Passa a ser: **Cód. cliente | Nosso cód. | Marca | Item/Descrição | Qtd | Preço**.

- `QuoteItemDraft` em `src/lib/quote.ts` ganha `codigo_interno: string | null`.
- Enter em qualquer um dos novos campos continua criando nova linha (regra atual).
- Busca por código de produto preenche `codigo_interno` + `marca` + `descricao` (e deixa `codigo` — código do cliente — vazio para o vendedor digitar).

### 3. Documento PDF

Separar em dois componentes para manter o do cliente inalterado visualmente:

- `src/components/quote-document.tsx` (atual, do cliente): remover a coluna **Marca** e passar a mostrar apenas **Cód. cliente** na coluna Código. Nada muda no layout/cores.
- `src/components/quote-document-internal.tsx` (novo): mesmo layout, mas com colunas **Cód. cliente | Nosso cód. | Marca | Item | Qtd | Preço un. | Total**, e um bloco destacado no topo/rodapé com **Condição de pagamento** e **Prazo de entrega** (sempre visível, mesmo se em branco marcamos "—"). Marca d'água/etiqueta "USO INTERNO — SEPARAÇÃO / FATURAMENTO" no cabeçalho para não confundir com o do cliente.

### 4. Tela de visualização do orçamento (`src/routes/_authenticated/orcamentos.$id.index.tsx`)

Ao lado do botão atual **Baixar PDF**:

- Renomear para **PDF do cliente**.
- Adicionar **PDF interno**.

Ambos usam `downloadPdfFromElement` (que já abre o seletor de local do sistema). Os dois documentos ficam renderizados fora da tela em containers separados, cada botão captura o seu.

### 5. Rota pública `/q/$id`

Continua renderizando **apenas** `QuoteDocument` (versão do cliente). O PDF interno **não** é acessível pela rota pública — só por usuários logados dentro do sistema.

### 6. Edição de orçamento existente

`src/routes/_authenticated/orcamentos.$id.editar.tsx` já mapeia os itens; incluir o novo campo `codigo_interno` no mapeamento.

## Detalhes técnicos

- Migração SQL única: `ALTER TABLE quote_items ADD COLUMN codigo_interno text;` + `CREATE OR REPLACE FUNCTION` das duas RPCs para incluir o campo no INSERT.
- RLS não muda (o PDF interno é gerado no cliente logado a partir dos dados já autorizados por RLS).
- Sem novas dependências.
- Sem mudanças em preços, cálculos ou fluxo de aprovação.

## Fora do escopo

- Não altero o design/cores dos templates.
- Não crio um "modo separação sem preços" — conforme sua resposta, o PDF interno leva preços e totais.
- Não escondo o botão para vendedores — fica disponível para qualquer usuário logado que já enxerga o orçamento.