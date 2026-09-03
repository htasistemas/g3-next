# Diagnóstico da arquitetura — Gestão de Eleições da CIPA (Fase 1)

**Data:** 02/09/2026  
**Responsável:** Maestro / Orquestrador  
**Classificação:** criação de módulo; regra de negócio; banco de dados; segurança; permissão; integração; arquivos/storage; relatórios; auditoria; testes; documentação.  
**Nível de autonomia:** amarelo, com bloqueio vermelho para a definição da fonte oficial de empregados/eleitores.

## 1. Objetivo e resultado esperado

Criar um módulo de processo eleitoral da CIPA, multi-tenant e persistente em PostgreSQL, com administração do ciclo eleitoral, portal de candidatura, portal/urna mobile, sigilo do voto, prevenção de voto duplicado, apuração, documentos, relatórios e trilha de auditoria.

Esta fase não cria telas, migrations, endpoints ou dados de homologação. O objetivo foi auditar a arquitetura existente e identificar os pontos de reuso, riscos e decisões que precisam ser fechadas antes da implementação.

## 2. Evidências da arquitetura atual

### Backend e persistência

- Backend Node.js/TypeScript com Express e Prisma.
- PostgreSQL é o datasource oficial do Prisma em `backend/prisma/schema.prisma`.
- O projeto usa migrations SQL em `backend/prisma/migrations`.
- Há módulos organizados por domínio em `backend/src/modules`, com rotas, controllers, services e repositories.
- O registro de rotas central está em `backend/src/routes/index.ts`; já existe o namespace `/api/rh/contratacao`.
- O schema Prisma principal possui `CadastroProfissional`, `UnidadeAssistencial`, `Usuario`, `Permissao` e `UsuarioPermissao`, mas não possui um modelo canônico de empregado/colaborador CLT por estabelecimento.

### RH existente

- `backend/src/modules/rh-contratacao` implementa contratação, documentos, arquivos e auditoria do processo seletivo/admissional.
- A tabela `rh_candidato` representa candidato a contratação; não deve ser reutilizada como cadastro eleitoral de empregado.
- `CadastroProfissional` possui `nomeCompleto`, `cpf`, `dataNascimento`, `categoria`, `status`, `email`, `unidade` e foto, e é consultado por SQL com `tenant_id` em vários módulos.
- O significado atual de `CadastroProfissional` é mais amplo/assistencial e não comprova vínculo empregatício, estabelecimento, jornada ou elegibilidade na CIPA.

### Tenant, autenticação e permissões

- O contexto autenticado expõe `tenant_id`, `instituicao_id`, CNPJ e contexto organizacional em `backend/src/modules/auth/auth.types.ts`.
- Há middleware `ensureAuthenticated`, `ensurePermissions` e `ensureSuperadmin`.
- O padrão existente deriva o tenant da sessão/token; o payload da eleição não poderá escolher livremente o tenant.
- A tabela `permissao` e a associação `usuario_permissao` são reutilizáveis, mas as permissões específicas da CIPA ainda não existem.
- Auditorias anteriores no repositório registram que o isolamento ainda possui pendências em outros módulos e que faltam testes cruzados abrangentes; o módulo CIPA deve nascer com isolamento obrigatório e testes próprios.

### Arquivos e storage

- Existe o módulo `backend/src/modules/arquivos` com provider local e MinIO, fábrica de storage, políticas de extensão/MIME/tamanho e separação por tenant.
- `storage-policy.ts` já possui escopos `colaborador_foto`, `colaborador_documento` e diretórios `tenants`, `imagens/colaboradores` e `colaboradores/documentos`.
- A solução CIPA deve adicionar políticas próprias para foto de candidato e documentos eleitorais, usando referência lógica e metadados; não deve armazenar binário/base64 como mecanismo definitivo no PostgreSQL.

### Frontend e UX

- Frontend React/TypeScript com rotas lazy em `frontend/src/routes/route-modules.ts`.
- Menu e breadcrumbs são centralizados em `frontend/src/app/app-shell.tsx`; já existe a seção `Recursos humanos` com Registro de ponto e Contratação.
- Há componentes/padrões reutilizáveis de cards, tabelas, feedback e gráficos com Recharts, incluindo `ResponsiveChart`.
- Não foi encontrada rota ou módulo CIPA existente.
- A urna deverá ser uma rota pública/interna separada do painel administrativo, com autenticação própria de votação e sem reutilizar sessão administrativa.

### Tempo real

- Foram encontrados gráficos e atualização por consultas nos módulos existentes, mas não foi encontrada implementação consolidada de WebSocket, SSE ou `EventSource` no frontend/backend auditado.
- A decisão de tempo real deve respeitar a arquitetura de infraestrutura disponível. Até existir um canal SSE/WebSocket oficial, o módulo não deve prometer atualização em tempo real real; a alternativa deve ser documentada como fallback controlado.

## 3. Verificação da NR-5 vigente

Foi consultada a página oficial de Normas Regulamentadoras vigentes e o PDF oficial `NR-05 atualizada 2023`, disponibilizado pelo Ministério do Trabalho e Emprego e verificado em 02/09/2026. A página oficial informa como última atualização normativa a Portaria MTP nº 4.219, de 20 de dezembro de 2022; o sistema registra esse marco no snapshot como `NR5-PORTARIA-MTP-4219-2022`.

Referências oficiais:

- [NR-5 — página oficial do Ministério do Trabalho e Emprego](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-5-nr-5)
- [NR-05 atualizada 2023 — PDF oficial](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-05-atualizada-2023.pdf)

Requisitos que impactam diretamente o domínio:

- A CIPA é constituída por estabelecimento; o cadastro deve permitir unidade/estabelecimento e não somente instituição/tenant.
- A eleição dos representantes dos empregados é por escrutínio secreto.
- O empregador convoca a eleição no mínimo 60 dias antes do fim do mandato vigente, quando aplicável.
- O início do processo deve ser comunicado ao sindicato da categoria preponderante, admitindo meio eletrônico com confirmação de entrega.
- A comissão eleitoral organiza e acompanha o processo; onde não houver CIPA, deve ser constituída pela organização.
- A inscrição e a eleição são individuais; a inscrição deve durar no mínimo 15 dias corridos e deve haver comprovante.
- Deve existir liberdade de inscrição para empregados do estabelecimento e divulgação da relação de inscritos.
- A eleição deve ocorrer em dia normal de trabalho, respeitando turnos e possibilitando participação da maioria.
- O processo deve garantir segurança do sistema, confidencialidade e precisão do registro dos votos.
- Com participação inferior a 50%, a apuração não ocorre e o período deve ser prorrogado; no segundo dia, o limite é um terço, e depois a validade pode ocorrer com qualquer número, conforme os subitens 5.5.4 a 5.5.4.2.
- Os mais votados ocupam titulares e suplentes; em empate, prevalece o maior tempo de serviço no estabelecimento. Esses critérios não devem ser substituídos por uma regra genérica de desempate sem configuração e evidência.
- A documentação da CIPA deve ficar disponível à inspeção do trabalho por pelo menos cinco anos.

Conclusão normativa: o módulo deve ter uma camada versionada de regras/configuração e textos de apoio, sem declarar validade jurídica garantida. A comunicação do produto deve usar a formulação: “Processo estruturado para apoiar o atendimento aos requisitos aplicáveis da NR-5.”

## 4. Arquitetura preliminar para sigilo do voto

O desenho obrigatório para a próxima fase é separar:

1. **Eleitor da eleição:** snapshot mínimo e tenant/estabelecimento, com elegibilidade e status.
2. **Participação:** eleição + eleitor + estado de votação + protocolo de participação + timestamps técnicos. Deve possuir unicidade por `(tenant_id, eleicao_id, eleitor_id)` e ser a fonte para “já votou”.
3. **Voto:** eleição + identificador técnico cego + opção/candidato ou branco/nulo + timestamp técnico + integridade/hash. Não deve possuir `eleitor_id`.
4. **Sessão/token de votação:** token de uso único, expirável e sem permitir recuperar o vínculo eleitor-opção após a confirmação.

O vínculo entre a autorização de participação e a cédula deve ser consumido de modo transacional e não persistido como uma relação consultável pelos administradores. A apuração somente acessará votos da eleição; o dashboard de participação somente acessará participações agregadas. Qualquer desenho que permita uma consulta simples “eleitor X → candidato Y” será bloqueado pela Segurança e Auditoria.

Observação: hash isolado não torna uma relação identificável automaticamente segura. A revisão de ameaça, retenção, logs, privilégios de banco e acesso de suporte deve ocorrer antes da migration.

## 5. Riscos, pendências e bloqueios

### Bloqueio alto — fonte oficial de empregados/eleitores

O repositório não contém uma entidade canônica inequívoca para empregados CLT elegíveis por estabelecimento. Não é seguro usar `rh_candidato`; também não é possível afirmar que todo `CadastroProfissional` é empregado CLT ou que o campo `unidade` é uma FK de estabelecimento.

Antes da Fase 2, deve ser confirmada uma destas alternativas:

- existe tabela/serviço oficial de empregados no banco de produção que ainda não foi versionado no repositório; ou
- o G3N precisa criar um cadastro funcional de vínculos/empregados, separado de `CadastroProfissional`, com tenant, estabelecimento, CPF normalizado, data de nascimento, matrícula, cargo, setor, turno, admissão, status e tempo de serviço; ou
- o RH fornecerá uma origem oficial externa/importação, cuja persistência e governança deverão ser definidas.

Sem essa decisão, não é possível garantir autenticação correta por CPF/data de nascimento, elegibilidade, desempate por tempo de serviço, isolamento por estabelecimento ou o teste final com 20 colaboradores reais de homologação.

### Riscos técnicos

- **Alto:** armazenamento de CPF/data de nascimento no fluxo público pode permitir enumeração; será necessário rate limit, mensagens uniformes, antifraude e minimização.
- **Alto:** sigilo pode ser quebrado por logs, auditoria, tracing, backups, permissões SQL ou endpoints de detalhe, mesmo que as tabelas principais sejam separadas.
- **Alto:** a NR-5 exige regras de participação mínima que alteram o encerramento/apuração; “encerrar” não poderá simplesmente apurar sempre.
- **Médio:** não há canal de tempo real consolidado detectado; será necessário decidir SSE/WebSocket ou fallback documentado.
- **Médio:** o padrão atual possui storage local e MinIO; a implantação deve validar provider, backup, download autorizado e retenção de cinco anos.
- **Médio:** geração de PDF/Excel/atas deve reutilizar os padrões existentes e não criar um renderer paralelo sem necessidade.

## 6. Agentes acionados e ordem proposta

1. Maestro / Orquestrador — coordenação e bloqueios.
2. Análise e Arquitetura — confirmação da fonte de empregados, rotas, reuso e compatibilidade.
3. Regras de Negócio — ciclo de estados, elegibilidade, participação mínima, empate, titulares/suplentes e documentos.
4. Segurança — ameaça, sigilo, autenticação pública, rate limit, privilégio e tenant.
5. Banco de Dados — modelagem, constraints, índices, transações, retenção e migration.
6. Backend e API — contratos, serviços, importação, apuração e canal de atualização.
7. Campos, Máscaras e Validações — CPF, datas, importação e normalização.
8. Interface e UX/UI + Regras de Telas — wizard, dashboard, portal do candidato, urna mobile e estados visuais.
9. Arquivos e Storage + Relatórios — fotos, documentos, atas, PDF, Excel e impressão.
10. Performance — concorrência, índices, agregações e cargas de 100 a 10.000 eleitores.
11. Testes + Regressão — funcionais, concorrência, replay, recuperação, tenant e segurança do voto.
12. Auditoria — revisão independente e classificação de achados.
13. Documentação e Manual — atualização do manual na mesma entrega.

## 7. Plano de fases após desbloqueio

- **Fase 2:** modelagem versionada, migration e constraints, após confirmar a origem de empregados.
- **Fase 3:** backend/API e máquina de estados.
- **Fase 4:** dashboard/wizard administrativo.
- **Fase 5:** candidaturas e comissão eleitoral.
- **Fase 6:** eleitores/importação.
- **Fase 7:** portal público, portal do candidato e urna mobile.
- **Fase 8:** sigilo, antifraude, concorrência e permissões.
- **Fase 9:** SSE/WebSocket ou alternativa aprovada.
- **Fase 10:** apuração, zerésima, resultado e critérios NR-5.
- **Fase 11:** documentos, storage e relatórios.
- **Fase 12:** auditoria, testes automatizados e carga.
- **Fase 13:** homologação ponta a ponta com eleição de teste, 20 colaboradores e 8 candidatos, sem dados fictícios permanentes.

## 8. Critérios de aprovação desta fase

- Arquitetura atual inventariada com evidências.
- Entidades reutilizáveis identificadas sem duplicar instituição, unidade ou usuário.
- Ausência de módulo CIPA existente confirmada.
- Requisitos da NR-5 vigente mapeados para o domínio.
- Separação de participação e voto definida como requisito de segurança.
- Bloqueio da fonte oficial de empregados registrado.
- Ordem de execução, testes e auditoria definidos.

**Classificação final do Maestro:** `APROVADO COM RESSALVAS` para a auditoria arquitetural; `BLOQUEADO` para iniciar a Fase 2 até a decisão sobre a fonte oficial de empregados/colaboradores.

## 9. Atualização da decisão — início da implantação

Em 02/09/2026 foi decidido iniciar a implantação com uma entidade própria `rh_colaborador`, fonte oficial do RH para vínculo empregatício, estabelecimento, matrícula, admissão e elegibilidade. O vínculo opcional com `CadastroProfissional` será usado somente quando a mesma pessoa já estiver cadastrada, sem copiar ou substituir o cadastro profissional.

A migration `backend/prisma/migrations/20260902_create_rh_colaboradores_cipa_core/migration.sql` foi criada com dez tabelas do núcleo, constraints, índices e onze permissões específicas. O caminho de compatibilidade de bancos legados em `backend/scripts/start-with-migrations.ts` também foi atualizado para aplicar essa migration quando necessário.

Validações executadas:

- `npx prisma validate --schema prisma/schema.prisma`: aprovado.
- `npm run typecheck` no backend: aprovado.
- Aplicação contra PostgreSQL: pendente, pois não havia serviço PostgreSQL ativo identificado nesta execução.

Nova classificação do Maestro: `APROVADO COM RESSALVAS` para a modelagem; a próxima etapa é implementar e testar os contratos da API, mantendo bloqueada a publicação da urna até a revisão de Segurança, concorrência e sigilo do voto.

## 10. Fase 3 iniciada — API do núcleo

Foram adicionados os endpoints autenticados e tenant-scoped em `/api/rh/cipa`:

- `GET /colaboradores`, `GET /colaboradores/:id` e `POST /colaboradores`;
- `GET /eleicoes`, `GET /eleicoes/:id` e `POST /eleicoes`.

O `tenant_id`, a instituição e o usuário responsável são obtidos da sessão autenticada. A API valida a unidade dentro do tenant, normaliza/valida CPF e cronograma, registra auditoria de criação e devolve CPF apenas mascarado ao painel.

Testes adicionados em `backend/src/modules/cipa/__tests__/cipa.schema.test.ts`: CPF, normalização, período mínimo de inscrição e padrões do cronograma. Resultado: 4 aprovados. O backend também passou novamente no typecheck.

## 11. Fase 4 iniciada — interface administrativa

Foi adicionada a rota lazy `/setor-rh/cipa` e o item `Eleição CIPA` no menu `Recursos humanos`. A tela inicial apresenta resumo, lista de eleições e formulário de identificação/cronograma, consumindo os endpoints reais de eleições e unidades. Possui estados de carregamento, erro e vazio, labels associados, botões de ação simples e layout responsivo.

Validação: `npm run build` no frontend aprovado. Permaneceram somente avisos de build já existentes sobre `env-config.js` sem `type="module"`, base de Browserslist desatualizada e chunks grandes.

## 12. Fases 7 e 8 iniciadas — portais e sigilo operacional

Foi criado o portal público `/cipa/eleicao/:identificador`, separado do painel administrativo. O eleitor informa CPF e data de nascimento; o backend consulta o colaborador/eleitor do tenant, verifica a eleição e emite token opaco expirável. A urna lista somente candidaturas aprovadas e não exibe resultados.

Na confirmação, a API valida o token, eleição, candidaturas e configuração de voto dentro de uma transação. Ela insere a participação e um ou mais registros de voto separados, marca a sessão como usada e retorna somente um protocolo de participação. A tabela `cipa_voto` não possui `eleitor_id`; a unicidade de `cipa_participacao` impede segunda participação mesmo sob concorrência. A urna mobile permite selecionar até o limite configurado e exibe todos os itens apenas na confirmação, sem revelar informação de apuração. Foi adicionada uma API de relatórios CSV compatíveis com Excel, com aptos, votantes, pendentes, candidatos, participação, apuração, resultado final e auditoria/histórico, sempre com escopo de tenant e CPF mascarado.

O portal de candidatura também está disponível por API, com envio uma única vez, protocolo e auditoria. Tokens brutos não são persistidos; somente seu SHA-256 é armazenado.

Validações executadas:

- `npm run prisma:migrate:deploy`: migration aplicada no PostgreSQL configurado via fallback legado; o runner foi corrigido para não pular `--migrations-only` quando a API está ativa e para ordenar o núcleo antes das sessões.
- `npx tsx scripts/verify-cipa-structure.ts`: confirmou as 10 tabelas CIPA e as constraints de unicidade/check em participação e voto.
- `npm run typecheck` no backend: aprovado.
- `npm run test:cipa`: 4 aprovados.
- `npm run build` no frontend: aprovado.

Ainda pendentes: comissão eleitoral completa, documentos/relatórios, testes de integração/concurrency/tenant e homologação ponta a ponta.

## 13. Fases 2 a 4 — núcleo operacional inicial

Foram aplicadas e verificadas as migrations de zerésima e apuração persistida. O backend passou a oferecer dashboard de participação, comissão eleitoral, checklist de publicação, geração de zerésima, abertura/encerramento da votação, extensão formal da votação por participação mínima, importação CSV/XLS/XLSX de eleitores, apuração transacional, consulta da apuração, publicação controlada do resultado, geração de PDFs no storage oficial com metadados da eleição, consulta da trilha de auditoria e endpoint SSE de acompanhamento agregado. O painel também passou a exibir divulgação com link público, QR Code e cartaz imprimível; a urna passou a respeitar as opções configuradas de voto branco e nulo.

O dashboard administrativo passou a consultar dados reais e atualizar a cada 30 segundos. O portal de candidatura deriva o colaborador da sessão autenticada, sem aceitar esse vínculo do navegador.

Validações adicionais: `npx tsx scripts/verify-cipa-structure.ts` confirmou 13 tabelas CIPA, incluindo `cipa_eleicao_zeresima`, `cipa_eleicao_apuracao` e `cipa_eleicao_desempate`, além do identificador público globalmente único; `npx tsx scripts/verify-cipa-security.ts` confirmou que `cipa_voto` não expõe identificador direto do eleitor e que a participação possui unicidade por eleitor; `npx tsx scripts/verify-cipa-concurrency.ts` confirmou duas transações simultâneas com uma única participação aceita; `npx tsx scripts/verify-cipa-load.ts` passou em 100, 500, 1.000 e 5.000 eleitores com contagens íntegras; `npx tsx scripts/verify-cipa-extension.ts` confirmou bloqueio abaixo do mínimo e persistência da extensão; `npm run test:cipa:e2e` confirmou o fluxo completo descartável pelo portal com 20 eleitores, 8 candidatos, zerésima, votação, apuração e publicação; `npm run test:cipa:photo` confirmou upload de imagem real, persistência da referência no banco, vínculo à candidatura e limpeza do arquivo no storage; `npm run test:cipa:tenant` confirmou cinco consultas administrativas negadas para tenant divergente; `npm run test:cipa:tie` confirmou bloqueio de empate sem registro, registro auditado e liberação da apuração; `npm run test:cipa:replay` confirmou que repetir a confirmação com o mesmo token mantém uma participação e um voto; `npm run typecheck` no backend e `npm run react:typecheck` no frontend foram aprovados; `npm run test:cipa` mantém 6 testes aprovados, incluindo sequência de cronograma e leitura de planilha; `npm run build` do frontend foi aprovado.

Não declarar implantação concluída: seguem pendentes validação visual no navegador, revisão final do manual, teste de reinício completo do processo da API e decisão operacional sobre a migration histórica falha `20260830_venda_pdv_pagamento_caixa`, que precisa ser regularizada antes de uma publicação de produção. O cadastro individual de colaboradores foi disponibilizado no painel, complementando a importação. O desempate auditado possui entidade, API, painel e teste de bloqueio/liberação, mas ainda requer revisão independente da comissão sobre a regra operacional adotada. O upload de foto de candidatura foi integrado ao storage oficial, com rota pública controlada para cards da urna e teste de integração de imagem, persistência, vínculo, limpeza, bloqueio de MIME/tamanho inválidos e download autorizado/negado. O teste de replay agora simula desconexão e reconexão do PostgreSQL antes da nova tentativa, mantendo uma participação e um voto. O runner agora interrompe a execução para falhas que não sejam o caso explicitamente reconhecido de banco legado.

## 14. Validação incremental mais recente

Após a inclusão da foto na cédula mobile, foram aprovados `npm run react:typecheck`, `npm run typecheck` e `npm run build`. A bateria integrada confirmou novamente o fluxo ponta a ponta, isolamento por tenant, empate com desempate auditado e replay após reconexão do banco. O teste de storage confirmou MIME inválido, arquivo acima de 5 MB e tenant divergente bloqueados; o download com tenant correto retornou a imagem persistida.

Foi executado teste de recuperação do processo HTTP em porta isolada (`npm run test:cipa:http-auth`): a API iniciou, respondeu `200` no portal público e `401` na rota administrativa sem sessão, foi encerrada e iniciou novamente, respondendo `200` em `/health`. Também foram formalizados os scripts npm de estrutura, segurança, concorrência e carga. Esses testes não substituem a validação visual no navegador nem a regularização da migration histórica pendente.

O contrato HTTP também valida que a rota de relatórios retorna `401` sem sessão administrativa, enquanto o portal público permanece acessível sem autenticação.

O mesmo contrato HTTP valida que a operação de cancelamento retorna `401` sem sessão; o isolamento por tenant continua comprovado por cinco consultas administrativas negadas para instituição divergente.

Foi incluído o cancelamento administrativo protegido: a API exige motivo, grava `ELEICAO_CANCELADA`, revoga sessões de portal ainda abertas e bloqueia novo cancelamento após o estado final. O fluxo foi validado por `npm run test:cipa:cancel`.

Na revisão de tenancy do portal, a leitura final da candidatura criada foi ajustada para repetir o `tenant_id` derivado da sessão autenticada, mesmo com identificador global. Typecheck, fluxo ponta a ponta e teste de isolamento entre tenants foram executados novamente e aprovados.

Foi implementado o acompanhamento agregado por unidade, setor e turno, calculado a partir da lista de eleitores e da participação registrada, sem exposição de voto individual. O primeiro E2E revelou uma referência incorreta à coluna temporal; a consulta foi corrigida para `votado_em`, e o E2E passou novamente com os três agrupamentos persistidos.

O dashboard administrativo mantém SSE autenticado por tenant em `/dashboard/ao-vivo`, com atualização de cache no frontend e polling de baixa frequência apenas como fallback. A tela passou a exibir os agrupamentos agregados com barra de progresso acessível e estados de ausência de dados.

O fluxo de criação foi convertido em wizard de sete etapas: identificação, cronograma, eleitores, candidatos, regras, segurança e publicação. A gravação ocorre somente ao concluir; o checklist de publicação continua sendo revalidado pelo backend.

Na validação consolidada mais recente foram aprovados schema (6 testes), extensão, remoção/reativação, tenant, replay, empate, foto, edição, portal público, concorrência e E2E. O teste de carga foi executado explicitamente em 100, 500, 1.000 e 5.000 registros, mantendo as contagens de participação e voto iguais ao alvo.

O teste HTTP `npm run test:cipa:http-auth` confirmou que o portal público responde sem sessão administrativa (`200`) e que a rota administrativa de eleições recusa acesso sem autenticação (`401`).

A tela de sucesso da urna oferece `Imprimir ou salvar em PDF` pela impressão nativa do navegador. O comprovante contém somente o protocolo de participação e não apresenta a opção escolhida.

O wizard foi compilado no build de produção após a integração. A validação automatizada cobre o contrato server-side e a persistência; a inspeção visual/interativa dos passos permanece pendente porque a automação de navegador retornou erro de infraestrutura (`sandboxPolicy` ausente).

Na rodada seguinte, foi confirmado que o wizard não substitui a operação real: a criação envia as configurações para a API, e as etapas de eleitores/candidatos orientam para os componentes persistidos do painel após a eleição existir. O build de produção continuou aprovado.

A central documental foi ampliada com `COMUNICADO`, `ATA_ELEICAO` e `ATA_POSSE`. Atas e documentos de resultado exigem etapa compatível do processo; todos os tipos permanecem versionados, armazenados no storage oficial, associados ao tenant/eleição, protegidos por permissão e registrados na auditoria.

O E2E passou a gerar e verificar três documentos formais após a publicação do resultado, confirmando persistência com versão e checksum (`documentosFormais: 3`) e limpeza dos arquivos temporários no storage.

Foi adicionada edição de eleição via `PATCH /api/rh/cipa/eleicoes/:id`, protegida por `CIPA_EDITAR_ELEICAO`, tenant autenticado e status `CONFIGURACAO`. A operação atualiza cronograma/configuração em transação e grava `ELEICAO_EDITADA`; `npm run test:cipa:edit` confirmou persistência, auditoria e bloqueio após abertura das inscrições.

O painel administrativo agora exibe a ação `Editar configuração` nas eleições em `CONFIGURACAO` e abre o formulário React integrado ao endpoint, com retorno ao painel e atualização da listagem após salvar. A ação permanece indisponível após a abertura das inscrições, em coerência com a regra do backend.

O cadastro de colaborador passou a oferecer a seleção opcional de profissional ativo existente. Os dados básicos disponíveis são preenchidos no formulário e o identificador é enviado como `profissionalId`; os dados trabalhistas continuam sendo confirmados no cadastro de RH. Assim, o cadastro de profissionais é reutilizado como origem, mas não é tratado como sinônimo de empregado.

A gestão da lista eleitoral agora permite incluir colaboradores individualmente, remover logicamente eleitores antes da votação e reativar o mesmo registro quando necessário. Remoção e reativação geram auditoria; a operação é recusada após a abertura da votação ou quando já existe participação registrada. O teste `npm run test:cipa:eleitor-removal` cobre remoção, reativação sem duplicidade e auditoria.

A seleção individual passou a consultar a API já filtrada por unidade e termo de busca, em vez de carregar e filtrar toda a lista no navegador. O escopo de tenant continua sendo aplicado exclusivamente no servidor.

O painel considera apenas eleitores `APTO` como ativos para seleção, mantendo os registros `REMOVIDO` no histórico. Isso permite reativar o mesmo eleitor sem criar uma segunda linha histórica ou violar a unicidade da eleição.

A apuração passou a respeitar a rodada de extensão persistida: o encerramento exige 50% na primeira rodada, 33,3334% na segunda e não aplica piso de participação a partir da terceira rodada. O teste `npm run test:cipa:extension` confirma o bloqueio inicial, as duas extensões e a liberação da apuração na rodada final.

A abertura da urna também valida `votacao_inicio` e `votacao_fim` no backend, além da existência da zerésima. Aberturas antecipadas ou posteriores ao cronograma são recusadas; `npm run test:cipa:schedule` e o teste ponta a ponta confirmam os cenários válido e inválidos.

O link público da eleição possui endpoint próprio e carrega somente identificação da eleição, período, situação e candidatos aprovados. O teste ponta a ponta valida oito candidatos publicados e confirma que o payload não expõe tenant ou informações eleitorais administrativas.

As candidaturas agora são congeladas no backend a partir de `ELEICAO_PRONTA`; alterações administrativas posteriores à publicação são recusadas. O teste ponta a ponta confirma esse bloqueio antes da geração da zerésima.

O portal público não divulga candidatos durante a preparação. O endpoint libera a relação somente após a transição para `ELEICAO_PRONTA`, e o teste ponta a ponta comprova `0` candidatos antes da publicação e `8` depois dela.

Teste de carga executado nas faixas de 100, 500, 1.000 e 5.000 eleitores, com quantidade de participações e votos igual ao alvo em todas as faixas. O teste não substitui uma medição de infraestrutura de produção, mas confirma a integridade transacional dos lotes no ambiente disponível.

O schema do cronograma também valida a sequência das datas opcionais: divulgação após inscrições e antes da votação, apuração após a votação, publicação após a apuração e posse após a publicação. Essas regras possuem cobertura no teste de schema da CIPA.

Na revisão de autorização mais recente, `npm run test:cipa:http-auth` confirmou portal público sem sessão (`200`), eleições administrativas sem sessão (`401`), relatórios sem sessão (`401`), cancelamento sem sessão (`401`) e recuperação do servidor após reinício (`/health 200`). `npm run test:cipa:tenant` manteve cinco negações de acesso cruzado entre tenants. O backend e o frontend passaram novamente nos typechecks, e o build de produção do frontend foi aprovado.

Foi corrigido o tratamento de identificador inválido na geração de relatórios: a API agora retorna erro controlado (`400`) antes da conversão para `BigInt`, evitando exceção técnica exposta. Também foram corrigidos tipos de configuração e ordem de inicialização do filtro no frontend encontrados pelo typecheck.

Foi diagnosticado e corrigido o erro `404 Not Found` da tela administrativa: o menu e o loader já apontavam para `/setor-rh/cipa`, mas a rota não estava incluída na árvore efetiva do `router.tsx`. A página foi registrada com proteção `ADMINISTRADOR`/`CIPA_VISUALIZAR`; o typecheck e o build de produção foram executados novamente com sucesso.

A tela administrativa foi concluída no padrão visual do cadastro de beneficiários por meio do `AdminPageLayout`: abas laterais numeradas, cabeçalho de ações, tabela de eleições, contexto da eleição selecionada, estados de carregamento/erro/vazio e conteúdo operacional separado em Visão geral, Eleitores, Candidatos, Votação, Apuração e resultado, Documentos, Auditoria e Gestão da CIPA. As ações de edição, publicação, zerésima, abertura, encerramento, apuração e cancelamento permanecem condicionadas ao status e às permissões do backend.
