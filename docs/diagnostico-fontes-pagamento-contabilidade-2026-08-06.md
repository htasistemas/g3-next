# Diagnóstico: fontes de pagamento nas contas contábeis

Data: 2026-08-06

## Contexto

A tela de lançamentos contábeis precisava permitir que as contas bancárias fossem vinculadas a uma fonte de pagamento. A tela de Prestação de contas, aba Receitas, deveria listar essas fontes para seleção.

## Impacto no banco de dados

- Tabela afetada: `conta_bancaria`.
- Nova coluna: `fonte_pagamento VARCHAR(160)`.
- A coluna é opcional para manter compatibilidade com contas existentes.
- Não há gravação de arquivos, imagens ou dados binários.
- Lançamentos existentes continuam válidos; a fonte passa a vir do cadastro da conta bancária.

## Compatibilidade

A alteração foi feita pela rotina incremental `ensureContabilidadeEstrutura`, usando `ADD COLUMN IF NOT EXISTS`, sem recriar tabela e sem alterar chaves ou relacionamentos existentes.
