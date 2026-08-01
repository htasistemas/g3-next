# Plano de reestruturação do módulo Educacional do G3N

**Status:** auditoria concluída; fundação, operação acadêmica inicial, dashboard e hardening de integridade implementados parcialmente. O fluxo avançado permanece planejado por fases.

**Escopo desta revisão:** mapear a implementação existente, registrar conflitos arquiteturais e definir uma refatoração incremental, sem remover a Fase 1 já criada.

## 1. Diretriz arquitetural

O cadastro central de pessoa continua sendo a fonte oficial dos dados pessoais.

```text
cadastro_beneficiario
        ↓
vínculo educacional / aluno
        ↓
matrícula escolar por ano letivo
        ↓
turma, frequência, avaliações e histórico
```

Para a equipe:

```text
cadastro_profissionais
        ↓
vínculo educacional profissional
        ↓
função, unidade, disciplina, turma e carga horária
```

O registro educacional não deverá copiar nome, CPF, endereço ou telefone da pessoa. Deve manter apenas as chaves de referência e os atributos próprios do domínio educacional.

O módulo `matriculas` existente em `/api/matriculas` continua reservado a cursos, oficinas, atividades, vagas, inscrições e lista de espera. Ele não será reutilizado para matrícula escolar, evitando misturar os dois domínios.

## 2. Arquitetura atual identificada

### Frontend

- React, Vite e TypeScript em `frontend/src`.
- Rotas lazy-loaded em `frontend/src/routes/route-modules.ts` e `frontend/src/routes/router.tsx`.
- Menu centralizado em `frontend/src/app/app-shell.tsx`, com filtro por permissão.
- Tela atual em `frontend/src/pages/educacional/educacional-page.tsx`.
- Serviços em `frontend/src/services/educacional.service.ts`.
- Tipos em `frontend/src/types/educacional.ts`.
- Componentes G3N reutilizáveis: `AdminPageLayout`, `Card`, `Button`, `Input`, `Select` e componentes de listagem.
- O estado atual ainda possui apenas as abas Visão geral, Estrutura acadêmica, Alunos e matrículas e Alunos por turma.

### Backend

- Node.js, Express e TypeScript.
- Módulo atual em `backend/src/modules/educacional`, organizado em rotas, controller, service, repository, schema e types.
- Rotas registradas em `backend/src/routes/index.ts` com prefixo `/api/educacional`.
- Validação com Zod.
- Persistência do Educacional implementada por SQL parametrizado via Prisma, em vez de modelos Prisma tipados.

### Banco e migração existente

- Migration: `backend/prisma/migrations/20260718_create_educacional_fase1/migration.sql`.
- Tabelas existentes da Fase 1:
  - `educacional_ano_letivo`;
  - `educacional_etapa`;
  - `educacional_serie`;
  - `educacional_disciplina`;
  - `educacional_turma`;
  - `educacional_aluno`;
  - `educacional_matricula`;
  - `educacional_enturmacao`;
  - `educacional_auditoria`.
- As tabelas possuem `tenant_id`, índices básicos e unicidades por tenant.
- Beneficiários são referenciados por `beneficiario_id`.

### Cadastros centrais reutilizáveis

- Beneficiários: `cadastro_beneficiario`.
- Famílias e vínculos: `vinculo_familiar` e `vinculo_familiar_membro`.
- Profissionais: `cadastro_profissionais`.
- Usuários, autenticação e permissões: módulos existentes de autenticação e usuários.
- Unidades e salas: cadastros existentes, que deverão ser validados antes de receber vínculos educacionais.

## 3. Conflitos e riscos encontrados

### 3.1 Vínculo de aluno e matrícula

`educacional_aluno` já evita duplicar o beneficiário com `UNIQUE (tenant_id, beneficiario_id)`, o que é aproveitável. Porém, a matrícula depende de `aluno_id` e não expõe diretamente o beneficiário, unidade escolar, tipo de matrícula, origem, escola anterior, necessidades específicas ou observações educacionais. A camada de aplicação precisa garantir a navegação completa sem criar outra pessoa.

**Decisão:** preservar `educacional_aluno` como vínculo técnico compatível com dados já criados e evoluí-lo para uma entidade de papel educacional, sem duplicar pessoa. A matrícula continuará sendo o vínculo acadêmico histórico principal.

### 3.2 Integridade multi-tenant no banco

As referências atuais usam FKs simples por `id` em várias tabelas. Como os IDs são globais, o serviço valida o tenant antes de gravar, mas a constraint do banco não impede sozinha uma referência cruzada entre tenants caso surja um novo caminho de escrita.

**Risco:** depender apenas do service para uma regra crítica de isolamento.

**Decisão:** nas migrations de evolução, criar unicidades compostas `(tenant_id, id)` e FKs compostas quando compatível com PostgreSQL, além de manter validação do tenant no service e derivar o tenant exclusivamente da sessão.

### 3.3 Unidades, salas e profissionais

`unidade_id`, `sala_id` e `professor_responsavel_id` ainda não possuem relacionamento educacional completo. A turma também mantém `professor_responsavel_nome`, que duplica dado pessoal.

**Decisão:** usar IDs de cadastros centrais e remover a dependência operacional do nome copiado. A eventual coluna legada será preservada para compatibilidade e deixará de ser fonte de verdade.

### 3.4 Permissões e escopo de acesso

As rotas atuais aceitam permissões amplas como `ADMINISTRADOR`, `OPERADOR` e `LEITURA_APENAS`. Não existe ainda escopo por unidade, turma, disciplina ou vínculo de professor.

**Risco:** um professor poderia receber acesso maior que o necessário quando a nova operação for adicionada.

**Decisão:** manter compatibilidade para a fundação, mas criar permissões específicas e uma política de escopo para professor, coordenação, direção e secretaria antes da Fase 2.

### 3.5 API genérica de gravação

`POST/PUT /api/educacional/:recurso` usa um repository genérico. Os schemas limitam parte dos campos, mas o desenho é frágil para regras diferentes de matrícula, frequência, notas e documentos.

**Decisão:** manter a API genérica apenas para cadastros simples da fundação. Novos domínios terão endpoints e services específicos, com transações, regras de status e auditoria próprias.

### 3.6 Frontend e UX

A tela atual concentra cadastros simples em uma página longa, usa listas limitadas a 500 itens, não possui paginação, edição consistente, tela 360º do aluno, filtros no padrão da listagem de beneficiários ou fluxo completo de matrícula.

O menu ainda exibe apenas quatro itens da fundação e usa a nomenclatura legada “Alunos por turma” para o fluxo que substituiu “Enturmação”.

**Decisão:** manter a rota `/educacional` e ampliar progressivamente as telas através do padrão do G3N. A operação deverá usar telas específicas quando houver regras próprias, sem criar um formulário universal gigante.

### 3.7 Banco e Prisma

A migration educacional existe, mas as entidades não estão declaradas como modelos equivalentes no `backend/prisma/schema.prisma`; a persistência depende de SQL raw.

**Decisão:** não converter tudo de uma vez. Na próxima migration, avaliar a declaração gradual dos modelos ou manter SQL isolado com repositories tipados. A escolha será feita por domínio, sem alterar migrations já aplicadas.

### 3.8 Testes

Há testes gerais e testes do módulo de matrículas de cursos, mas não foi identificado conjunto dedicado ao Educacional cobrindo persistência, tenant, autorização, duplicidade, matrícula e histórico.

**Decisão:** criar testes do Educacional antes de iniciar o Diário de Classe e tornar a execução parte do critério de cada fase.

### 3.9 Correções aplicadas nesta revisão

- O dashboard passou a calcular disciplinas ativas e anos letivos abertos no PostgreSQL.
- A tela Alunos foi separada da tela Matrículas, mantendo a navegação agrupada por abas.
- O backend bloqueia alocação ativa duplicada, turma acima da capacidade, nota superior ao valor máximo da avaliação e unidade assistencial em turmas/matrículas educacionais.
- Foi criada uma migration incremental de índices e permissões, sem alterar migrations anteriores.
- O deploy ganhou fallback idempotente para bancos legados sem histórico `_prisma_migrations`.

## 4. Menu definitivo planejado

O menu principal será `Educacional`, nesta ordem:

1. Visão geral
2. Alunos
3. Matrículas
4. Responsáveis/Famílias
5. Professores e equipe pedagógica
6. Unidades escolares
7. Ano letivo
8. Etapas de ensino
9. Turmas
10. Disciplinas/Componentes curriculares
11. Grade curricular
12. Horários
13. Diário de classe
14. Chamada/Frequência
15. Avaliações e notas
16. Boletins
17. Plano de aula
18. Planejamento pedagógico
19. Ocorrências
20. Agenda escolar
21. Documentos/Declarações
22. Histórico escolar
23. Relatórios e indicadores

Cada submenu terá rota real ou será agrupado em uma tela com abas apenas quando as regras e o fluxo forem efetivamente os mesmos. Não serão criados itens que exibam telas vazias ou mocks.

## 5. Modelo de dados-alvo

### Fundação e vínculos

- `educacional_ano_letivo` e `educacional_periodo`.
- `educacional_etapa` e `educacional_serie`.
- `educacional_unidade_vinculo` para atributos educacionais de uma unidade central, sem duplicar a unidade assistencial.
- `educacional_aluno` como papel/vínculo único para um beneficiário por tenant.
- `educacional_matricula` para cada vínculo escolar histórico.
- `educacional_matricula_movimentacao` para transferências, cancelamentos, trancamentos e conclusões.
- `educacional_turma`.
- `educacional_profissional_vinculo` para profissional/equipe pedagógica.
- `educacional_responsavel` ou relação específica sobre vínculos familiares existentes, somente quando os atributos forem educacionais.

### Vida acadêmica

- `educacional_disciplina`.
- `educacional_grade_curricular` e itens.
- `educacional_horario`.
- `educacional_aula`/diário.
- `educacional_frequencia` e registros por aluno.
- `educacional_plano_aula`.
- `educacional_avaliacao` e notas/conceitos.
- `educacional_boletim` e emissões.
- `educacional_historico_escolar`.

### Gestão e modalidades

- ocorrências, agenda escolar, documentos emitidos e auditoria.
- rotina infantil e desenvolvimento, isolados do domínio clínico.
- indicadores derivados de dados autorizados, sem expor textos pedagógicos sensíveis em consultas agregadas.

Todas as tabelas novas devem possuir tenant, chaves estrangeiras, índices de consulta e regras de histórico adequadas. Arquivos terão somente metadados e caminho de storage, seguindo a regra do AGENTS.md.

## 6. APIs e autorização-alvo

O prefixo continuará sendo `/api/educacional`. A fundação poderá manter os endpoints atuais durante a compatibilidade; os novos domínios terão endpoints explícitos, por exemplo:

- `/anos-letivos`, `/etapas`, `/series`, `/turmas`, `/disciplinas`;
- `/alunos`, `/alunos/:id/visao-360`;
- `/matriculas` e `/matriculas/:id/movimentacoes`;
- `/profissionais/vinculos`;
- `/diarios`, `/frequencias`, `/planos-aula`;
- `/avaliacoes`, `/notas`, `/boletins`;
- `/ocorrencias`, `/agenda`, `/documentos`, `/relatorios`.

Permissões iniciais a consolidar conforme a convenção existente:

- `EDUCACIONAL_VISUALIZAR`;
- `EDUCACIONAL_ADMINISTRAR`;
- `EDUCACIONAL_ALUNO_EDITAR`;
- `EDUCACIONAL_MATRICULA`;
- `EDUCACIONAL_FREQUENCIA`;
- `EDUCACIONAL_NOTAS`;
- `EDUCACIONAL_BOLETIM`;
- `EDUCACIONAL_DIARIO`;
- `EDUCACIONAL_OCORRENCIAS`;
- `EDUCACIONAL_DOCUMENTOS`;
- `EDUCACIONAL_RELATORIOS`.

Os nomes existentes serão mantidos quando já houver dados atribuídos. Não serão criadas permissões paralelas sem migração de compatibilidade.

## 7. Plano de execução por fases

### Fase 0 — auditoria e compatibilidade

- concluir inventário e confirmar nomes dos cadastros centrais;
- criar testes de tenant e duplicidade para a Fase 1;
- corrigir referências cruzadas e validações sem remover tabelas;
- revisar o manual e a versão somente quando houver alteração funcional.

### Fase 1 — fundação

- menu definitivo e rotas de fundação;
- visão geral baseada em banco real;
- alunos vinculados a beneficiários;
- matrícula escolar histórica;
- unidades escolares, anos letivos, etapas e turmas;
- profissionais com vínculo educacional;
- filtros, paginação, edição e estados de carregamento/vazio.

### Fase 2 — vida acadêmica

- responsáveis e autorizações;
- disciplinas/componentes;
- grade curricular;
- horários e detecção de conflitos.

### Fase 3 — operação pedagógica

- diário de classe;
- chamada e frequência;
- conteúdo ministrado;
- plano de aula e planejamento.

### Fase 4 — avaliação

- avaliações, notas, conceitos, médias, recuperação;
- boletins, conselho e resultado final;
- histórico sem sobrescrever resultados anteriores.

### Fase 5 — gestão escolar

- ocorrências;
- agenda;
- documentos e declarações;
- relatórios e indicadores.

### Fase 6 — creche e educação infantil

- rotina diária;
- alimentação, sono, higiene e medicação autorizada;
- desenvolvimento e parecer descritivo;
- comunicação com responsáveis.

## 8. Estratégia de migração segura

1. Não alterar ou apagar migrations aplicadas.
2. Criar migrations incrementais e compatíveis.
3. Manter adaptadores para os endpoints da Fase 1 durante a transição.
4. Migrar tela por tela, preservando a rota `/educacional`.
5. Fazer escrita dupla somente se houver necessidade comprovada e por período curto, com auditoria; não usar mocks ou localStorage.
6. Validar tenant no backend, na query, na regra de negócio e nos relatórios.
7. Só remover campo legado depois de verificar uso, dados existentes e plano de rollback.
8. Atualizar o Manual do sistema na mesma entrega funcional.

## 9. Testes obrigatórios por fase

- beneficiário existente não gera pessoa duplicada;
- o mesmo beneficiário pode ter matrículas de anos letivos diferentes;
- matrícula transferida/cancelada permanece no histórico;
- profissional central não é duplicado ao receber função educacional;
- tenant A não consulta, altera ou exporta dados do tenant B;
- professor só acessa turmas e disciplinas autorizadas;
- capacidade de turma e conflitos de horário são respeitados;
- dados persistem após fechar e reabrir a tela;
- auditoria registra alterações críticas sem armazenar conteúdo sensível em log comum;
- build, typecheck, lint disponível, migrations em ambiente seguro e testes automatizados.

## 10. Critérios para iniciar codificação da próxima fase

Antes da próxima implementação pesada, devem estar definidos e validados:

- IDs e escopo dos cadastros de beneficiários, profissionais, unidades e salas;
- estratégia de FK composta ou validação transacional de tenant;
- permissões compatíveis com o RBAC atual;
- contrato de API de aluno, matrícula e vínculo profissional;
- testes de persistência e isolamento;
- impacto no manual e no arquivo de versão;
- fluxo de fallback para registros já criados pela Fase 1.

## 11. Resultado da auditoria

A base atual pode ser aproveitada, mas não deve receber todos os 23 submenus por simples expansão visual. A ordem segura é fortalecer o vínculo central e a integridade multi-tenant, completar fundação e matrícula, depois avançar para operação pedagógica. Assim o módulo poderá crescer sem duplicar pessoas, sem misturar inscrições de cursos com matrícula escolar e sem criar telas sem persistência real.
