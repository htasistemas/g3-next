# Padronização Global de Textos (G3-Next)

## Objetivo
Aplicar padronização inteligente de campos textuais no frontend e no backend, com proteção na gravação e script de normalização em lote para dados legados.

## Arquitetura Implementada
- Frontend: `frontend/src/lib/text-formatter.ts` e `frontend/src/lib/text-format-config.ts`
- Backend: `backend/src/utils/text-formatter.ts` e `backend/src/utils/text-format-config.ts`
- Script de dados legados: `backend/scripts/normalize-text-data.ts`

## Regras Centrais
- Normalização de espaços: trim + remoção de espaços duplicados.
- Title Case PT-BR com conectivos em minúsculo (`da`, `de`, `do`, `dos`, etc.).
- Preservação de siglas conhecidas (`CPF`, `CRAS`, `SUS`, `CNPJ`, etc.).
- Preservação de casos especiais seguros (números, e-mails, URLs, numerais romanos).
- Ignorar campos técnicos (IDs, login, token, CPF/CNPJ, URL, hash, etc.).
- Regra conservadora para `textoCurto`: textos livres complexos (longos/com pontuação) não sofrem
  title case agressivo, apenas normalização segura de espaços.

## Categorias de Formatação
- `nomePessoa`
- `endereco`
- `instituicao`
- `textoCurto`

## Mapeamento de Campos
- Beneficiários, famílias, unidade assistencial e estruturas relacionadas (membros/diretoria/documentos) estão mapeados por tipo nos arquivos `text-format-config`.

## Camadas de Aplicação
- Frontend:
  - Aplicação no `onBlur` dos principais campos textuais.
  - Reaplicação antes do submit.
- Backend:
  - Reaplicação na camada de serviço antes do parse/validação/persistência.

## Script de Normalização de Base
- Dry run (recomendado primeiro):
  - `npm run normalize:text:dry-run`
- Execução efetiva:
  - `npm run normalize:text`
- Tabelas cobertas no script:
  - `cadastro_beneficiario`
  - `contato_beneficiario`
  - `documentos`
  - `situacao_social`
  - `escolaridade_beneficiario`
  - `saude_beneficiario`
  - `beneficios_beneficiario`
  - `observacoes_beneficiario`
  - `endereco`
  - `vinculo_familiar`
  - `vinculo_familiar_membro`
  - `unidade_assistencial`
  - `salas_unidade`
  - `diretoria_unidade`
  - `usuarios`

## Testes Automatizados
- Backend:
  - `npm run test:text`
  - Cobertura de utilitários + integração de normalização na camada de serviço.
- Frontend:
  - `npm run test:text`
  - Cobertura de utilitários e cenários principais de formatação.
