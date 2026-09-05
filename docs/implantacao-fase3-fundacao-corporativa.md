# Fase 3 — Fundação corporativa de pessoas e vínculos

## Objetivo

Criar uma base corporativa para relacionar uma mesma pessoa a diferentes
papéis do G3N, sem duplicar o cadastro de pessoas e sem realizar mesclagem
automática de registros ambíguos.

## Migration

`20260905_fundacao_pessoa_vinculos_governanca`

Integração complementar: `20260905_vinculos_profissionais_voluntarios_doadores`.

Foi aplicada no schema local oficial `public` do banco `g3n`.

## Alterações

- adiciona status e marcação de anonimização em `pessoa`;
- cria `pessoa_vinculo`, com escopo por `tenant_id`;
- conecta `rh_colaborador.pessoa_id` à pessoa correspondente quando o CPF é
  único dentro do tenant;
- adiciona integridade composta pessoa/tenant para novos relacionamentos;
- cria vínculos derivados dos beneficiários existentes;
- adiciona referências de pessoa aos cadastros de profissionais, voluntários e
  doadores;
- vincula automaticamente apenas CPF único no mesmo tenant;
- preserva registros que exigem análise manual de duplicidade.

## Decisões de segurança e dados

- CPF não é exibido em relatórios de diagnóstico;
- não são feitas mesclagens automáticas;
- os vínculos possuem `tenant_id` e a associação usa chave composta;
- constraints legadas foram adicionadas como `NOT VALID` para não bloquear a
  instalação por inconsistências históricas, mas impedem novas associações
  inválidas;
- a exclusão da pessoa vinculada é restrita para preservar histórico.

## Validação

- `npx prisma migrate deploy`: aprovado;
- `npx prisma migrate status`: banco atualizado;
- `npm run typecheck`: aprovado;
- `npm run test:cipa`: 6 testes aprovados;
- dados verificados: 3.445 vínculos de beneficiários, 3 profissionais e 10
  voluntários vinculados automaticamente; nenhum doador teve correspondência
  segura.
- revisão operacional autorizada concluída: 84 grupos de duplicidade foram
  marcados como `DIFERENTES`, mantendo todos os registros separados; não há
  grupos pendentes de decisão.

## Próxima etapa

Implementar a camada de serviços e APIs para consulta, criação, alteração,
desativação e análise de vínculos, sempre validando autorização e tenant no
backend.

## Continuação autorizada — indicadores e resultados de projetos

Foi aplicada a migration `20260905_projetos_indicadores_resultados` no schema
oficial `public`, sem substituir o módulo existente de projetos.

Esta etapa criou uma base persistente e multi-tenant para indicadores de
processo, produto, resultado e impacto, com linha de base, meta, valor atual,
unidade de medida, periodicidade e fonte do dado. Também criou medições por
competência, com unicidade por indicador e competência, e uma estrutura de
metadados para futuras evidências em storage externo.

Foram adicionadas APIs autenticadas para listar e cadastrar indicadores,
listar medições e registrar uma medição. O registro ocorre em transação,
atualiza o valor atual do indicador e rejeita duplicidade de competência.

Validação da continuação:

- migration aplicada com sucesso; 53 migrations reconhecidas;
- tabelas verificadas no schema `public`;
- `npm run typecheck` do backend: aprovado;
- `npm run test:cipa`: 6 testes aprovados;
- sem dados fictícios e sem uso de storage local.

Próxima etapa: integrar a aba de indicadores na tela existente de projetos,
com estados de carregamento, vazio, erro e sucesso, e depois revisar a
integração de evidências conforme o padrão oficial de storage.

Integração concluída nesta sequência: a tela existente de Projetos recebeu a
aba “Indicadores”, com seleção do projeto, cadastro de indicador e consulta
dos indicadores persistidos. O frontend foi validado com `npm test`: typecheck
React aprovado e 35 testes aprovados.

## Evidências e storage

Foi criado o escopo `projeto_indicador_evidencia` no storage oficial, com
arquivos em `tenants/<tenant_id>/projetos/indicadores/evidencias`. O upload
aceita apenas os tipos documentais permitidos pela política do G3N, respeita
limite de 25 MB e grava no PostgreSQL somente referência lógica e metadados.
O endpoint valida o indicador, o projeto e o tenant antes de persistir, e faz
limpeza do arquivo no storage se o registro de metadados falhar.

Os serviços e hooks do frontend já estão preparados para listar e enviar as
evidências. A exposição visual do upload e a associação de evidência a uma
medição ficarão na próxima etapa, após a revisão de usabilidade do detalhe do
projeto.

Exposição visual concluída nesta sequência: a aba “Indicadores” passou a
permitir selecionar um indicador, enviar arquivo e visualizar as evidências
armazenadas pelo serviço autenticado de arquivos. A associação direta de uma
evidência a uma medição permanece como evolução seguinte para evitar vínculo
ambíguo entre versões de documentos e competências.

Validação adicional: `npm run test:text` do backend aprovou 91 testes; o
typecheck do backend e o `npm test` do frontend continuam aprovados.

## Associação entre medição e evidência

Foi aplicada a migration `20260905_projetos_medicoes_evidencias`, que adiciona
integridade referencial entre a medição e a evidência do mesmo tenant. A
constraint foi validada no PostgreSQL.

A tela passou a permitir informar competência, valor realizado e evidência
correspondente no mesmo fluxo. O backend confirma novamente que a evidência
pertence ao indicador antes de registrar o resultado e continua impedindo duas
medições para a mesma competência.

Validação desta etapa:

- 54 migrations aplicadas no schema `public`;
- constraint de evidência validada;
- backend typecheck aprovado;
- backend textual: 91/91 testes aprovados;
- frontend: 35/35 testes aprovados.

## Dashboard consolidado de impacto

Foi acrescentado o endpoint autenticado de dashboard de indicadores, com
filtro opcional por projeto. Ele consolida indicadores ativos, soma de metas,
soma de realizado, percentual médio de execução, distribuição por tipo e
evolução mensal das medições. Todas as agregações filtram o `tenant_id`
autenticado e ignoram projetos inativos.

A aba “Indicadores” passou a exibir os cards de acompanhamento: indicadores,
ativos, meta total, realizado e execução média. Nenhum ranking ou dado de
outro tenant é carregado pelo frontend.

Validação: backend typecheck e 91/91 testes textuais aprovados; frontend
typecheck e 35/35 testes aprovados.

## Conclusão do bloco de indicadores e impacto

O dashboard passou a aceitar filtros por período de medição e unidade
assistencial, além do filtro por projeto. Os filtros são validados no backend
e aplicados nas agregações de metas, realizado, tipos e evolução mensal.

Foram incluídos testes específicos para meta não negativa, unidade obrigatória,
competência ISO e evidência opcional. Resultado: 2/2 testes específicos
aprovados, backend typecheck aprovado, frontend typecheck aprovado e 35/35
testes do frontend aprovados.

Classificação do bloco: **APROVADO SEM RESSALVAS**.

Esta aprovação se aplica exclusivamente ao bloco de indicadores, medições,
evidências e dashboard de impacto. Não representa conclusão integral da
plataforma de gestão do terceiro setor nem autoriza publicação em produção.
