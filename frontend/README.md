# Frontend G3-Next

Frontend ativo do projeto em React + Vite + TypeScript.

## Aplicação ativa

- Entrada principal: `src/main.tsx`
- Roteamento ativo: `src/routes/router.tsx`
- Shell principal: `src/app/app-shell.tsx`

O frontend em uso no G3-Next é a base React. O legado Angular foi retirado do fluxo ativo e ficou arquivado apenas como referência em `legacy-angular/src`.

- `tsconfig.json`: base ativa do React
- `src/app`: somente arquivos React ativos
- `legacy-angular/src`: árvore preservada do Angular legado

## Scripts principais

Desenvolvimento:

```bash
npm start
```

ou

```bash
npm run dev
```

A aplicação React sobe em `http://localhost:5173`.

Build:

```bash
npm run build
```

Verificação de tipos:

```bash
npm run react:typecheck
```

Teste disponível no frontend:

```bash
npm test
```

## Verificação de acentuação pt-BR

Antes do build React, o projeto executa a checagem de codificação pt-BR:

```bash
npm run check:ptbr
```

Isso evita publicar telas com acentuação quebrada.

## Legado Angular

O diretório `legacy-angular/` é apenas um arquivo histórico da migração. Ele não participa do build, do teste nem da instalação padrão do frontend ativo.

Se algum trecho legado precisar ser reaproveitado, a recomendação é migrar o código necessário para a base React em vez de reativar a stack Angular dentro deste pacote.

## Manual do sistema

Para atualizar o manual via registro de mudanças, use o endpoint do backend:

```bash
POST /api/manual-sistema/mudancas
```

Campos principais:

- `autor`
- `modulo`
- `tela`
- `tipo` (`bugfix`, `feature`, `ajuste`)
- `descricaoCurta`
- `descricaoDetalhada`
- `versaoBuild`

Toda mudança registrada entra automaticamente no bloco "O que mudou" e, quando informada a tela, adiciona uma nota na seção correspondente do manual.
