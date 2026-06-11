# Frontend G3N

Frontend ativo do projeto em React + Vite + TypeScript.

## Aplicação ativa

- Entrada principal: `src/main.tsx`
- Roteamento ativo: `src/routes/router.tsx`
- Shell principal: `src/app/app-shell.tsx`

O frontend em uso no G3N é a base React.

- `tsconfig.json`: base ativa do React
- `src/app`: somente arquivos React ativos

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
