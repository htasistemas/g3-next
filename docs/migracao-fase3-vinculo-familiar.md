# Entrega Fase 3 - Vinculo Familiar (Node/React)

## 1) Tela migrada para React

Nova rota:
- `/cadastros/vinculo-familiar`

Implementado:
- barra CRUD na ordem fixa
- listagem com filtros (nome, municipio, status)
- cadastro com abas:
  - cadastro da familia
  - endereco
  - membros vinculados
  - indicadores sociais
- busca de responsavel principal via beneficiarios
- busca e inclusao de membros
- validacao com React Hook Form + Zod
- bloqueio de acoes durante processamento
- feedback visual de sucesso/erro

Arquivos principais:
- `frontend/src/pages/familias/cadastro-vinculo-familiar-page.tsx`
- `frontend/src/features/familias/familia.schema.ts`
- `frontend/src/features/familias/use-familias.ts`
- `frontend/src/services/familias.service.ts`
- `frontend/src/types/familia.ts`

## 2) Backend Node para familias

Endpoints em `/api/familias`:
- `GET /api/familias`
- `GET /api/familias/:id`
- `POST /api/familias`
- `PUT /api/familias/:id`
- `POST /api/familias/:id/membros`
- `PUT /api/familias/:id/membros/:membroId`
- `DELETE /api/familias/:id/membros/:membroId`

Seguranca:
- autenticacao obrigatoria em todas as rotas
- leitura: `ADMINISTRADOR`, `OPERADOR`, `LEITURA_APENAS`
- escrita: `ADMINISTRADOR`, `OPERADOR`

Arquivos principais:
- `backend/src/modules/familias/familia.schema.ts`
- `backend/src/modules/familias/repositories/familia.repository.ts`
- `backend/src/modules/familias/services/familia.service.ts`
- `backend/src/modules/familias/controllers/familia.controller.ts`
- `backend/src/modules/familias/routes/familia.routes.ts`
- `backend/src/routes/index.ts`

## 3) Banco de dados

- Nenhuma alteracao estrutural executada em tabelas.
- Foi feito apenas mapeamento Prisma das tabelas ja existentes:
  - `vinculo_familiar`
  - `vinculo_familiar_membro`
- Arquivo alterado:
  - `backend/prisma/schema.prisma`

## 4) Validacao tecnica executada

- backend:
  - `npm run prisma:generate`
  - `npm run typecheck`
  - `npm run build`
- frontend:
  - `npm run react:typecheck`
  - `npm run react:build`
- smoke:
  - `GET /health` -> `200`
  - `GET /api/familias` sem auth -> `401`
