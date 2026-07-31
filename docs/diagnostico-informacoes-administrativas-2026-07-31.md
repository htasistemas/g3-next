# Diagnostico de banco - Informacoes administrativas

Data: 2026-07-31

## Contexto

A tela Administracao e gestao > Informacoes administrativas exige persistencia de registros sigilosos por instituicao, como registros institucionais, acessos, senhas, links e observacoes internas.

## Impacto estrutural

- Criacao da tabela `informacoes_administrativas` para armazenar os registros por `tenant_id`.
- Criacao da tabela `informacoes_administrativas_auditoria` para registrar confirmacoes de acesso, criacoes, atualizacoes e exclusoes logicas.
- Inclusao de indices por `tenant_id` para leitura isolada por instituicao e auditoria por data.
- Uso de exclusao logica por `deletado_em`, preservando rastreabilidade.

## Compatibilidade

- A alteracao e aditiva e nao modifica tabelas existentes.
- Nao ha migracao de dados legados.
- Os comandos usam `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`, mantendo compatibilidade com ambientes ja atualizados.
- A tela exige usuario autenticado com permissao administrativa e senha confirmada antes das operacoes.

## Risco e mitigacao

- Risco: exposicao indevida de informacoes sigilosas.
- Mitigacao: restricao por permissao `ADMINISTRADOR` ou `MASTER_ADMIN`, isolamento por `tenant_id`, confirmacao de senha por operacao e auditoria de acesso/alteracao.
- Risco: mistura de dados entre instituicoes.
- Mitigacao: todas as consultas e gravacoes filtram `tenant_id` do usuario autenticado.

