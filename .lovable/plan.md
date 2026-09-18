# Buscar dados do cliente pelo CNPJ

Sim, é possível. Ao digitar o CNPJ no cadastro de cliente, o sistema consulta a base pública da Receita Federal e preenche os campos automaticamente. Tudo continua editável.

## Como vai funcionar

- Ao lado do campo CNPJ aparece um botão "Buscar dados".
- A busca também roda sozinha quando o CNPJ digitado está completo (14 dígitos).
- Campos preenchidos automaticamente: razão social, nome fantasia, telefone, e-mail, CEP, endereço, número, complemento, bairro, cidade, estado.
- Se o campo já tiver algo digitado, ele é mantido (não sobrescreve o que você escreveu).
- Mensagens claras: "Dados encontrados", "CNPJ não encontrado", "CNPJ inválido" ou "Serviço indisponível, preencha manualmente".
- Só vale para Pessoa Jurídica; em Pessoa Física a busca fica oculta.

## Onde aparece

- Tela de Clientes (cadastro e edição).
- Cadastro rápido de cliente dentro da criação de orçamento.

## Detalhes técnicos

- Nova função de servidor `src/lib/cnpj.functions.ts` que consulta a BrasilAPI (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) e, em caso de falha, tenta a ReceitaWS como alternativa. A chamada sai do servidor para evitar bloqueio de CORS e limites por navegador.
- Validação de dígitos verificadores do CNPJ antes de chamar a API; resposta normalizada para o formato dos campos da tabela `clients`.
- Novo componente compartilhado de campo CNPJ com estado de carregamento, reutilizado em `src/routes/_authenticated/clientes.tsx` e `src/components/client-quick-dialog.tsx`.
- Nenhuma mudança de banco de dados necessária.

## Limitações

- A base pública não fornece inscrição estadual nem nome do contato — esses seguem manuais.
- Empresas com cadastro desatualizado na Receita podem trazer dados antigos; por isso tudo permanece editável.
