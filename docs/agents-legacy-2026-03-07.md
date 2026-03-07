# AGENTS.md — Sistema G3 (Padrão Oficial Consolidado)

> Objetivo: orientar implementação de telas e alterações no G3 com padrão único, sem gambiarras, sem divergência visual, sem quebra arquitetural e sem inconsistência estrutural.

---
# REGRAS GERAIS (OBRIGATÓRIAS)

## Idioma (Regra Crítica)

### FRONTEND (UI)

- MUST utilizar Português Brasil (pt-BR) com acentuação correta em:
  - Textos visuais
  - Labels
  - Mensagens
  - Títulos
  - Botões
  - Popups
  - Relatórios
  - Mensagens de erro
  - Documentação visível ao usuário

### CAPITALIZAÇÃO DE TEXTOS (UI)

- MUST usar capitalização normal em interfaces (sentence case) para:
  - Labels
  - Títulos de cards
  - Campos de formulário
  - Placeholders
  - Botões
  - Mensagens e avisos
- MUST NOT usar texto todo em maiúsculas em elementos de formulário e navegação.
- MAY usar maiúsculas apenas para siglas técnicas (CPF, CNPJ, LGPD, CEP, UF) e códigos.
- SHOULD preferir legibilidade e consistência visual em vez de destaque por caixa alta.

### BACKEND (Java / Banco de Dados)

- MUST não utilizar acentos em:
  - Classes
  - Métodos
  - Variáveis'
  - Tabelas
  - Colunas
  - DTOs
  - Domains
  - Scripts SQL
- MUST NOT usar acentos em identificadores técnicos.
- MAY manter termos técnicos universais (DTO, Service, Repository, Controller).

---

## Nomenclatura

- MUST usar nomes claros e completos.
- MUST evitar abreviações obscuras.
- MUST usar camelCase para variáveis e métodos.
- MUST usar PascalCase para classes.
- MUST manter padrão consistente em todo o projeto.

---

## Postura Arquitetural

- MUST respeitar arquitetura existente.
- MUST evitar reescritas desnecessárias.
- MUST manter compatibilidade com produção.
- MUST sinalizar riscos técnicos.
- MUST NOT assumir requisitos implícitos.
- MUST ser direto e técnico.
- MUST NOT alterar rotas do sistema sem solicitação explícita.
- MUST focar alterações apenas em atualizações do sistema e deploy quando solicitado.

---

# SEGURANÇA (OBRIGATÓRIO)

- MUST validar dados no backend independentemente do frontend.
- MUST NOT confiar apenas na validação do frontend.
- MUST validar permissões no backend.
- MUST proteger rotas por autenticação e autorização.
- MUST NOT armazenar tokens sensíveis em localStorage.
- MUST sanitizar entradas contra XSS e SQL Injection.
- MUST registrar tentativas inválidas críticas (login, exclusão).
- MUST NOT expor stacktrace ao usuário final.
- MUST retornar mensagens amigáveis no frontend.

---

# PERFORMANCE E ESTADO (ANGULAR)

- MUST evitar múltiplas chamadas HTTP duplicadas.
- MUST evitar chamadas dentro de loops de renderização.
- MUST evitar memory leaks.
- MUST usar async pipe, takeUntil ou mecanismo equivalente de unsubscribe automático.
- MUST NOT usar subscribe manual sem controle.
- MUST carregar dados apenas uma vez quando possível.
- MUST centralizar estado compartilhado em Service.
- MUST manter padrão único de gerenciamento de estado.
- MUST NOT disparar chamadas HTTP repetidas sem necessidade.

---

# VERIFICAÇÃO DE CLIQUES E LAZY LOADING (OBRIGATÓRIO)

- MUST garantir que todos os botões funcionem corretamente no primeiro clique.
- MUST verificar que nenhum botão exija duplo clique para executar ação.
- MUST verificar que lazy loading não atrase o binding de eventos.
- MUST garantir que handlers estejam prontos no ngOnInit.
- MUST NOT depender de carregamento tardio para ativar eventos de clique.
- MUST validar que componentes carregados via lazy loading já estejam com listeners ativos.
- MUST evitar que módulos lazy causem re-renderizações que quebrem eventos.
- MUST evitar múltiplos bindings do mesmo evento.
- MUST garantir que click não esteja sendo bloqueado por:
  - overlays invisíveis
  - z-index incorreto
  - pointer-events ativos indevidamente
- MUST validar que não existam HostListener duplicados.
- MUST validar que não existam múltiplos subscribe disparando a mesma ação.
- MUST testar todos os botões CRUD após carregamento do módulo.
- MUST validar funcionamento após:
  - troca de aba
  - navegação entre rotas
  - retorno à tela anterior

Se identificado problema de lazy loading:

- MUST corrigir estrutura do módulo.
- MUST revisar importações.
- MUST revisar ciclo de vida do componente.
- MUST eliminar qualquer dependência de setTimeout para ativar clique.

---

# RESPONSABILIDADE DAS CAMADAS (BACKEND)

## Controller
- Receber requisição.
- Chamar Service.
- Retornar resposta.
- MUST NOT conter regra de negócio.

## Service
- Implementar regra de negócio.
- Realizar validações.
- Orquestrar chamadas.
- MUST NOT acessar HttpRequest diretamente.

## Repository
- Apenas acesso a dados.
- MUST NOT conter regra de negócio.

## Domain
- Modelo do sistema.

## DTO
- Transporte de dados.
- MUST NOT expor entidade diretamente.

---

# CÓDIGO (GERAL)

- MUST manter código simples, coeso e legível.
- MUST evitar duplicação.
- SHOULD aplicar responsabilidade única por método.
- SHOULD preferir composição em vez de herança.
- MUST NOT criar implementações temporárias.
- MUST NOT introduzir dependências sem justificativa técnica clara.
- MUST aplicar Design System global.
- MUST reutilizar biblioteca única de formulários.
- SHOULD implementar auditoria automática (quem alterou, quando e o que).

---

# PADRÃO OBRIGATÓRIO PARA TELAS (UI/UX)

## Referência Oficial

- MUST usar como referência a tela Cadastro de Beneficiário.
- MUST replicar padrão visual, estrutural e funcional.

## Base da Tela

- MUST usar app-tela-padrao.
- MUST usar [fullWidth]="true".
- MUST ocupar 100% da área útil com respiro lateral.
- MUST manter tipografia idêntica ao padrão Beneficiário.
- MUST manter ícone do título igual ao menu correspondente.
- MUST NOT criar variações visuais por tela.
- MUST aplicar estilos globais via src/styles.scss quando padrão global.
- MUST NOT duplicar CSS estrutural nos componentes.

---

# Cabeçalho da Página

- MUST exibir:
  - Linha 1: Menu pai em sentence case, cinza.
  - Linha 2: Tela atual em sentence case, preta.
- MUST existir apenas 1 título principal.
- MUST NOT duplicar header.
- MUST NOT sobrepor textos.
- MUST NOT adicionar títulos fora dos cards das abas.

---

# Barra de Ações CRUD (Ordem Fixa)

Buscar ? Novo ? Salvar ? Cancelar ? Excluir ? Imprimir ? Fechar

- MUST manter essa ordem.
- MUST destacar visualmente o botão Excluir.
- MUST manter Fechar como último botão.
- MUST garantir 1 clique por ação.
- MUST usar type="button" por padrão.
- MAY usar type="submit" apenas quando estritamente necessário.
- MUST inicializar handlers no ngOnInit.
- MUST NOT usar setTimeout como solução estrutural.
- MUST NOT duplicar eventos (click + mouseup, múltiplos listeners).

---

# Abas Laterais

- MUST usar abas laterais no padrão Beneficiário.
- MUST aplicar CSS global via src/styles.scss.
- MUST NOT duplicar CSS das abas nos componentes.
- MUST manter tamanho:
  - min-height: 44px
  - padding: 0.35rem 0.55rem
  - font-size: 0.8rem
- MUST permitir apenas 1 aba ativa por vez.
- MUST manter badge verde com texto em sentence case (exceto siglas).
- MUST manter comportamento idêntico ao padrão consolidado.

---

# Carregamento Automático de Dados

- MUST carregar dados ao abrir a tela.
- MUST usar lifecycle adequado (ngOnInit ou ngAfterViewInit quando necessário).
- MUST garantir atualização correta se usar OnPush.
- MUST NOT depender de clique, foco ou troca de aba para carregar dados.
- MUST NOT usar eventos artificiais ou gambiarras.

---

# Formulários e Validações

- MUST indicar campo obrigatório com (*).
- MUST exibir mensagem clara ao salvar com campos inválidos.
- MUST usar PopupErrorBuilder + app-popup-messages.
- MUST validar CPF:
  - Máscara 000.000.000-00
  - Validação completa
  - Indicar inválido com borda vermelha
- MUST validar CNPJ:
  - Máscara 00.000.000/0000-00
  - Validação completa

---

## Execução de Eventos, Botões e Formulários

- MUST garantir que toda ação do sistema seja executada com apenas um clique.
- MUST tratar como BUG CRÍTICO qualquer fluxo que exija dois cliques para funcionar.
- MUST validar corretamente eventos `(click)`, `(ngSubmit)` e botões dentro de formulários.
- MUST definir `type="button"` em botões que não sejam de submissão de formulário.
- MUST impedir bindings duplicados ou conflitos entre clique e submit.
- MUST garantir feedback visual imediato ao usuário em toda ação.
- MUST implementar loading visual em operações assíncronas.
- MUST impedir clique duplo durante processamento.
- MUST exibir mensagens claras de sucesso, erro ou validação.
- MUST garantir que a interface reflita a ação no primeiro clique, sem depender de nova interação do usuário.
- MUST revisar change detection, renderização e atualização de estado sempre que houver comportamento inconsistente.
- MUST evitar falhas silenciosas em botões, formulários, filtros, modais, tabelas e navegação por abas.
- MUST NOT aceitar comportamento em que o usuário precise insistir, clicar novamente ou repetir ação para que a interface responda.
- MUST NOT introduzir correções paliativas ou gambiarras apenas para mascarar o problema.
- MUST NOT deixar ações sem retorno visual durante processamento.

---

# Listagens

- MUST seguir modelo da listagem de Beneficiários.
- MUST manter apenas botão Limpar nos filtros.
- MUST manter botão Buscar apenas na barra CRUD superior.
- MUST permitir tecla Enter acionar Buscar sem duplicar evento.
- MUST remover botão Editar da listagem.
- MUST permitir abertura/edição com clique único na linha/card.
- MUST manter espaçamento horizontal adequado entre campos.

---

# Componentes Compartilhados (Reutilização Obrigatória)

- Autocomplete: MUST usar app-autocomplete.
- Mensagens de formulário: MUST usar PopupErrorBuilder + app-popup-messages.
- Mensagens globais: MUST usar ErrorService + ToastComponent.
- Confirmações: MUST usar app-dialog.
- Email: MUST usar configuração já existente do servidor.

---

# Banco de Dados

- MUST registrar alteração estrutural em init.db.
- MUST criar scripts idempotentes.
- MUST usar nomes em português sem acentuação.
- MUST usar PK id sequencial.
- MUST usar FKs obrigatórias.
- Ao criar entidade nova:
  - MUST criar Domain
  - MUST criar DTO
  - MUST criar Repository
  - MUST criar Service
  - MUST criar Controller

---

# Relatórios

- MUST padrão A4.
- MUST margens 20mm.
- MUST fonte Arial.
- MUST conter cabeçalho, corpo e rodapé.
- MUST conter "Página X de Y".
- MUST usar dados reais.
- MUST gerar HTML + PDF.
- MUST executar com 1 clique.
- MUST usar template único reutilizável.
- MUST padronizar rodapé do relatório em 3 linhas:
  - Linha 1: nome ou razão social da instituição.
  - Linha 2: CNPJ, endereço, bairro e cidade.
  - Linha 3: telefone, e-mail e site (se houver).

## Relatorio Padrao (#relatorio padrao)

- MUST, ao iniciar uma nova demanda de relatório, registrar: implementar relatorio conforme #relatorio padrao.
- MUST usar RelatorioTemplatePadrao para montar o HTML.
- MUST gerar PDF via HtmlPdfRenderer.
- MUST expor endpoint em /api/reports.
- MUST criar DTO de requisição quando houver filtros.
- MUST implementar Service dedicado e chamar a regra de negócio no Service.
- MUST manter Controller apenas orquestrando a resposta.
- MUST garantir dados reais e coerentes com o domínio.
- MUST ordenar dados de forma previsível.
- MUST retornar Content-Disposition inline com nome de arquivo .pdf.
- MUST integrar no frontend via ReportService.
- MUST abrir em nova guia e permitir 1 clique para imprimir.

---

# Testes

- MUST criar ou atualizar testes ao alterar comportamento.
- SHOULD priorizar fluxos críticos.
- MUST ser rápidos e deterministas.

---

# Logs

- MUST registrar erros críticos no backend.
- MUST registrar falhas de autenticação.
- MUST registrar exclusões críticas.
- MUST não expor stacktrace ao usuário.
- SHOULD seguir padrão único de log.

---

# Versão

- MUST atualizar versão em Configurações Gerais.
- MUST usar formato 1.00.0.
- MUST incrementar apenas o último grupo.
- MUST não repetir número de versão.
- MUST registrar mudanças de forma objetiva.

---

# CHECKLIST FINAL (ANTES DE ENTREGAR QUALQUER TELA)

Todo agente MUST confirmar:

- Tela idêntica ao padrão Beneficiário
- CRUD funcional
- 1 clique por ação
- Sem sobreposição visual
- Dados carregam automaticamente
- Validações completas
- Sem duplicação de código
- Backend seguro
- Banco atualizado via init.db
- Sem memory leak
- Sem CSS duplicado
- Idioma correto:
  - Frontend: pt-BR com acentuação
  - Backend: português sem acentuação


