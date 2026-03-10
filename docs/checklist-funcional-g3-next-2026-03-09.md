# Checklist funcional G3-Next - 2026-03-09

## Escopo validado

- Auditoria final do backend consumido pelo frontend React ativo.
- Smoke autenticado em instancia temporaria do backend na porta `3334`.
- Usuario utilizado no smoke: `admin`.
- Total de chamadas automatizadas validadas com sucesso: `62`.

## Correcoes aplicadas nesta rodada

### 1. Catalogo de beneficiarios em matriculas

- Arquivo: `backend/src/modules/matriculas/repositories/matricula.repository.ts`
- Problema: filtro SQL usava `${param} IS NULL` em `queryRaw`, gerando erro `42P18` no Postgres.
- Ajuste: filtro passou a ser montado condicionalmente apenas quando ha termo informado.

### 2. Catalogo de doadores em registro de doacao

- Arquivo: `backend/src/modules/registro-doacao/repositories/registro-doacao.repository.ts`
- Problema: mesma falha de tipagem SQL do item anterior.
- Ajuste: filtro passou a ser condicional, sem comparar parametro nulo em SQL bruto.

### 3. Motoristas disponiveis em controle de veiculos

- Arquivo: `backend/src/modules/controle-veiculos/repositories/controle-veiculos.repository.ts`
- Problema: o codigo novo assumia a tabela `cadastro_profissional`, mas a base real usa `cadastro_profissionais`.
- Ajuste: o repositorio agora detecta automaticamente a tabela existente e monta a consulta com compatibilidade para profissional e voluntario.

### 4. Oficios e protocolos

- Arquivo: `backend/src/modules/oficios/repositories/oficios.repository.ts`
- Problema: a base real nao tinha as colunas `destinatario_responsavel` e `destinatario_cargo`, embora o codigo novo exigisse essas colunas.
- Ajuste: o repositorio agora detecta as colunas disponiveis e faz leitura/escrita compativeis com os dois formatos.

### 5. Registro de visitas

- Arquivo: `backend/src/modules/visitas-domiciliares/repositories/visitas-domiciliares.repository.ts`
- Problema: a base real nao tinha as colunas `beneficiario_nome` e `anexos` na tabela `visita_domiciliar`.
- Ajuste: o repositorio agora detecta a estrutura atual, projeta `beneficiario_nome` por join quando necessario e monta `anexos` de forma compativel com a base legada.

## Resultado do smoke autenticado

Todos os endpoints abaixo responderam `200` apos as correcoes:

- Autenticacao
- Dashboard
- Beneficiarios
- Familias
- Unidades assistenciais
- Profissionais
- Voluntariado
- Matriculas
- Registro de doacao
- Doacoes realizadas
- Registro de ponto
- RH contratacao
- Almoxarifado
- Controle de veiculos
- Emprestimo de eventos
- Fotos de eventos
- Gestao de documentos
- Oficios e protocolos
- Patrimonio
- Tarefas e pendencias
- Lembretes diarios
- Banco de empregos
- Biblioteca
- Registro de visitas
- Ocorrencias
- Senhas
- Plano de trabalho
- Termo de fomento
- Autorizacao de compras
- Contabilidade
- Prestacao de contas
- Parametros do sistema
- Usuarios
- Relatorios institucionais de relacao

### Endpoints de relatorio validados

- `POST /api/reports/unidades-assistenciais/relacao`
- `POST /api/reports/beneficiarios/relacao`
- `POST /api/reports/profissionais/relacao`
- `POST /api/reports/voluntarios/relacao`
- `POST /api/reports/matriculas/relacao`
- `POST /api/reports/registro-doacao/relacao`
- `POST /api/reports/doacoes-realizadas/relacao`

## Limites que continuam honestamente abertos

- Esta rodada nao substitui QA manual visual no navegador.
- Nao houve clique humano tela por tela em desktop e mobile real.
- Nao foram exercitados nesta rodada todos os fluxos de criacao, edicao e exclusao de todos os modulos; o foco aqui foi a saude funcional das rotas principais usadas pelo frontend React ativo.
- Se houver um processo antigo do backend rodando na `3333`, ele precisa ser reiniciado para carregar essas correcoes.

## Observacao operacional

- Os avisos de "maximum number of unified exec processes" vieram do ambiente de automacao desta sessao, nao do G3-Next.
