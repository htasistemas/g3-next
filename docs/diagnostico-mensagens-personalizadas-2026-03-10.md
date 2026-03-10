# Diagnóstico: mensagens personalizadas

Data: 2026-03-10

## Objetivo

Adicionar ao G3-Next uma funcionalidade centralizada de mensagens personalizadas, com:

- gestão de modelos reutilizáveis
- sugestões iniciais para uso assistido
- histórico de utilização
- preparo de envio por WhatsApp
- envio por e-mail com o serviço já existente
- integração com cadastros já ativos

## Impacto em banco de dados

Mudança não destrutiva, compatível com a estrutura atual.

Novas tabelas:

- `mensagens_personalizadas_modelo`
- `mensagens_personalizadas_taxonomia`
- `mensagens_personalizadas_historico`
- `mensagens_personalizadas_auditoria`

Novos registros de permissão:

- `MENSAGENS_PERSONALIZADAS_VISUALIZAR`
- `MENSAGENS_PERSONALIZADAS_CADASTRAR`
- `MENSAGENS_PERSONALIZADAS_EDITAR`
- `MENSAGENS_PERSONALIZADAS_EXCLUIR`
- `MENSAGENS_PERSONALIZADAS_ENVIAR`
- `MENSAGENS_PERSONALIZADAS_ENVIAR_LOTE`
- `MENSAGENS_PERSONALIZADAS_HISTORICO`

## Compatibilidade

- Não remove tabelas nem colunas existentes.
- Não altera contratos das rotas atuais.
- Reaproveita o módulo de e-mail já ativo no backend.
- Para WhatsApp, a entrega fica preparada por link e rastreio, sem depender de provider externo.

## Riscos controlados

- permissões novas sem quebra dos perfis atuais, mantendo compatibilidade com `ADMINISTRADOR`, `OPERADOR` e `LEITURA_APENAS`
- criação idempotente de estrutura e sementes
- logs de envio separados da lógica dos cadastros

## Observação

A integração com WhatsApp foi estruturada de forma segura e expansível. Sem provider transacional configurado, o sistema prepara a mensagem, registra histórico e fornece o link de abertura compatível para continuidade do fluxo.
