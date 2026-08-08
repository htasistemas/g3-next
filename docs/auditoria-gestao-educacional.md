# Auditoria do módulo de Gestão educacional do G3N

Data da rodada: 2026-08-08

## 1. Resumo executivo

O módulo foi auditado por código, testes automatizados e cenário real controlado no banco local `g3`.

Estado inicial observado:

- Havia risco funcional na gravação de vagas das salas de atendimento, bloqueando matrícula com a mensagem "Configure a capacidade da sala antes de matricular alunos".
- O módulo educacional já possui rotas, abas, APIs e tabelas para visão geral, alunos, matrícula, estrutura acadêmica, diário, frequência, avaliações, notas, boletins, histórico, documentos, educação infantil, parcerias públicas e pendências.
- Parte das telas ainda é funcionalmente básica e precisa evolução para uma auditoria manual exaustiva de operação escolar completa.

Estado final desta rodada:

- A capacidade das salas passou a ser validada, persistida e retornada corretamente.
- O campo de vagas da sala foi ajustado no frontend para não perder o valor ao editar a tabela.
- Foi executado um ciclo acadêmico real e removível no backend: unidade de ensino, sala, beneficiário, aluno, ano letivo, etapa, série, disciplina, turma, matrícula sequencial, diário, chamada, avaliação, nota, boletim, histórico e Vida acadêmica 360.

Resultado desta rodada: **APROVADO COM RESSALVAS**.

## 2. Telas auditadas

- Gestão educacional > Visão geral
- Gestão educacional > Alunos
- Gestão educacional > Vida acadêmica 360
- Gestão educacional > Vida escolar
- Gestão educacional > Estrutura acadêmica
- Gestão educacional > Professores e equipe pedagógica
- Gestão educacional > Gestão escolar
- Gestão educacional > Relatórios e indicadores
- Gestão educacional > Parcerias públicas
- Cadastro de unidade de atendimento > Salas de atendimento

## 3. Abas auditadas

- Alunos
- Matrículas
- Alunos por turma
- Responsáveis e famílias
- Transferências
- Autorizações
- Anos letivos
- Etapas
- Séries
- Disciplinas
- Turmas
- Grade curricular
- Horários
- Diário de classe
- Frequência e chamada
- Avaliações
- Notas
- Boletins
- Histórico escolar
- Documentos e declarações
- Rotina infantil
- Desenvolvimento infantil
- Parcerias públicas
- Pendências educacionais

## 4. Cenários executados

### Cenário real controlado no banco

Tenant temporário: UUID gerado no momento do teste.

Fluxo executado:

1. Criou unidade de ensino temporária.
2. Criou sala com capacidade 20.
3. Criou beneficiário temporário.
4. Vinculou beneficiário como aluno.
5. Criou ano letivo 2026.
6. Criou etapa, série, disciplina e turma.
7. Gerou próximo número de matrícula: `00001`.
8. Criou matrícula ativa.
9. Tentou criar matrícula duplicada com o mesmo número e o backend bloqueou.
10. Criou diário de aula.
11. Carregou chamada rápida com o aluno matriculado.
12. Salvou presença.
13. Criou avaliação.
14. Lançou nota 8.
15. Gerou boletim automático.
16. Gerou histórico escolar automático.
17. Consultou Vida acadêmica 360 e confirmou matrícula, frequência 100% e nota.
18. Removeu os dados temporários.

## 5. Problemas encontrados

### CRÍTICO

Tela: Cadastro de unidade de atendimento > Salas de atendimento

Descrição: ao editar vagas da sala, o valor podia voltar como zero, impedindo matrícula.

Causa: o schema do backend não aceitava `capacidade_maxima` na sala e o mapper não devolvia esse campo; no frontend, o input também podia ficar divergente do estado do formulário.

### MÉDIO

Tela: Gestão educacional

Descrição: várias telas ainda são cadastros operacionais simples e não cobrem todos os fluxos administrativos e pedagógicos esperados em um ERP escolar completo.

Causa: o módulo está em evolução incremental.

## 6. Correções realizadas

Backend:

- `salaUnidadeSchema` passou a aceitar `capacidade_maxima`.
- `mapUnidadeAssistencialToResponse` passou a retornar `capacidade_maxima` nas salas.
- Foi adicionado teste automatizado para garantir que o schema preserva capacidade da sala.

Frontend:

- O input de vagas da sala passou a ser registrado pelo `react-hook-form` com `valueAsNumber`.
- O campo usa `defaultValue` e normaliza no `onBlur`, evitando perda de valor durante edição.

Banco:

- Não houve migration nova nesta rodada para capacidade, pois a coluna `salas_unidade.capacidade_maxima` já existe em migration anterior.

## 7. Relatórios testados

- Boletim automático: gerado no cenário real controlado.
- Histórico escolar automático: gerado no cenário real controlado.

Pendência: não houve validação visual de PDF/print no navegador nesta rodada.

## 8. Testes acadêmicos realizados

- Matrícula: criada com número sequencial `00001`.
- Duplicidade de matrícula: bloqueada pelo backend.
- Frequência: chamada rápida salva e refletida na Vida acadêmica 360.
- Avaliação e nota: criadas e persistidas.
- Boletim: gerado a partir de nota e frequência.
- Histórico: gerado a partir de matrícula, boletim e frequência.
- Vida acadêmica 360: retornou matrícula, frequência 100% e nota.

## 9. Testes de segurança

- Tenant: o cenário usou tenant temporário isolado e todas as operações educacionais executadas pelo service exigiram tenant.
- Permissões: não houve teste manual por perfil no navegador nesta rodada.

## 10. Testes de persistência

- Unidade e sala: criada, atualizada de 12 para 37 vagas, relida pelo service e removida.
- Ciclo acadêmico: dados persistidos no banco local e consultados novamente pela Vida acadêmica 360 antes da limpeza.

## 11. Testes de performance

- Não foram identificados travamentos em testes automatizados.
- Pendência: listagens genéricas ainda usam limite fixo em alguns endpoints e precisam paginação/filtros mais amplos para bases grandes.

## 12. Testes automatizados executados

- `backend npm run test:educacional`: 15 testes aprovados.
- `backend npm run test:text`: 88 testes aprovados.
- `backend npm run build`: aprovado.
- `frontend npm run react:build`: aprovado.
- `git diff --check`: sem erro impeditivo, apenas avisos de final de linha CRLF.

## 13. Pendências

- Executar auditoria manual completa no navegador em todos os perfis reais.
- Validar geração e abertura visual de PDFs/exports.
- Evoluir fluxo completo de recuperação, resultado final, encerramento de período e encerramento de ano.
- Criar testes automatizados específicos para multi-tenant em todas as queries educacionais.
- Ampliar as telas que ainda são cadastros simples para experiências didáticas completas.

## 14. Resultado final

**APROVADO COM RESSALVAS**

Os fluxos críticos backend testados nesta rodada estão operacionais. A aprovação total do módulo depende da auditoria manual exaustiva no navegador e da conclusão das pendências funcionais listadas.
