# Plano técnico do módulo Educacional do G3N

## 1. Diagnóstico da arquitetura atual

O G3N está em uma aplicação única com:

- Frontend React + Vite + TypeScript em `frontend/src`.
- Backend Node.js + Express + TypeScript em `backend/src`.
- PostgreSQL acessado principalmente por Prisma e consultas SQL parametrizadas.
- Rotas lazy-loaded registradas em `frontend/src/routes/route-modules.ts` e `frontend/src/routes/router.tsx`.
- Menu lateral centralizado em `frontend/src/app/app-shell.tsx`, com filtragem por permissões.
- Layouts e componentes reutilizáveis em `frontend/src/components`, especialmente `AdminPageLayout`, `Card`, `Button`, `Input`, `Select` e popups administrativos.
- Backend organizado por módulos com rotas, controllers, services, repositories, schemas, types e mappers.
- Autenticação por usuário autenticado e autorização por nomes de permissões.
- Dados de operação segregados por `tenant_id` nos módulos mais recentes; toda consulta educacional deverá aplicar o tenant derivado da sessão, nunca recebido do frontend.
- Migrations incrementais em `backend/prisma/migrations`; módulos legados também possuem rotinas de garantia de estrutura por compatibilidade.
- Manual do sistema e arquivos oficiais de versão fazem parte da entrega de novas telas e fluxos.

## 2. Entidades existentes a reutilizar

Não será criada uma segunda entidade de pessoa/aluno.

- `cadastro_beneficiario`: pessoa base e referência do aluno.
- `vinculo_familiar` e `vinculo_familiar_membro`: famílias e relações já cadastradas, para responsáveis educacionais futuros.
- `cadastro_profissionais`: professores e demais profissionais, sem duplicar cadastro.
- `unidade_assistencial` e `salas_unidade`: unidade e salas existentes.
- `usuarios`, permissões e sessão autenticada: autoria, acesso e auditoria.
- documentos, arquivos, atendimentos e relatórios existentes: integrações posteriores.

O vínculo educacional será `beneficiário -> aluno educacional -> matrícula`, com histórico de matrículas por ano letivo.

## 3. Modelo de dados da Fase 1

Todas as tabelas novas terão `tenant_id`, timestamps e índices compostos por tenant. A migration será incremental e não alterará tabelas antigas destrutivamente.

- `educacional_ano_letivo`: ano, descrição, datas, status e períodos em JSONB controlado.
- `educacional_etapa`: etapas configuráveis, como creche, educação infantil e ensino fundamental.
- `educacional_serie`: série/ano vinculada a uma etapa.
- `educacional_disciplina`: código, nome, área, carga horária e status.
- `educacional_turma`: ano letivo, unidade, etapa, série, sala, turno, capacidade, professor responsável e status.
- `educacional_aluno`: vínculo único entre tenant e `cadastro_beneficiario`.
- `educacional_matricula`: histórico do aluno por ano letivo, unidade, etapa, série e situação.
- `educacional_enturmacao`: histórico de movimentação do aluno entre turmas, preservando alterações.
- `educacional_auditoria`: alterações críticas da fundação, com usuário, ação, valores anterior/novo e tenant.

As chaves para beneficiário, ano letivo, etapa, série e turma terão constraints de integridade. A unidade e a sala serão referenciadas por ID e validadas no backend dentro do contexto permitido pela instituição.

## 4. APIs propostas para a Fase 1

Prefixo: `/api/educacional`, autenticado e protegido por permissões educacionais.

- `GET /resumo`: indicadores básicos reais do tenant.
- `GET/POST/PUT /anos-letivos` e `POST /anos-letivos/:id/encerrar`.
- `GET/POST/PUT /etapas`.
- `GET/POST/PUT /series`.
- `GET/POST/PUT /disciplinas`.
- `GET/POST/PUT /turmas`.
- `GET /alunos/busca`.
- `POST /alunos/vincular`: transforma ou reutiliza um beneficiário como aluno.
- `GET/POST/PUT /matriculas`.
- `GET/POST /enturmacoes` para registrar e consultar o histórico de turma.

Os schemas Zod validarão entradas no backend e o frontend terá validação correspondente. Respostas de listagem terão estados de carregamento, vazio e erro e serão pagináveis quando o volume exigir.

## 5. Permissões

Permissões planejadas, seguindo a convenção existente:

- `EDUCACIONAL_VISUALIZAR`.
- `EDUCACIONAL_ESTRUTURA_EDITAR`.
- `EDUCACIONAL_MATRICULAS_VISUALIZAR`.
- `EDUCACIONAL_MATRICULAS_EDITAR`.
- `EDUCACIONAL_ENTURMACAO_EDITAR`.
- `EDUCACIONAL_RELATORIOS_VISUALIZAR`.

O administrador mantém acesso administrativo conforme o padrão atual. Perfis educacionais específicos serão habilitados progressivamente sem conceder acesso a dados clínicos ou sociais restritos.

## 6. UX da Fase 1

Será criado um único módulo com menu `Educacional` e uma tela de fundação com abas agrupadas:

- Visão geral.
- Estrutura acadêmica: anos letivos, etapas, séries, disciplinas e turmas.
- Alunos e matrículas.
- Alunos por turma (enturmação).

Listagens seguirão o padrão da listagem de beneficiários: filtros no topo, limpar filtros, tabela/grade com rolagem, seleção visual, carregamento e vazio. Formulários usarão os componentes nativos do G3N. O card de resumo não utilizará mocks: os indicadores serão calculados a partir do PostgreSQL.

## 7. Fases posteriores

- Fase 2: diário de classe, chamada, frequência, conteúdo, planos e horários.
- Fase 3: avaliações, notas, médias, recuperação, boletins, conselho e resultado final.
- Fase 4: creche, rotina infantil, agenda diária, desenvolvimento e parecer descritivo.
- Fase 5: secretaria, documentos, declarações, histórico e transferências.
- Fase 6: indicadores avançados, alertas, risco de evasão e busca ativa.
- Fase 7: portais, comunicação, autorizações e notificações.

Cada fase terá migration própria, permissões próprias quando necessário, testes de isolamento multi-tenant e atualização do manual.

## 8. Riscos e decisões técnicas

- Não duplicar beneficiários exige busca e vínculo explícitos antes da matrícula.
- Ano letivo e matrícula precisam preservar histórico; nenhum fluxo sobrescreverá matrícula anterior.
- Unidade e sala são entidades existentes com histórico estrutural legado; a integração será feita por ID e validada no backend.
- Regras de aprovação, notas e frequência ficarão fora da Fase 1 para evitar regras escolares hardcoded prematuramente.
- O catálogo BNCC será preparado em fase posterior e não terá dados inventados nesta entrega.
- Relatórios e documentos usarão os templates existentes quando a secretaria escolar for implementada.

## 9. Testes da Fase 1

- Schemas de ano letivo, etapa, série, disciplina, turma e matrícula.
- Vínculo de beneficiário existente sem duplicação.
- Matrículas de anos diferentes preservadas.
- Enturmação com histórico.
- Isolamento entre dois tenants em cada endpoint e listagem.
- Autorização por permissão.
- Persistência após recarregar a aplicação.
- Frontend typecheck, build e testes existentes.

## 10. Critério de conclusão da Fase 1

A Fase 1 somente será considerada concluída quando a instituição conseguir cadastrar a estrutura, localizar um beneficiário real, vinculá-lo como aluno, criar matrícula, enturmá-lo, consultar os indicadores e reabrir os dados após recarregar, sem vazamento entre tenants.
