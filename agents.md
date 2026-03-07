# AGENTS.md — G3 Next (Migração)

> Este arquivo foi reiniciado para a fase de migração.
> As regras antigas foram removidas do padrão ativo e arquivadas em: `docs/agents-legacy-2026-03-07.md`.

---

## Estado Atual

- Padrão anterior: desativado para a migração.
- Padrão atual: mínimo e evolutivo.
- Objetivo: permitir criação de novas regras sem herdar conflitos legados.

---

## Regras Ativas Temporárias

### Idioma

- Frontend (UI): Português Brasil (pt-BR) com acentuação correta.
- Backend (código e banco): identificadores sem acentos.

### UX e Interação

- Toda ação deve funcionar com 1 clique.
- Não aceitar fluxo com clique duplo para executar ação.
- Exibir feedback visual em ações assíncronas (carregando, sucesso, erro).

### Capitalização UI

- Usar sentence case em labels, títulos, abas, botões e mensagens.
- Usar maiúsculas apenas para siglas (CPF, CNPJ, LGPD, CEP, UF).

### Banco de Dados

- Antes de alterar estrutura: analisar impacto e registrar diagnóstico.
- Priorizar compatibilidade com estrutura existente.

---

## Novas Regras (Em Construção)

> Preencher nesta seção os novos padrões oficiais da migração.

- [ ] Arquitetura frontend
- [ ] Arquitetura backend
- [ ] Padrão de componentes
- [ ] Padrão de API e erros
- [ ] Padrão de testes
- [ ] Padrão de versionamento
- [ ] Padrão visual global
