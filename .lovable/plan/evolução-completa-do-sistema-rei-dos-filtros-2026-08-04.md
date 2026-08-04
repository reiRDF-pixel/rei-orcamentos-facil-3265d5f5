# Evolução completa do Sistema Rei dos Filtros

## Diagnóstico confirmado

O sistema já cobre cadastro de clientes, máquinas, produtos e vendedores, criação e
edição de orçamentos, PDFs cliente/interno, compartilhamento, duplicação, rascunho
automático, importação tabular, auditoria, notificações e histórico do cliente.

A revisão do código encontrou estes pontos concretos para a próxima evolução:

- A página pública do orçamento ainda é somente leitura; aprovação e recusa continuam
  manuais (`src/routes/q.$id.tsx`).
- O dashboard possui quatro indicadores e seis orçamentos recentes, mas não possui
  período, funil, comparação entre vendedores ou gráficos
  (`src/routes/_authenticated/dashboard.tsx`).
- Clientes, máquinas, produtos e orçamentos carregam todos os registros e filtram no
  navegador; isso perderá desempenho conforme a base crescer.
- “Importar CSV/Excel” aceita CSV, TXT e TSV, mas não aceita arquivo `.xlsx`
  (`src/components/quote-csv-import-dialog.tsx`).
- O histórico do cliente soma rascunhos, recusados e aprovados na mesma receita e no
  mesmo ticket médio, o que pode distorcer a leitura comercial.
- O editor funciona, mas concentra 871 linhas e responsabilidades de cadastro,
  catálogo, atalhos, autosave, itens, totais e condições no mesmo componente.
- O PDF é uma imagem rasterizada da tela; em documentos longos, a divisão ocorre pela
  altura da imagem e pode cortar uma linha de item entre páginas.
- Os testes atuais cobrem cálculos, CSV e `localStorage`, mas não o fluxo real de
  criar, editar, duplicar, aprovar e baixar PDF no navegador.
- Não há recuperação de senha na tela de login; a página de erro de servidor ainda
  está em inglês e fora da identidade visual.
- A maioria das listagens usa tabela com rolagem horizontal no celular; o editor é
  utilizável, mas ainda denso para vendedores em campo.

## Roteiro recomendado

### Fase 1 — Confiabilidade e correções de base

1. **Corrigir métricas comerciais**
   - Separar “valor cotado” de “valor aprovado”.
   - Calcular ticket médio comercial apenas com aprovados.
   - Exibir taxa de conversão e tempo médio até aprovação.

2. **Importação realmente compatível com Excel**
   - Suportar `.xlsx` além de CSV/TSV.
   - Mostrar prévia, linhas inválidas, duplicidades e resultado antes de confirmar.
   - Permitir mapear colunas quando o arquivo tiver cabeçalhos diferentes.

3. **Fortalecer o PDF**
   - Gerar páginas por blocos de itens, evitando cortes no meio de uma linha.
   - Repetir cabeçalho da tabela e número do orçamento nas páginas seguintes.
   - Reduzir tamanho do arquivo e preservar texto nítido.
   - Testar logo, documento curto, documento longo e os quatro templates.

4. **Paginação e filtros no banco**
   - Paginar orçamentos, clientes, máquinas e produtos.
   - Busca no servidor com filtros por período, status, vendedor, cliente e marca.
   - Manter filtros na URL para não perdê-los ao abrir e voltar de um registro.

5. **Qualidade técnica**
   - Dividir o editor em seções menores e testáveis, sem mudar seu fluxo atual.
   - Remover casts desnecessários e padronizar tratamento de erros.
   - Traduzir e tematizar a página de erro.
   - Adicionar recuperação segura de senha.

### Fase 2 — Fechar o ciclo comercial

1. **Aprovação online do cliente**
   - Link compartilhado recebe **Aprovar** e **Recusar**, nome e observação.
   - Usar token público revogável separado do ID do orçamento.
   - Aceitar decisão apenas quando o orçamento estiver enviado e dentro da validade.
   - Atualizar a tela do vendedor em tempo real; auditoria e notificações existentes
     registram a decisão.

2. **Follow-up automático**
   - Lembrar o vendedor quando um orçamento enviado ficar sem resposta.
   - Marcar automaticamente como expirado ao fim da validade.
   - Ações rápidas: reenviar pelo WhatsApp, prorrogar validade ou duplicar.

3. **Pipeline comercial visual**
   - Visões “Rascunho → Enviado → Aprovado/Recusado/Expirado”.
   - Lista e quadro por status, com filtros e contadores.
   - Motivo de perda para recusados, permitindo analisar preço, prazo e concorrência.

### Fase 3 — Do orçamento ao pedido

1. **Converter orçamento aprovado em pedido interno**
   - Fluxo: `A separar → Separado → Faturado → Entregue/Retirado`.
   - Responsável, datas, observações e checklist por item.
   - Aproveitar o PDF interno já existente para separação e faturamento.
   - Notificar vendas quando o pedido avançar de etapa.

2. **Controle de estoque verdadeiro**
   - A tabela de produtos já possui estoque, mas falta um livro de movimentações.
   - Criar entradas, saídas, ajustes, reserva por pedido e histórico auditável.
   - Alertas de estoque baixo; nunca alterar saldo sem registrar movimento.

3. **Governança de preço e margem**
   - Exibir margem usando preço de custo apenas para quem tiver permissão.
   - Configurar desconto máximo/margem mínima.
   - Pedir aprovação de administrador quando ultrapassar o limite.

### Fase 4 — Produtividade e inteligência comercial

1. **Catálogo rápido no editor**
   - Autocomplete por código, descrição e marca, não apenas Enter no código exato.
   - Preencher descrição, marca e preço mantendo edição livre.
   - Favoritos, itens recentes e kits por tipo de máquina.

2. **Recorrência por máquina**
   - Histórico de filtros usados em cada equipamento.
   - “Repetir último kit” e lembrete de troca por data, KM ou horímetro.
   - Esta é uma melhoria especialmente alinhada ao negócio de filtros.

3. **Dashboard gerencial**
   - Filtro por período, vendedor e status.
   - Funil, evolução mensal, top clientes, top marcas/produtos, conversão e ticket.
   - Metas por vendedor e exportação Excel/CSV.

4. **Comunicação padronizada**
   - Modelos de mensagem de WhatsApp por etapa: envio, lembrete, aprovação e retirada.
   - Usar nome do vendedor, cliente, número, valor, validade e link automaticamente.

### Fase 5 — Renovação visual e experiência móvel

Preservar azul royal, laranja, logo e modos claro/escuro, mas tornar a interface mais
operacional e menos dependente de grandes cartões arredondados.

1. **Hierarquia visual**
   - Cabeçalhos mais compactos, espaçamento consistente e ações primárias sempre no
     mesmo local.
   - Status mais visíveis e uma barra contextual do orçamento com salvar, enviar,
     PDF e estado atual.
   - Usar o laranja com moderação para alertas e destaques comerciais, mantendo azul
     como ação principal.

2. **Listagens responsivas**
   - Desktop com tabelas densas, cabeçalho fixo, ordenação e seleção de colunas.
   - Celular com linhas transformadas em blocos compactos, sem depender de rolagem
     horizontal.
   - Ações agrupadas em menu para reduzir ruído visual.

3. **Editor móvel**
   - Totais e botão salvar fixos no rodapé do celular.
   - Cada item como bloco expansível; código, descrição, quantidade e preço primeiro.
   - Navegação de teclado aprimorada no desktop e alvos de toque maiores no celular.

4. **Acessibilidade e consistência**
   - Estados de foco visíveis, nomes acessíveis em todos os botões de ícone, mensagens
     de erro junto aos campos e contraste validado nos dois temas.
   - Respeitar redução de movimento e evitar mudanças de layout durante carregamento.

### Fase 6 — Produção, testes e operação

1. **Testes automatizados reais**
   - Unitários: totais, descontos, validade, importação, transições de status.
   - Integração: RPCs de criar, editar, duplicar e permissões por usuário.
   - E2E: login → cliente → máquina → orçamento → editar → PDF → WhatsApp → aprovação
     → pedido, em desktop e celular.
   - Teste visual dos quatro PDFs e de documentos com várias páginas.

2. **Observabilidade e recuperação**
   - Registrar falhas de PDF, autenticação e persistência com contexto útil, sem dados
     sensíveis.
   - Painel de saúde, exportação administrativa e rotina de recuperação de dados.
   - Alertas para erros repetidos em produção.

3. **Segurança operacional**
   - Revisar permissões sempre que pedido, estoque ou aprovação forem adicionados.
   - Sessões revogáveis, desativação efetiva de funcionário e trilha para ações
     administrativas.
   - Tokens públicos revogáveis e sem escrita pública direta nas tabelas.

## Ordem de implementação

```text
1. Confiabilidade/PDF/métricas/paginação
2. Aprovação online + follow-up
3. Pedido interno + estoque + margem
4. Catálogo inteligente + recorrência por máquina + relatórios
5. Renovação visual/mobile
6. E2E, observabilidade e revisão final de segurança
```

Cada fase será entregue com migração, interface, regras de permissão, testes e
verificação no navegador. A primeira entrega recomendada combina a **Fase 1** com
**Aprovação online**, pois resolve riscos atuais antes de ampliar a operação.
