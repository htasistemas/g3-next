# Auditoria multi-tenant G3N

Data: 2026-04-27  
Escopo desta rodada: autenticação, JWT, middleware, instituições, usuários, beneficiários, famílias/vínculo familiar, Central de Atendimentos, Inscrições/cursos/oficinas e endurecimento inicial de Relatórios e Dashboard.

## Objetivo

Validar se o G3N está corretamente segregado por instituição/CNPJ usando `tenant_id`, impedindo que dados de um tenant sejam listados, abertos, alterados, excluídos, exportados, impressos ou relacionados a outro tenant.

## Status da rodada

- `Concluído`: autenticação e JWT auditados.
- `Concluído`: instituições auditadas.
- `Concluído`: beneficiários auditados e corrigidos.
- `Concluído`: usuários auditados e corrigidos.
- `Concluído`: famílias/vínculo familiar auditados e corrigidos.
- `Concluído`: Central de Atendimentos auditada e corrigida.
- `Concluído`: Inscrições/cursos/oficinas auditados e corrigidos.
- `Concluído`: perímetro inicial de Relatórios endurecido por tenant e autenticação.
- `Concluído`: Dashboard de vulnerabilidade e busca de vínculos do georreferenciamento corrigidos por tenant.
- `Pendente`: auditoria dos demais módulos operacionais.

## Checklist da auditoria

### 1. Identificação do tenant

- [x] O login identifica instituição por `cnpj`, `slug` ou `codigoInstituicao`.
- [x] O token JWT contém `tenant_id`, `instituicao_id`, `cnpj`, `slug`, `perfil`, `permissoes` e `plano`.
- [x] O middleware de autenticação injeta `tenant_id` no contexto `request.authUser`.
- [x] O backend não depende de `tenantId` vindo livremente do frontend no fluxo autenticado auditado.
- [ ] O middleware bloqueia explicitamente qualquer usuário operacional autenticado sem `tenant_id`.

### 2. Banco de dados e modelagem

- [x] `instituicoes` possui `tenant_id`.
- [x] `usuarios` possui `tenant_id` e `instituicao_id`.
- [x] `cadastro_beneficiario` possui `tenant_id`.
- [x] `vinculo_familiar` possui `tenant_id`.
- [x] `vinculo_familiar_membro` possui `tenant_id`.
- [x] Tabelas relacionadas do beneficiário possuem `tenant_id`:
  `contato_beneficiario`, `documentos`, `situacao_social`, `escolaridade_beneficiario`,
  `saude_beneficiario`, `beneficios_beneficiario`, `observacoes_beneficiario`.
- [x] `familia_historico` passou a aceitar `tenant_id` para novas gravações da auditoria familiar.
- [ ] Confirmar constraints compostas e referências cruzadas por tenant em módulos legados.
- [ ] Confirmar segregação física/lógica completa de anexos e arquivos por tenant em todos os módulos.

### 3. Backend

- [x] Autenticação resolve tenant no backend.
- [x] Beneficiários filtram por `tenant_id` em listagem, detalhe, criação, atualização, exclusão, próximo código e sugestão de endereço.
- [x] Usuários filtram por `tenant_id` em listagem, detalhe, criação, atualização, status, reset de senha e exclusão.
- [x] Famílias filtram por `tenant_id` em listagem, detalhe, criação, atualização, membros, responsável, endereço, histórico, validação de benefício, transferência e desmembramento.
- [x] Central de Atendimentos filtra por `tenant_id` em busca, visão geral, atendimentos, benefícios, encaminhamentos, histórico, custos, grupo familiar, alertas e relatórios.
- [x] Inscrições/cursos/oficinas filtram por `tenant_id` em catálogo, detalhe, criação, edição, exclusão, fila de espera, presença e catálogos auxiliares.
- [x] Rotas principais de relatórios agora exigem autenticação e permissão de leitura.
- [x] Relatórios de unidades, beneficiários e matrículas usam contexto institucional e dados do tenant autenticado.
- [x] Dashboard de vulnerabilidade e busca de vínculos do georreferenciamento passaram a respeitar `tenant_id`.
- [x] Validação de duplicidade de usuários foi limitada ao tenant autenticado.
- [x] Validação de vínculo familiar ativo agora considera somente o tenant autenticado.
- [x] Beneficiário-base da Central agora é validado por `id + tenant_id` antes de qualquer consulta ou gravação.
- [x] Leitura de auditoria de usuários respeita `tenant_id` quando o campo existir no evento.

### 4. Frontend

- [x] Hooks de beneficiários foram segregados por `tenant_id` nas chaves de cache.
- [x] Hooks de usuários foram segregados por `tenant_id` nas chaves de cache.
- [x] Hooks e busca interna da tela de famílias foram segregados por `tenant_id` nas chaves de cache.
- [x] Hooks da Central de Atendimentos foram segregados por `tenant_id` nas chaves de cache.
- [x] Hooks e catálogos da tela de Inscrições foram segregados por `tenant_id` nas chaves de cache.
- [x] O tema de personalização já está segregado por tenant em rodada anterior.
- [x] O frontend do dashboard já separa cache por tenant; esta rodada fechou o backend dos pontos ainda vulneráveis do mapa de vulnerabilidade e da busca de vínculos.

### 5. Testes de segurança

- [ ] Criar testes automatizados de listagem por tenant em usuários.
- [ ] Criar testes automatizados de busca por ID com bloqueio cruzado em usuários.
- [ ] Criar testes automatizados de update/delete cruzado em usuários.
- [ ] Expandir testes de beneficiários para cenários multi-tenant explícitos.

## Evidências auditadas

### Autenticação e contexto de tenant

Arquivos auditados:

- [auth.service.ts](/C:/g3-Next/backend/src/modules/auth/services/auth.service.ts:1)
- [auth.repository.ts](/C:/g3-Next/backend/src/modules/auth/repositories/auth.repository.ts:1)
- [token.service.ts](/C:/g3-Next/backend/src/modules/auth/services/token.service.ts:1)
- [auth.middleware.ts](/C:/g3-Next/backend/src/modules/auth/middlewares/auth.middleware.ts:1)

Resultado:

- O login busca usuário já combinando credencial com tenant/instituição.
- O JWT inclui `tenant_id`, `instituicao_id` e `cnpj`.
- O middleware carrega esse contexto para a requisição autenticada.

Risco remanescente:

- O middleware ainda aceita token válido mesmo se `tenant_id` vier ausente. Na prática, vários services já bloqueiam isso, mas o ideal é endurecer a regra para usuário não-superadmin sem tenant.

### Instituições

Arquivo auditado:

- [instituicoes.repository.ts](/C:/g3-Next/backend/src/modules/instituicoes/repositories/instituicoes.repository.ts:1)

Resultado:

- O módulo é de gestão master e trabalha sobre `instituicoes`.
- A criação do administrador inicial persiste `tenant_id` e `instituicao_id` no usuário.
- Não é módulo operacional de tenant comum, então o principal controle aqui é permissão de superadmin.

Observação:

- Como tela master, o comportamento global é esperado, desde que protegido por `superadmin`.

### Beneficiários

Arquivos auditados:

- [beneficiario.controller.ts](/C:/g3-Next/backend/src/modules/beneficiarios/controllers/beneficiario.controller.ts:1)
- [beneficiario.service.ts](/C:/g3-Next/backend/src/modules/beneficiarios/services/beneficiario.service.ts:1)
- [beneficiario.repository.ts](/C:/g3-Next/backend/src/modules/beneficiarios/repositories/beneficiario.repository.ts:1)
- [use-beneficiarios.ts](/C:/g3-Next/frontend/src/features/beneficiarios/use-beneficiarios.ts:1)

Problema encontrado:

- O módulo listava e buscava beneficiários sem escopo de `tenant_id`.
- O frontend também cacheava listagem, detalhe e próximo código sem separar tenant.

Correções aplicadas nesta rodada:

- O controller passou a repassar `tenant_id` da sessão para service.
- O service passou a exigir tenant em listagem, detalhe, criação, atualização, exclusão, próximo código e sugestão de endereço.
- O repository passou a:
  - filtrar listagem por `tenant_id`;
  - validar `id + tenant_id` no detalhe;
  - validar duplicidade apenas dentro do tenant;
  - gerar próximo código por tenant;
  - filtrar sugestão de endereço por tenant via beneficiários vinculados;
  - propagar `tenant_id` para tabelas relacionadas após criar/atualizar.
- O frontend segregou cache de beneficiários por `tenant_id`.

Status:

- Corrigido no código da workspace atual.

### Usuários

Arquivos auditados:

- [usuario.controller.ts](/C:/g3-Next/backend/src/modules/usuarios/controllers/usuario.controller.ts:1)
- [usuario.service.ts](/C:/g3-Next/backend/src/modules/usuarios/services/usuario.service.ts:1)
- [usuario.repository.ts](/C:/g3-Next/backend/src/modules/usuarios/repositories/usuario.repository.ts:1)
- [use-usuarios.ts](/C:/g3-Next/frontend/src/features/usuarios/use-usuarios.ts:1)

Problemas encontrados:

1. `Alta`: listagem de usuários sem filtro por tenant.
2. `Alta`: busca por ID sem validar tenant.
3. `Alta`: update, status, reset de senha e delete operavam só por `id`.
4. `Alta`: validação de duplicidade de usuário ainda era global.
5. `Média`: cache do frontend não separava tenant.

Correções aplicadas nesta rodada:

- O controller passou a repassar `tenant_id` e `instituicao_id` da sessão para o service.
- O service passou a exigir tenant válido antes de operar o módulo.
- O repository passou a:
  - filtrar listagem por `tenant_id`;
  - validar `id + tenant_id` no detalhe;
  - limitar duplicidade ao tenant autenticado;
  - atualizar status, senha, dados cadastrais e exclusão lógica com escopo por tenant;
  - persistir `tenant_id` e `instituicao_id` no complemento do cadastro inicial do usuário;
  - restringir leitura de auditoria ao tenant quando o evento já tiver `tenant_id`.
- O frontend segregou cache de usuários e permissões por `tenant_id`.

Status:

- Corrigido no código da workspace atual.

### Famílias / vínculo familiar

Arquivos auditados:

- [familia.controller.ts](/C:/g3-Next/backend/src/modules/familias/controllers/familia.controller.ts:1)
- [familia.service.ts](/C:/g3-Next/backend/src/modules/familias/services/familia.service.ts:1)
- [familia.repository.ts](/C:/g3-Next/backend/src/modules/familias/repositories/familia.repository.ts:1)
- [use-familias.ts](/C:/g3-Next/frontend/src/features/familias/use-familias.ts:1)
- [cadastro-vinculo-familiar-page.tsx](/C:/g3-Next/frontend/src/pages/familias/cadastro-vinculo-familiar-page.tsx:1)

Problemas encontrados:

1. `Alta`: controller e service não carregavam `tenant_id` da sessão.
2. `Alta`: listagem e detalhe de famílias eram executados sem filtro por tenant.
3. `Alta`: criação, edição, membros, responsável, endereço, transferência e desmembramento operavam só por `id`.
4. `Alta`: validação de membro já vinculado consultava famílias ativas sem limitar tenant.
5. `Média`: histórico familiar e busca interna da tela não estavam segregados por tenant.

Correções aplicadas nesta rodada:

- O controller passou a repassar `tenant_id` e `instituicao_id` da sessão para o service.
- O service passou a exigir tenant válido em todas as operações do módulo.
- O repository passou a:
  - filtrar listagem por `tenant_id`;
  - validar `id + tenant_id` no detalhe e nas operações por família;
  - validar beneficiários informados apenas dentro do tenant autenticado;
  - limitar a checagem de família ativa do membro ao tenant autenticado;
  - persistir `tenant_id` em `vinculo_familiar` e `vinculo_familiar_membro` nas gravações do módulo;
  - restringir histórico familiar e validação de benefício ao tenant logado.
- O frontend segregou cache de famílias, histórico, alertas, validação de benefício e busca de beneficiários por `tenant_id`.

Status:

- Corrigido no código da workspace atual.

### Central de Atendimentos

Arquivos auditados:

- [central-atendimentos.controller.ts](/C:/g3-Next/backend/src/modules/central-atendimentos/controllers/central-atendimentos.controller.ts:1)
- [central-atendimentos.service.ts](/C:/g3-Next/backend/src/modules/central-atendimentos/services/central-atendimentos.service.ts:1)
- [central-atendimentos.repository.ts](/C:/g3-Next/backend/src/modules/central-atendimentos/repositories/central-atendimentos.repository.ts:1)
- [use-central-atendimentos.ts](/C:/g3-Next/frontend/src/features/central-atendimentos/use-central-atendimentos.ts:1)
- [central-atendimentos-page.tsx](/C:/g3-Next/frontend/src/pages/atendimentos/central-atendimentos-page.tsx:1)

Problemas encontrados:

1. `Alta`: controller e service não repassavam `tenant_id` da sessão.
2. `Alta`: busca de beneficiários e visão geral operavam sem validar se o beneficiário pertencia ao tenant logado.
3. `Alta`: atendimentos, benefícios e encaminhamentos eram lidos e gravados só por `beneficiario_id` e `id`.
4. `Alta`: grupo familiar, doações, inscrições e relatórios derivados podiam misturar dados de outros tenants.
5. `Média`: cache do frontend não separava tenant na busca e na visão geral.

Correções aplicadas nesta rodada:

- O controller passou a repassar `tenant_id` e `instituicao_id` da sessão para o service.
- O service passou a exigir tenant válido antes de qualquer operação da Central.
- O repository passou a:
  - validar o beneficiário-base pelo par `id + tenant_id`;
  - filtrar busca de beneficiários por tenant;
  - filtrar e gravar `central_atendimento`, `central_beneficio`, `central_encaminhamento` e `central_auditoria` por `tenant_id`;
  - restringir grupo familiar, doações, inscrições e visão geral ao tenant autenticado;
  - exigir `tenant_id` também nas operações de update e delete.
- O frontend segregou cache da busca e da visão geral da Central por `tenant_id`.

Status:

- Corrigido no código da workspace atual.

### Inscrições / cursos / oficinas

Arquivos auditados:

- [matricula.controller.ts](/C:/g3-Next/backend/src/modules/matriculas/controllers/matricula.controller.ts:1)
- [matricula.service.ts](/C:/g3-Next/backend/src/modules/matriculas/services/matricula.service.ts:1)
- [matricula.repository.ts](/C:/g3-Next/backend/src/modules/matriculas/repositories/matricula.repository.ts:1)
- [use-matriculas.ts](/C:/g3-Next/frontend/src/features/matriculas/use-matriculas.ts:1)
- [cadastro-matriculas-page.tsx](/C:/g3-Next/frontend/src/pages/matriculas/cadastro-matriculas-page.tsx:1)

Problemas encontrados:

1. `Alta`: detalhe, criação, edição e exclusão de cursos/matrículas ainda operavam sem validar `tenant_id`.
2. `Alta`: catálogos de beneficiários, profissionais e salas podiam listar registros de outras instituições.
3. `Alta`: presença, datas de aula e lista de presença buscavam e gravavam só por `curso_id` e `presencaDataId`.
4. `Média`: cache do frontend não separava tenant na listagem principal, no detalhe e nos catálogos auxiliares.

Correções aplicadas nesta rodada:

- O controller passou a repassar `tenant_id` da sessão em todas as rotas do módulo.
- O service passou a exigir tenant válido antes de qualquer operação de inscrições, catálogo e presença.
- O repository passou a:
  - validar curso pelo par `id + tenant_id`;
  - filtrar `cursos_atendimentos`, `cursos_atendimentos_matriculas`, `cursos_atendimentos_fila_espera`, `cursos_atendimentos_presencas` e `cursos_atendimentos_presenca_datas` por tenant;
  - persistir `tenant_id` em cursos, matrículas, fila de espera e presença;
  - restringir os catálogos de beneficiários, profissionais e salas ao tenant autenticado.
- O frontend segregou cache da listagem, do detalhe e dos catálogos auxiliares da tela de inscrições por `tenant_id`.

Status:

- Corrigido no código da workspace atual.

## Tabelas auditadas

### Auditadas e com vínculo tenant confirmado

- `instituicoes`
- `usuarios`
- `vinculo_familiar`
- `vinculo_familiar_membro`
- `central_atendimento`
- `central_beneficio`
- `central_encaminhamento`
- `central_auditoria`
- `cursos_atendimentos`
- `cursos_atendimentos_matriculas`
- `cursos_atendimentos_fila_espera`
- `cursos_atendimentos_presencas`
- `cursos_atendimentos_presenca_datas`
- `cursos_atendimentos_presenca_anexos`
- `cadastro_beneficiario`
- `contato_beneficiario`
- `documentos`
- `situacao_social`
- `escolaridade_beneficiario`
- `saude_beneficiario`
- `beneficios_beneficiario`
- `observacoes_beneficiario`

### Auditadas e corrigidas no código nesta rodada

- `usuarios`
- `vinculo_familiar`
- `vinculo_familiar_membro`
- `familia_historico`
- `central_atendimento`
- `central_beneficio`
- `central_encaminhamento`
- `central_auditoria`
- `cursos_atendimentos`
- `cursos_atendimentos_matriculas`
- `cursos_atendimentos_fila_espera`
- `cursos_atendimentos_presencas`
- `cursos_atendimentos_presenca_datas`
- `cursos_atendimentos_presenca_anexos`
- `cadastro_beneficiario`
- `contato_beneficiario`
- `documentos`
- `situacao_social`
- `escolaridade_beneficiario`
- `saude_beneficiario`
- `beneficios_beneficiario`
- `observacoes_beneficiario`

## Telas auditadas

- Login multiempresa
- Instituições SaaS
- Cadastro de beneficiários
- Gestão de usuários
- Vínculo familiar
- Central de Atendimentos
- Inscrições / cursos / oficinas
- Relatórios institucionais principais
- Dashboard de vulnerabilidade e georreferenciamento

## Endpoints auditados

### Autenticação

- login
- login Google
- recuperação de senha
- perfil autenticado
- descoberta de tenant

### Beneficiários

- `GET /api/beneficiarios`
- `GET /api/beneficiarios/:id`
- `POST /api/beneficiarios`
- `PUT /api/beneficiarios/:id`
- `DELETE /api/beneficiarios/:id`
- `GET /api/beneficiarios/proximo-codigo`
- `GET /api/beneficiarios/sugestao-endereco`

### Usuários

- `GET /api/usuarios`
- `GET /api/usuarios/:id`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `PATCH /api/usuarios/:id/status`
- `POST /api/usuarios/:id/reset-senha`
- `DELETE /api/usuarios/:id`

### Famílias

- `GET /api/familias`
- `GET /api/familias/:id`
- `POST /api/familias`
- `PUT /api/familias/:id`
- `DELETE /api/familias/:id`
- `POST /api/familias/:id/membros`
- `PUT /api/familias/:id/membros/:membroId`
- `DELETE /api/familias/:id/membros/:membroId`
- `GET /api/familias/:id/historico`
- `GET /api/familias/:id/alertas`
- `PUT /api/familias/:id/responsavel`
- `PUT /api/familias/:id/endereco`
- `GET /api/familias/:id/beneficios/validacao`
- `POST /api/familias/:id/membros/transferir`
- `POST /api/familias/:id/desmembrar`

### Central de Atendimentos

- `GET /api/central-atendimentos/beneficiarios/busca`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/atendimentos`
- `POST /api/central-atendimentos/beneficiarios/:beneficiarioId/atendimentos`
- `PUT /api/central-atendimentos/beneficiarios/:beneficiarioId/atendimentos/:id`
- `DELETE /api/central-atendimentos/beneficiarios/:beneficiarioId/atendimentos/:id`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/beneficios`
- `POST /api/central-atendimentos/beneficiarios/:beneficiarioId/beneficios`
- `PUT /api/central-atendimentos/beneficiarios/:beneficiarioId/beneficios/:id`
- `DELETE /api/central-atendimentos/beneficiarios/:beneficiarioId/beneficios/:id`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/encaminhamentos`
- `POST /api/central-atendimentos/beneficiarios/:beneficiarioId/encaminhamentos`
- `PUT /api/central-atendimentos/beneficiarios/:beneficiarioId/encaminhamentos/:id`
- `DELETE /api/central-atendimentos/beneficiarios/:beneficiarioId/encaminhamentos/:id`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/historico`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/custos`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/grupo-familiar`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/alertas`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/relatorios/:tipo`
- `GET /api/central-atendimentos/beneficiarios/:beneficiarioId/relatorios/:tipo/pdf`

### Inscrições / cursos / oficinas

- `GET /api/matriculas`
- `GET /api/matriculas/resumo`
- `GET /api/matriculas/:id`
- `POST /api/matriculas`
- `PUT /api/matriculas/:id`
- `DELETE /api/matriculas/:id`
- `GET /api/matriculas/catalogo/beneficiarios`
- `GET /api/matriculas/catalogo/profissionais`
- `GET /api/matriculas/catalogo/salas`
- `GET /api/matriculas/:id/presencas/datas`
- `POST /api/matriculas/:id/presencas/datas`
- `PUT /api/matriculas/:id/presencas/datas/:presencaDataId`
- `PATCH /api/matriculas/:id/presencas/datas/:presencaDataId/cancelar`
- `DELETE /api/matriculas/:id/presencas/datas/:presencaDataId`
- `GET /api/matriculas/:id/presencas/datas/:presencaDataId/itens`
- `POST /api/matriculas/:id/presencas/datas/:presencaDataId/itens`

### Relatórios e Dashboard

- `POST /api/reports/authorization-term`
- `POST /api/reports/unidades-assistenciais/relacao`
- `POST /api/reports/beneficiarios/relacao`
- `POST /api/reports/beneficiarios/ficha`
- `POST /api/reports/matriculas/relacao`
- `POST /api/reports/matriculas/lista-presenca`
- `POST /api/reports/matriculas/comprovante`
- `POST /api/reports/matriculas/pre-matricula-lista-espera`
- `GET /api/dashboard/vulnerabilidade`
- `POST /api/dashboard/vulnerabilidade/geocodificar`
- `GET /api/dashboard/georreferenciamento/opcoes`
- `GET /api/dashboard/georreferenciamento/vinculos`

## Correções feitas nesta rodada

- Isolamento multi-tenant do módulo de beneficiários no backend.
- Segregação do cache de beneficiários no frontend.
- Isolamento multi-tenant do módulo de usuários no backend.
- Segregação do cache de usuários no frontend.
- Isolamento multi-tenant do módulo de famílias/vínculo familiar no backend.
- Segregação do cache da tela de famílias no frontend.
- Isolamento multi-tenant do módulo Central de Atendimentos no backend.
- Segregação do cache da Central de Atendimentos no frontend.
- Isolamento multi-tenant do módulo de Inscrições/cursos/oficinas no backend.
- Segregação do cache da tela de Inscrições e dos catálogos auxiliares no frontend.
- Endurecimento das rotas de relatórios com autenticação obrigatória e contexto institucional por tenant.
- Isolamento por tenant dos relatórios de unidades, beneficiários e matrículas.
- Isolamento por tenant do dashboard de vulnerabilidade e da busca de vínculos do georreferenciamento.
- Registro desta auditoria inicial no repositório.

## Pendências imediatas

1. Endurecer o middleware para bloquear usuário operacional sem `tenant_id`.
2. Criar testes automatizados multi-tenant para usuários e beneficiários.
3. Auditar em seguida:
   - benefícios e doações de forma transversal;
   - almoxarifado;
   - doações;
   - patrimônio;
   - financeiro;
   - relatórios/exportações restantes, especialmente profissionais, voluntários, doações e Power BI.

## Riscos técnicos atuais

- `Média`: alguns serviços internos ainda aceitam fallback implícito de tenant em leituras; isso precisa ser mapeado módulo a módulo.
- `Média`: ainda faltam testes automatizados de acesso cruzado em boa parte dos módulos.

## Próxima etapa recomendada

Prioridade 1:

- Endurecer o middleware para bloquear qualquer usuário operacional sem `tenant_id`.

Prioridade 2:

- Fechar a auditoria restante de `Relatórios` e `Dashboard`, com foco em Power BI, relatórios de profissionais, voluntários, doações e demais exportações.

Prioridade 3:

- Auditar `Benefícios/doações`, `Almoxarifado`, `Patrimônio`, `Financeiro` e anexos por tenant.
