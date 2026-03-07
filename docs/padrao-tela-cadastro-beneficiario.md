# Padrão Oficial De Tela - Cadastro De Beneficiários (G3 Next)

## Objetivo

Definir o padrão visual, estrutural e comportamental da tela de Cadastro de beneficiários como referência obrigatória para as próximas telas do sistema.

## Fonte Oficial

- Implementação base:
  [cadastro-beneficiario-page.tsx](C:/g3-next/frontend/src/pages/beneficiarios/cadastro-beneficiario-page.tsx)
- Tokens reutilizáveis de layout:
  [tela-padrao-beneficiario.ts](C:/g3-next/frontend/src/lib/tela-padrao-beneficiario.ts)

## Estrutura Da Tela

1. Container principal com fundo verde claro em gradiente, borda suave e espaçamento interno.
2. Barra de ações CRUD no topo, alinhada à direita, com botões pequenos e sombreamento leve.
3. Corpo com duas colunas:
   1. Card lateral de abas numeradas.
   2. Card principal de conteúdo da aba ativa.
4. Cabeçalho do conteúdo com:
   1. Título da aba em destaque verde claro.
   2. Badge de status (quando houver).
   3. Badge de código.

## Ordem Padrão Dos Botões CRUD

Buscar, Novo, Salvar, Cancelar, Excluir, Imprimir, Fechar.

Regra:
- Excluir com variante de perigo.
- Fechar sempre por último.
- Todos com `type="button"` (exceto quando for submit estritamente necessário).

## Padrão De Abas Laterais

- Fonte menor para não quebrar linha.
- Número sequencial em círculo verde.
- Uma aba ativa por vez.
- Visual ativo:
  - fundo verde claro
  - borda verde
  - texto verde escuro
- Visual inativo:
  - fundo verde muito claro
  - borda verde suave
  - hover verde claro

## Padrão De Formulário

- Labels em sentence case.
- Siglas mantidas em maiúsculas (CPF, CEP, UF, LGPD).
- Campos distribuídos em grid proporcional (`xl:grid-cols-12`) para evitar campos exagerados.
- Mensagens de erro/sucesso visíveis no topo do conteúdo.
- Campos obrigatórios com `*`.

## Padrão De Popups E Feedback

- Não usar popup nativo do Windows (`alert`, `confirm`, `prompt`).
- Usar modal padrão da interface.
- Botões com bloqueio durante operação assíncrona.
- Feedback textual imediato para sucesso, erro e carregamento.

## Padrão De Responsividade

- Mobile primeiro.
- Barra de ações em grade no mobile e linha no desktop.
- Formulários com 1 coluna em telas pequenas e múltiplas colunas em telas grandes.
- Tabela/listagem sempre com `overflow` quando necessário.

## Padrão Técnico Para Reuso

- Reutilizar `classesTelaPadraoBeneficiario`.
- Reutilizar `ordemAcoesCrudPadrao`.
- Reutilizar `classeBotaoAbaLateral` e `classeNumeroAbaLateral`.
- Evitar hardcode de classes estruturais em novas telas quando o token já existir.

## Checklist Obrigatório Para Novas Telas

- Estrutura geral igual ao padrão do beneficiário.
- Mesma ordem da barra CRUD.
- Mesma linguagem visual das abas.
- Mesmo padrão de título de aba e badges.
- Mesma estratégia de feedback e popup.
- Layout responsivo sem quebra visual.
- Nenhum fluxo exigindo duplo clique.
