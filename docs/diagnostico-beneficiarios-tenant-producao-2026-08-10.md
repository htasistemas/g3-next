# Diagnóstico - listagem de beneficiários na produção

Data: 2026-08-10

## Sintoma

Na base de teste, a aba Listagem de beneficiários exibia registros normalmente. Na base de produção, a mesma tela retornava "Nenhum beneficiário encontrado", mesmo com cadastros esperados.

## Causa provável

O módulo de beneficiários passou a filtrar `cadastro_beneficiario` por `tenant_id` do usuário autenticado. Bases legadas de produção podiam ter beneficiários sem `tenant_id` ou vinculados ao tenant padrão criado durante a evolução multitenant, fazendo a consulta do tenant Torresoft retornar vazia.

## Impacto no banco

A correção não remove tabelas, colunas nem registros. Ela:

- Garante a coluna `tenant_id` nas tabelas do cadastro de beneficiários e dados relacionados.
- Preenche `tenant_id` apenas em registros sem tenant quando existe um único tenant operacional.
- Reassocia registros demonstrativos Torresoft (`DEMO-TS-BEN-*` e `DEMO-TS-AUTO-BEN-*`) ao tenant Torresoft quando a instituição Torresoft existir.
- Sincroniza `tenant_id` das tabelas relacionadas a partir de `cadastro_beneficiario`.
- Mantém o filtro por tenant na listagem, detalhe, próximo código e demais operações do módulo.

## Arquivos alterados

- `backend/src/modules/beneficiarios/repositories/beneficiario.repository.ts`
- `backend/prisma/migrations/20260810_fix_beneficiarios_tenant_producao/migration.sql`

