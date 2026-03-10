# Auditoria de migração - G3-Next

Data: 2026-03-09

## Correções aplicadas nesta revisão

- Removido o cabeçalho duplicado `Setor RH / Registro de ponto` da tela ativa de Registro de ponto.
- Removido o arquivo React duplicado e sem uso `frontend/src/pages/setor-juridico/plano-trabalho-page.tsx`, que estava com codificação quebrada e havia sido excluído manualmente do `tsconfig`.
- Atualizados os scripts padrão do frontend para a aplicação ativa em React/Vite:
  - `npm start` -> React
  - `npm run build` -> React
  - `npm test` -> `react:typecheck` + `test:text`
- Atualizado `frontend/README.md` para refletir a stack ativa do projeto.
- Validada novamente a checagem de acentuação pt-BR no frontend.

## Achados objetivos da auditoria

### 1. Vestígios legados ainda presentes no repositório

- Ainda existe base Angular legada no frontend, principalmente em `frontend/src/app/components/*.component.*`.
- Esses arquivos não são a aplicação ativa do G3-Next React, mas seguem no repositório como apoio à migração.
- Risco: manutenção duplicada, confusão operacional e chance de correções serem feitas no lugar errado.

### 2. Fluxos de relatório ainda provisórios em módulos React ativos

Foram identificadas mensagens de placeholder em telas ativas indicando que o fluxo final ainda não foi concluído:

- `frontend/src/pages/familias/cadastro-vinculo-familiar-page.tsx`
- `frontend/src/pages/atendimentos/registro-visitas-page.tsx`
- `frontend/src/pages/setor-administrativo/almoxarifado-page.tsx`
- `frontend/src/pages/setor-administrativo/controle-veiculos-page.tsx`
- `frontend/src/pages/setor-administrativo/tarefas-pendencias-page.tsx`
- `frontend/src/pages/setor-administrativo/lembretes-diarios-page.tsx`
- `frontend/src/pages/setor-administrativo/gestao-documentos-page.tsx`
- `frontend/src/pages/setor-administrativo/patrimonio-page.tsx`
- `frontend/src/pages/setor-administrativo/fotos-eventos-page.tsx`
- `frontend/src/pages/setor-administrativo/oficios-protocolos-page.tsx`

Conclusão:

- A migração está funcional em várias áreas, mas não é correto tratar o conjunto atual como 100% concluído em relatórios/exportações.

### 3. Eficiência do bundle frontend

- O build React atual conclui com warning de chunk grande:
  - `dist/assets/index-*.js` em torno de `1.69 MB` minificado.
- Isso indica necessidade de code-splitting adicional por rota/módulo para melhorar carregamento inicial.

### 4. Backend e acentuação

- A auditoria não encontrou necessidade de renomear identificadores de backend ou banco por acentuação.
- Os caracteres acentuados encontrados no backend estão concentrados em mensagens ao usuário e textos de relatório, não em identificadores estruturais.

## Validações executadas

- `npm --prefix frontend run check:ptbr`
- `npm --prefix frontend run react:typecheck`
- `npm --prefix frontend run build`
- `npm --prefix frontend test`
- `npm --prefix backend run typecheck`
- `npm --prefix backend run build`
- `npm --prefix backend run test:text`

## Próxima etapa recomendada

- Fazer uma rodada dedicada apenas para eliminar placeholders de relatório dos módulos React ativos.
- Fazer uma rodada dedicada para lazy loading/code-splitting do router React.
- Decidir se o código Angular legado será arquivado fora da árvore principal ou mantido apenas em área de referência.
