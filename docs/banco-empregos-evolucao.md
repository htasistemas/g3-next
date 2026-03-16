# Banco de empregos - evolução profissional

## Diagnóstico da revisão

- A tela anterior não sustentava um fluxo completo de candidatos, vagas, triagem, documentos, cartas e histórico.
- O frontend havia ficado sem a página principal depois da troca de contratos do módulo.
- O backend foi reestruturado para trabalhar com entidades próprias de candidato, vaga, processo seletivo, avaliação, documento e histórico.
- A nova base passou a usar consultas paginadas, filtros dedicados, storage versionado de documentos e auditoria por ação.

## Arquitetura adotada

### Backend

- Estrutura própria do módulo:
  - `banco_empregos_candidato`
  - `banco_empregos_vaga`
  - `banco_empregos_processo`
  - `banco_empregos_avaliacao`
  - `banco_empregos_documento`
  - `banco_empregos_historico`
- Indexação para busca por nome, CPF, bairro, cidade, área, situação, datas, vaga, candidato e processo.
- Endpoints específicos para:
  - dashboard
  - candidatos
  - vagas
  - processos
  - avaliação
  - documentos
  - histórico
  - exportações
  - cartas em PDF
- Upload com storage por escopo, sem gravar binário no banco.
- Versionamento de currículo com data de envio e extração estruturada para apoio à triagem.

### Frontend

- Recriação completa da página `Banco de empregos` em `AdminPageLayout`.
- Organização em abas:
  - Candidatos
  - Vagas
  - Triagem / seleção
  - Currículos e documentos
  - Encaminhamentos
  - Cartas / impressões
  - Relatórios
  - Histórico
- Dashboard superior com indicadores operacionais.
- Filtros antes das listagens, paginação via backend e exportação baseada nos filtros ativos.
- Pipeline com movimentação rápida de etapas e avaliação por critérios ponderados.

## Regras funcionais implementadas

- Cadastro completo de candidatos com idade automática, máscaras, normalização e validação dos campos críticos.
- Cadastro de vagas com critérios de avaliação para ranking.
- Vínculo candidato x vaga com etapa, status, responsável, datas e marcação de selecionado/contratado.
- Avaliação com critérios, peso, nota e observação.
- Upload de currículo, certificado e documento complementar com histórico.
- Aplicação manual das sugestões extraídas do currículo sem sobrescrever dados já preenchidos.
- Emissão de:
  - carta de encaminhamento
  - carta de recomendação
  - comprovante
  - ficha resumida
- Histórico auditável por entidade, usuário e ação.

## Validação executada

- Backend: `npm run typecheck` em `backend` sem erro.
- Frontend: `npm run react:typecheck` em `frontend` validando o módulo novo; os únicos erros restantes estão em `mensagens-personalizadas-page.tsx`, fora do escopo do Banco de Empregos.
