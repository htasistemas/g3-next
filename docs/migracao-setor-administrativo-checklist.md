# Checklist De Aderência — Setor Administrativo (Legado x G3-Next)

Data da análise: 09/03/2026  
Escopo: Almoxarifado, Controle de Veículos, Empréstimo para Eventos, Fotos e Eventos, Gestão de Documentos, Ofícios e Protocolos, Patrimônio, Tarefas e Pendências, Lembretes Diários.

## Fontes Analisadas

### Legado (Angular)
- `frontend/src/app/components/almoxarifado/*`
- `frontend/src/app/components/controle-veiculos/*`
- `frontend/src/app/components/emprestimos-eventos/*`
- `frontend/src/app/components/fotos-eventos/*`
- `frontend/src/app/components/documentos-institucionais/*`
- `frontend/src/app/components/oficios-gestao/*`
- `frontend/src/app/components/patrimonio/*`
- `frontend/src/app/components/tarefas-pendencias/*`
- `frontend/src/app/components/lembretes-diarios/*`

### G3-Next (React + Node)
- `frontend/src/pages/setor-administrativo/*`
- `frontend/src/features/*` (módulos administrativos)
- `frontend/src/services/*` (módulos administrativos)
- `backend/src/modules/*` (módulos administrativos)
- `frontend/src/app/app-shell.tsx` (menu)
- `frontend/src/routes/router.tsx` (rotas)

## Resultado Por Tela

| Tela | Cobertura no G3-Next | Pontos do Legado já cobertos | Pendências relevantes |
|---|---|---|---|
| Almoxarifado | Parcial Alta | Abas principais, cadastro de item, composição de kit, movimentações, listagem, dashboard, APIs de kit e vínculos no backend | Falta expor no frontend o fluxo completo de vínculos de kit por movimentação e ajustes finos de UX do fluxo de kit composto |
| Controle de Veículos | Parcial Média | Cadastro básico, diário de bordo, motoristas autorizados, CRUDs e APIs principais | Legado tem fluxo mais completo (fotos do veículo, PDF do documento, múltiplos veículos por motorista, busca avançada por origem profissional/voluntário, carteira e impressão) |
| Empréstimo para Eventos | Parcial Média | Cadastro, itens, agenda, eventos, confirmação de retirada/devolução/cancelamento, APIs completas | Legado possui abas adicionais (dashboard, disponibilidade dedicada, histórico dedicado), impressão de relatório/termo e UX de agenda mais rica |
| Fotos e Eventos | Parcial Alta | Listagem, cadastro de evento, detalhe, upload de foto principal, galeria, remoção de fotos | Legado inclui filtros mais completos, upload em lote com metadados avançados, edição completa de foto e recursos de visualização mais avançados |
| Gestão de Documentos | Parcial Alta | Lista, cadastro, anexos, histórico, alertas e cards de resumo, backend com anexos/histórico | Legado possui fluxo mais amplo de relatórios/exportações (CSV/TXT/PDF) e gestão dinâmica ampliada de catálogos na interface |
| Ofícios e Protocolos | Parcial Média | Dashboard, identificação, conteúdo, tramitação e listagem, CRUD básico | Legado tem recursos extras relevantes: PDF assinado, imagens do ofício, reaproveitamento por número/ano, protocolos operacionais mais completos e impressão consolidada |
| Patrimônio | Parcial Alta | Dados gerais, localização, dashboard, movimentação e listagem, backend de movimentos | Legado possui camada visual/operacional mais completa para identificação visual e rotinas complementares de operação |
| Tarefas e Pendências | Parcial Alta | Cadastro, acompanhamento, listagem, dashboard, checklist, histórico e CRUD | Impressão/relatório operacional ainda está placeholder no frontend (legado tinha fluxo mais fechado de impressão) |
| Lembretes Diários | Parcial Alta | Cadastro, listagem, filtros, concluir, adiar, excluir, backend completo | Impressão/exportação ainda placeholder e ajustes finos de paridade de filtros por status do legado |

## Achado Crítico (Bloqueador Visual)

- Foi identificado problema de acentuação (mojibake) em múltiplas telas migradas do Setor Administrativo no frontend React, com textos como `NÃ£o`, `ConfirmaÃ§Ã£o`, `OfÃ­cio`.
- Esse ponto afeta a regra obrigatória de idioma pt-BR na UI e deve ser tratado como prioridade de estabilização visual.

## Diagnóstico Geral

- Backend administrativo está bem estruturado e, em vários módulos, mais completo que a camada de tela já exposta no React.
- A migração atual está funcional para fluxo principal de várias telas, mas ainda não atingiu paridade total do legado nas telas:
- Controle de Veículos
- Empréstimo para Eventos
- Ofícios e Protocolos

## Ordem Recomendada De Fechamento

1. Correção global de acentuação pt-BR nas 9 telas migradas.
2. Fechamento de paridade de Empréstimo para Eventos (abas faltantes + impressão).
3. Fechamento de paridade de Ofícios e Protocolos (PDF assinado/imagens/protocolos completos).
4. Fechamento de paridade de Controle de Veículos (documentação/fotos/carteira/multi-vínculo).
5. Finalização de impressão/exportação em Documentos, Tarefas e Lembretes.
