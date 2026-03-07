# Padrão Institucional de Relatórios (A4)

## Objetivo
Padronizar geração de formulários/relatórios impressos e PDF do G3-Next com layout único institucional.

## Estrutura obrigatória
1. Cabeçalho
- Logomarca da instituição (quando cadastrada).
- Razão social centralizada.
- Linha horizontal.
- Título do relatório em destaque.
- Segunda linha horizontal.

2. Corpo
- Conteúdo em fonte Arial.
- Tabelas e seções com espaçamento consistente.
- A4 com margens de 20 mm.
- Sem quebra visual agressiva em linhas e seções.

3. Rodapé
- Linha separadora.
- Razão social.
- CNPJ + endereço.
- Telefone + e-mail (+ site quando existir).
- Paginação no formato: `Página X de Y`.

## Componentes reutilizáveis (backend)
- Template HTML: `backend/src/modules/reports/templates/relatorio-template-padrao.ts`
- Renderizador PDF A4: `backend/src/modules/reports/services/html-pdf-renderer.ts`
- Serviço de orquestração: `backend/src/modules/reports/services/reports.service.ts`
- Endpoints: `backend/src/modules/reports/routes/reports.routes.ts`

## Endpoints cobertos
- `POST /api/reports/beneficiarios/relacao`
- `POST /api/reports/beneficiarios/ficha`
- `POST /api/reports/authorization-term`
- `POST /api/reports/unidades-assistenciais/relacao`

## Consumo frontend (React)
- Serviço HTTP: `frontend/src/services/reports.service.ts`
- Abertura de PDF em nova aba: `frontend/src/lib/report-utils.ts`

## Regra de evolução
Todo novo relatório deve usar obrigatoriamente `RelatorioTemplatePadrao` + `HtmlPdfRenderer`, sem CSS/HTML isolado por tela.
