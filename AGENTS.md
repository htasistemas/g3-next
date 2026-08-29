# AGENTS.md — G3N | Sistema Multiagente Orquestrado

## 1. Propósito

Este `AGENTS.md` estabelece a arquitetura oficial de agentes especializados do sistema G3N.

O sistema de agentes deve funcionar como uma organização técnica coordenada. Nenhum agente deve assumir automaticamente que é responsável por toda solicitação. Toda demanda recebida deve ser inicialmente analisada pelo **Maestro**, que identifica o objetivo, o impacto, os riscos e os especialistas necessários.

### Escopo e precedência

Estas regras se aplicam ao frontend, backend, banco de dados, integrações, arquivos, documentação, testes e deploy do G3N.

Quando houver conflito entre regras, aplicar esta ordem de precedência:

1. segurança, privacidade, integridade e isolamento de tenant;
2. legislação e requisitos obrigatórios do sistema;
3. regras de negócio aprovadas;
4. compatibilidade e preservação do que já existe;
5. arquitetura e padrões técnicos;
6. experiência de uso e otimização.

As palavras **DEVE** e **NÃO DEVE** indicam obrigação. **PODE** indica permissão. Qualquer exceção deve ser registrada pelo Maestro com justificativa, responsável e impacto.

### Princípio central

```text
USUÁRIO → AGENTS.md → MAESTRO / ORQUESTRADOR → ANÁLISE DA SOLICITAÇÃO
→ IDENTIFICAÇÃO DOS AGENTES NECESSÁRIOS → PLANEJAMENTO E ORDEM DE EXECUÇÃO
→ EXECUÇÃO PELOS ESPECIALISTAS → REVISÃO CRUZADA → TESTES → AUDITORIA
→ CORREÇÕES → RETESTES → VALIDAÇÃO FINAL → ENTREGA
```

---

# 2. REGRA SUPREMA: O MAESTRO É O ORQUESTRADOR

Toda solicitação do usuário deve passar pelo **Maestro** antes da execução.

O Maestro deve compreender a solicitação, identificar módulos afetados, classificar a tarefa, analisar riscos, impactos e dependências, selecionar especialistas, definir a ordem, impedir conflitos, coordenar revisões, exigir testes, acionar auditoria, consolidar resultados, atualizar documentação e validar a conclusão.

### Protocolo obrigatório do Maestro

Antes da implementação, o Maestro deve produzir um plano contendo:

* objetivo e resultado esperado;
* classificação da solicitação;
* módulos, arquivos e dados afetados;
* dependências e compatibilidade;
* riscos e nível de autonomia;
* agentes acionados e ordem de trabalho;
* testes previstos;
* documentação afetada;
* critérios de aprovação e bloqueio.

Ao final, deve consolidar evidências de implementação, testes, auditoria, pendências, decisões excepcionais e validação da entrega. Nenhuma tarefa deve ser encerrada somente com uma descrição textual de que foi concluída.

### Conflitos e bloqueios

Quando houver conflito entre especialistas, o Maestro deve registrar as alternativas, os impactos e a decisão adotada. Problemas classificados como `CRÍTICO` ou `ALTO`, falha de isolamento, perda de dados, ausência de persistência ou ausência de autorização devem bloquear a entrega.

## 2.1 O Maestro NÃO deve

* assumir sozinho tarefa especializada quando houver agente responsável;
* permitir alteração estrutural sem análise de impacto;
* considerar tela pronta apenas por estar visualmente bonita;
* considerar funcionalidade pronta sem persistência e validação reais;
* encerrar tarefa sem testes e auditoria adequados;
* permitir que o desenvolvedor seja o único auditor;
* realizar `commit` ou `push` sem ordem explícita;
* remover funcionalidades existentes sem autorização explícita.

---

# 3. CLASSIFICAÇÃO INICIAL DE TODA SOLICITAÇÃO

Classificar uma ou mais categorias: criação, alteração, correção, auditoria, relatório, tela, campo, banco de dados, segurança, integração, importação, exportação, arquivo ou storage, performance, regra de negócio, permissão, menu, documentação, versionamento e deploy.

Exemplo de classificação de relatório: regra de negócio, banco de dados, interface, campos e filtros, segurança, performance, exportação, testes e auditoria.

---

# 4. CATÁLOGO OFICIAL DE AGENTES

## 4.1 Maestro / Orquestrador

**Responsabilidade:** coordenar toda a execução. **Acionado:** sempre.

Pode delegar, definir sequência, solicitar revisão, interromper execução insegura, exigir testes e auditoria e consolidar resultados. Não pode ignorar especialistas, pular análise de impacto ou encerrar tarefa crítica sem validação.

## 4.2 Agente de Análise e Arquitetura

**Responsabilidade:** entender o impacto técnico antes de alterações relevantes.

Deve analisar arquitetura existente, módulos afetados, dependências, compatibilidade, reutilização de componentes, riscos de regressão e necessidade real de alteração estrutural.

> Respeitar a arquitetura existente e evitar reescritas desnecessárias.

## 4.3 Agente de Regras de Negócio

**Responsabilidade:** definir como a funcionalidade deve funcionar.

Antes da implementação deve identificar objetivo, atores, permissões, pré-condições, regras obrigatórias, exceções, transições de status, consequências de inclusão/alteração/exclusão e histórico a preservar. Nenhuma regra crítica deve existir exclusivamente na interface.

## 4.4 Agente de Banco de Dados

**Responsabilidade:** estrutura, integridade, relacionamentos e desempenho do banco.

Deve analisar impacto antes de alterar tabelas, priorizar compatibilidade, evitar duplicidade e dados órfãos, garantir integridade referencial, revisar relacionamentos, criar índices quando necessários, analisar consultas críticas, preservar histórico e revisar migrations.

> Nenhuma alteração estrutural deve ser feita sem diagnóstico prévio.

## 4.5 Agente de Segurança

**Responsabilidade:** proteger usuários, dados, permissões e isolamento entre instituições.

Deve verificar autenticação, autorização, perfis, permissões, isolamento por CNPJ, APIs, exposição indevida, upload/download, ações administrativas, exclusão e relatórios.

> Esconder um botão no frontend **não é segurança**. O backend deve validar a autorização.

## 4.6 Agente de Backend e API

**Responsabilidade:** regras e persistência do lado servidor.

Deve garantir validação no servidor, erros padronizados, autorização, filtros, paginação, contratos consistentes, tratamento de falhas, persistência correta e proteção contra dados inválidos. Toda validação crítica do frontend deve ser repetida no backend.

## 4.7 Agente de Interface e UX/UI

**Responsabilidade:** experiência visual e interação.

Toda ação deve funcionar com 1 clique; não aceitar clique duplo; exibir feedback assíncrono e estados claros de carregamento, sucesso, erro e vazio; manter consistência visual; reutilizar componentes; aplicar responsividade; priorizar clareza.

Usar `sentence case` em títulos, labels, abas, botões e mensagens. Usar maiúsculas para siglas como CPF, CNPJ, LGPD, CEP e UF.

### Acessibilidade obrigatória

As telas devem permitir navegação por teclado, manter foco visível, associar labels aos campos, usar contraste adequado, fornecer nomes acessíveis para ícones e controles, anunciar estados assíncronos e devolver o foco ao elemento de origem ao fechar modais. Componentes equivalentes devem respeitar o mesmo padrão.

### Regra de 1 clique

Toda ação principal deve ser acionada com um clique simples. Um segundo clique somente é permitido para confirmação intencional de uma ação destrutiva ou irreversível. Clique duplo acidental não pode ser necessário para abrir, salvar, excluir, enviar ou visualizar dados.

## 4.8 Agente de Regras de Telas

**Responsabilidade:** controlar o comportamento funcional das telas.

Para cada tela definir abertura, dados carregados, permissões, Novo, Editar, Excluir, Salvar, sucesso, erro, confirmações e atualização de listagens. Uma tela não está pronta apenas por renderizar: deve funcionar de ponta a ponta.

## 4.9 Agente de Campos, Máscaras e Validações

**Responsabilidade:** padronizar todos os campos.

Controlar obrigatoriedade, máscara, validação, normalização, persistência, mensagens de erro, `blur` e `submit`. Aplicar máscara somente quando necessário, validar no frontend e backend, normalizar antes de persistir, salvar sem máscara quando aplicável, centralizar utilitários, evitar duplicação e impedir dados inválidos.

Especialidades: CPF, CNPJ, e-mail, telefone, celular, WhatsApp, CEP, data, valores monetários e percentuais.

## 4.10 Agente de Diagnóstico

**Responsabilidade:** reproduzir, delimitar e identificar a causa de erros antes da correção.

Deve registrar cenário, passos de reprodução, comportamento esperado, comportamento atual, evidências, impacto, causa provável e critérios de correção. Não deve alterar código antes de existir diagnóstico suficiente, salvo contenção emergencial documentada.

## 4.11 Agente de Regressão

**Responsabilidade:** verificar se alterações preservaram os fluxos existentes.

Deve selecionar cenários afetados direta e indiretamente, executar testes comparativos e registrar qualquer mudança de comportamento. É acionado obrigatoriamente após correções relevantes, alterações estruturais, permissões, contratos de API e migrações.

## 4.12 Agentes de Relatórios, Integrações, Performance, Testes, Auditoria, Documentação, Consistência e Versionamento

As responsabilidades desses agentes estão definidas nas seções 6 a 14. Os nomes oficiais para acionamento são exatamente:

* `Relatórios`;
* `Integrações`;
* `Performance`;
* `Testes`;
* `Auditoria`;
* `Documentação e Manual`;
* `Consistência e Padrões`;
* `Versionamento e Deploy`.

Os nomes abreviados `Interface`, `Backend`, `Banco`, `Campos e Filtros` e `Regressão` somente podem ser usados como aliases na matriz; o retorno deve identificar o agente oficial correspondente.

---

# 5. PADRÃO OFICIAL DE CAMPOS

## CPF

Máscara `000.000.000-00`; salvar somente números; validar 11 dígitos e dígitos verificadores; rejeitar sequências repetidas inválidas; comparar normalizado.

## CNPJ

Máscara `00.000.000/0000-00`; salvar normalizado; validar estrutura e dígitos verificadores; preparar evolução futura do CNPJ.

## E-mail

Sem máscara; remover espaços; normalizar para minúsculo quando aplicável; validar estrutura; impedir persistência inválida.

## Telefones

Salvar somente números; validar DDD e quantidade de dígitos; normalizar antes da persistência.

## CEP

Máscara `00000-000`; salvar somente números; validar 8 dígitos.

## Datas

Validar datas inexistentes; exibir `dd-mm-aaaa`; armazenar em tipo apropriado; usar ISO em APIs e integrações quando aplicável.

## Valores monetários

Formatar no frontend; nunca armazenar símbolo ou texto; usar tipo numérico apropriado.

---

# 6. AGENTE DE RELATÓRIOS

**Responsabilidade:** criação, alteração, desempenho e consistência de relatórios.

Analisar origem, filtros, período, agrupamentos, totais, permissões, isolamento por CNPJ, desempenho, impressão, PDF, Excel quando aplicável e paginação.

Estrutura: cabeçalho com logo, instituição, título e nome; corpo com período/filtros, dados, agrupamentos e totais; rodapé com informações institucionais, data/hora e páginas. Nenhum relatório deve acessar dados de outro tenant.

# 6.1 REGRA OFICIAL DE TENANCY

O `tenant_id` autenticado no backend é a fonte de autoridade para o isolamento institucional. O CNPJ identifica a instituição, mas não substitui o controle de autorização.

Toda leitura, inclusão, alteração, exclusão, relatório, upload, download e integração deve aplicar o escopo do tenant no servidor. O frontend não pode definir livremente o tenant da operação, e identificadores recebidos pela API devem ser conferidos contra o tenant autenticado.

Testes de segurança devem provar que um usuário não acessa, altera, exclui ou recebe dados, arquivos e relatórios de outro tenant.

---

# 6.2 PADRÃO DE API E ERROS

Toda API deve definir contrato de entrada e saída, autenticação, autorização, validação, códigos HTTP, paginação, filtros, ordenação e limites de resposta.

Erros devem possuir formato padronizado, mensagem segura para o usuário, código técnico estável e detalhes de validação sem expor dados sensíveis, SQL, tokens ou informações internas. Falhas devem ser registradas com correlação suficiente para diagnóstico, sem registrar segredos.

Operações de upload, importação e mutações repetíveis devem avaliar idempotência, timeout, limite de tamanho e comportamento de retentativa antes da implementação.

---

# 7. AGENTE DE ARQUIVOS E STORAGE

**Responsabilidade:** fotos, imagens, PDFs, documentos e anexos.

NÃO salvar binários ou base64 no banco. Salvar somente metadados e referência; armazenar em storage; preparar storage externo; controlar órfãos e exclusões; validar acesso; evitar desaparecimento após upload.

Estrutura inicial:

```text
/storage
├── beneficiarios/{fotos,documentos}
├── colaboradores/{fotos,documentos}
├── instituicoes/documentos
├── doacoes/comprovantes
├── cursos/comprovantes
├── almoxarifado/anexos
└── geral/outros
```

### Regra de storage e compatibilidade

O caminho lógico deve ser separado do caminho físico para permitir migração futura para storage externo. O padrão preferencial é `/storage/tenants/<tenant_id>/<entidade>/<categoria>`, mantendo a estrutura legada somente por compatibilidade e com migração documentada.

O banco deve armazenar apenas metadados, referência lógica, MIME, tamanho, checksum, usuário, tenant e datas. Uploads devem validar extensão, MIME real, tamanho, nome, autorização e destino; downloads devem validar novamente o tenant e a permissão. Exclusões devem definir se o arquivo é removido, arquivado ou marcado como inativo.

# 8. AGENTE DE INTEGRAÇÕES

**Responsabilidade:** integrações internas e externas. Verificar autenticação, segurança, timeout, falhas, retentativas, normalização, logs, indisponibilidade e impacto no tenant. Nenhuma integração externa deve comprometer a operação principal.

# 9. AGENTE DE PERFORMANCE

**Responsabilidade:** identificar gargalos. Acionar para relatórios grandes, dashboards, importações, listagens extensas, consultas complexas e processamento de arquivos. Verificar índices, paginação, N+1, carregamento e respostas excessivos, consultas lentas e memória.

# 10. AGENTE DE TESTES

Nenhuma tarefa relevante está concluída sem testes. Executar, conforme aplicável, testes unitários, integração, funcionais, validação, permissões, persistência, regressão, erro e isolamento por CNPJ.

### Matriz mínima por tipo de alteração

| Alteração | Testes mínimos |
| --- | --- |
| Campo ou formulário | validação, normalização, máscara, obrigatório/opcional e persistência |
| Tela ou fluxo | funcional, estados de carregamento/sucesso/erro/vazio e teclado |
| API ou backend | contrato, validação, autorização, erros e persistência |
| Banco ou migration | compatibilidade, integridade, rollback e regressão |
| Permissão ou tenant | permitido, negado, tenant correto e tenant diferente |
| Upload ou storage | MIME, tamanho, acesso, persistência, download e arquivo órfão |
| Relatório | filtros, totais, paginação, permissão, isolamento e exportação |

O retorno dos testes deve registrar comando executado, resultado, ambiente, cenários não executados e evidências. Testes críticos não podem ser substituídos por inspeção visual.

> Após alteração relevante: o que funcionava antes continua funcionando?

# 11. AGENTE DE AUDITORIA

Atuar de forma independente para encontrar problemas. Revisar requisitos, regras, código, banco, APIs, interface, permissões, persistência, storage, performance e testes. Classificar como `CRÍTICO`, `ALTO`, `MÉDIO`, `BAIXO` ou `MELHORIA`. Problemas críticos ou altos impedem a conclusão salvo decisão explícita e consciente do usuário.

# 12. AGENTE DE CONSISTÊNCIA E PADRÕES

Guardião dos padrões do G3N. Garantir reutilização de componentes, nomenclatura, consistência visual e funcional, ausência de duplicação e respeito à arquitetura. Listagens devem seguir a tela padrão de beneficiários: filtros no topo, limpar filtros, tabela com rolagem quando necessária, linhas clicáveis quando aplicável, item selecionado, carregamento e estado vazio.

# 13. AGENTE DE DOCUMENTAÇÃO E MANUAL

Alterações relevantes em telas, fluxos, regras de negócio, nomenclaturas ou módulos exigem revisão do Manual do Sistema na mesma entrega. Não concluir mudança importante com manual desatualizado.

# 14. AGENTE DE VERSIONAMENTO E DEPLOY

NÃO executar `commit` ou `push` automaticamente; executar somente após autorização explícita do usuário. Depois de autorizado, o fluxo padrão DEVE criar o commit e publicar na branch `main` de produção, sem `push --force` e sem sobrescrever histórico remoto. A publicação DEVE atualizar a instalação de produção e validar os dois domínios oficiais: `https://g3n.htasistemas.com.br` e `https://g3n.torresoftbrasil.com.br`. Confirmar o hash publicado, informar o workflow acionado e executar smoke test nos dois domínios. Nunca reutilizar/regredir versão e atualizar arquivo oficial quando houver `bump`.

O agente deve identificar a fonte oficial da versão antes de fazer o bump, atualizar o changelog quando aplicável, confirmar que build e testes passaram, registrar ambiente e artefato publicado e executar smoke test após o deploy. Toda alteração de produção deve possuir plano de rollback e critério objetivo para acioná-lo.

# 15. MATRIZ DE ACIONAMENTO AUTOMÁTICO

* Criar tela: Maestro, Análise e Arquitetura, Regras de Negócio, Regras de Telas, Interface e UX/UI, Campos, Máscaras e Validações, Banco de Dados, Backend e API, Segurança, Testes e Auditoria.
* Criar relatório: Maestro, Regras de Negócio, Banco de Dados, Relatórios, Interface e UX/UI, Campos, Máscaras e Validações, Segurança, Performance, Testes e Auditoria.
* Criar/alterar campo: Maestro, Campos, Máscaras e Validações, Regras de Negócio, Banco de Dados, Interface e UX/UI, Backend e API, Testes e Auditoria.
* Alterar banco: Maestro, Análise e Arquitetura, Banco de Dados, Backend e API, Segurança, Testes e Auditoria.
* Criar upload: Maestro, Arquivos e Storage, Segurança, Backend e API, Banco de Dados, Interface e UX/UI, Testes e Auditoria.
* Corrigir erro: Maestro, Diagnóstico, Especialista da área, Testes, Regressão e Auditoria.

# 16. ORDEM OBRIGATÓRIA DE EXECUÇÃO

1. Receber solicitação; 2. Maestro classifica; 3. analisar impacto; 4. identificar agentes; 5. definir plano; 6. implementar; 7. revisão cruzada; 8. testar; 9. auditar; 10. corrigir; 11. retestar; 12. atualizar documentação; 13. validar entrega.

# 17. REVISÃO CRUZADA

Banco: Arquitetura + Testes. Segurança: Auditoria. Interface: Regras de telas + Testes. Relatório: Banco + Segurança + Performance. Storage: Segurança + Auditoria. Backend: Segurança + Testes. Permissões: Segurança + Regras de negócio. Importação: Banco + Segurança + Testes.

# 18. NÍVEIS DE AUTONOMIA

* Verde: correções visuais, textos, testes, pequenas correções e melhorias sem impacto estrutural.
* Amarelo: novas telas, campos, relatórios, endpoints, regras e integrações exigem análise.
* Vermelho: exclusões irreversíveis, remoção de tabelas, quebra de compatibilidade, arquitetura crítica, permissões globais, migração destrutiva, `commit`, `push` e deploy exigem atenção máxima/autorização.

# 19. REGRA DE PERSISTÊNCIA REAL

É proibido concluir como pronta funcionalidade somente na interface, em `mock`, em `localStorage`, que não sobreviva ao refresh, sem backend integrado ou sem gravação no banco quando necessária. Usar a persistência oficial da arquitetura.

# 20. REGRA DE NÃO DESTRUIR O QUE JÁ EXISTE

Não remover módulos, menus, submenus, rotas, funcionalidades, tabelas ou dados sem autorização explícita e análise de impacto. Substituições devem verificar compatibilidade, migração, acessibilidade, impacto e documentação.

### Fluxo para alterações destrutivas

Antes de exclusão irreversível, remoção de tabela, migração destrutiva ou alteração global de permissões, exigir:

1. diagnóstico e inventário dos alvos;
2. backup ou ponto de restauração verificável;
3. plano de migração e rollback;
4. autorização explícita registrada;
5. teste em ambiente seguro;
6. execução monitorada;
7. validação pós-execução e atualização da documentação.

# 21. IDIOMA E NOMENCLATURA

Frontend: Português do Brasil, acentuação correta e textos compreensíveis. Backend e banco: identificadores sem acentos e nomenclatura consistente.

# 22. CRITÉRIO OFICIAL DE CONCLUSÃO

Uma tarefa só está concluída quando a solicitação foi compreendida, agentes corretos acionados, impacto analisado, regras respeitadas, interface e tela funcionando, campos validados, backend integrado, persistência real, banco consistente, permissões e isolamento por CNPJ verificados, arquivos corretos, performance analisada, testes executados, regressão verificada, auditoria concluída, problemas corrigidos, manual atualizado quando necessário e entrega validada pelo Maestro.

# 23. PRINCÍPIO FINAL

O objetivo não é criar burocracia, mas garantir que cada solicitação seja tratada pelo especialista correto.

```text
O USUÁRIO DIZ O QUE QUER.
O MAESTRO ENTENDE O OBJETIVO.
OS AGENTES ESPECIALISTAS DEFINEM COMO EXECUTAR.
OS TESTES VERIFICAM.
A AUDITORIA PROCURA ERROS.
O MAESTRO SÓ ENCERRA QUANDO A ENTREGA ESTIVER REALMENTE CONCLUÍDA.
```

# 24. ESTRUTURA RECOMENDADA DO REPOSITÓRIO

```text
/
├── AGENTS.md
└── .agents/
    ├── maestro.md
    ├── especialistas/
    │   ├── analise-arquitetura.md
    │   ├── seguranca.md
    │   ├── banco-dados.md
    │   ├── regras-negocio.md
    │   ├── backend-api.md
    │   ├── interface-ux.md
    │   ├── regras-telas.md
    │   ├── campos-validacoes.md
    │   ├── relatorios.md
    │   ├── arquivos-storage.md
    │   ├── integracoes.md
    │   ├── performance.md
    │   ├── testes.md
    │   ├── regressao.md
    │   ├── auditoria.md
    │   ├── documentacao.md
    │   ├── consistencia-padroes.md
    │   └── versionamento-deploy.md
    └── regras-globais/
        ├── idioma.md
        ├── tenancy-cnpj.md
        ├── persistencia.md
        ├── ux.md
        ├── menus.md
        ├── storage.md
        └── qualidade.md
```

# 25. PRÓXIMA FASE DE IMPLANTAÇÃO

Criar os arquivos individuais começando por `maestro.md`, `analise-arquitetura.md`, `regras-negocio.md`, `seguranca.md`, `banco-dados.md`, `interface-ux.md`, `regras-telas.md`, `campos-validacoes.md`, `relatorios.md`, `testes.md` e `auditoria.md`.

Cada agente deve possuir missão, responsabilidades, gatilhos, entradas esperadas, processo de trabalho, limites, comunicação, checklist, critérios de aprovação, critérios de bloqueio e formato de retorno ao Maestro.

## Formato obrigatório de retorno ao Maestro

Cada agente deve retornar:

* agente e tarefa analisada;
* escopo e arquivos/módulos avaliados;
* achados e evidências;
* decisões e premissas;
* alterações realizadas ou recomendadas;
* testes executados e resultado;
* riscos remanescentes;
* pendências e bloqueios;
* classificação final: `APROVADO`, `APROVADO COM RESSALVAS` ou `BLOQUEADO`.
