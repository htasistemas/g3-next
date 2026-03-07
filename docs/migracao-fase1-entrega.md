# Entrega Fase 1 - Base G3 Next (Beneficiarios)

## O que foi entregue
1. Analise da estrutura atual:
   - `docs/beneficiarios-diagnostico-legado.md`
2. Proposta de arquitetura:
   - `docs/migracao-g3-arquitetura.md`
3. Backend inicial Node/Express/Prisma para beneficiarios:
   - CRUD completo
   - filtros por nome/codigo/cpf/status/data
   - endpoint de proximo codigo
4. Frontend React da tela de Cadastro de Beneficiario:
   - listagem + filtros
   - barra CRUD em ordem fixa
   - formulario em abas
   - validacao com Zod
   - integracao com backend
   - grafico de status com Recharts
5. Fase 2 complementar:
   - autenticacao/autorizacao no backend e frontend
   - migracao dos relatorios de beneficiarios para `/api/reports`
   - documentacao em `docs/migracao-fase2-auth-relatorios.md`
6. Fase 3 complementar:
   - migracao da tela de Vinculo Familiar (frontend + backend)
   - endpoint `/api/familias` com gestao de membros
   - documentacao em `docs/migracao-fase3-vinculo-familiar.md`

## Endpoints implementados no novo backend
- `GET /health`
- `GET /api/beneficiarios`
- `GET /api/beneficiarios/proximo-codigo`
- `GET /api/beneficiarios/:id`
- `POST /api/beneficiarios`
- `PUT /api/beneficiarios/:id`
- `DELETE /api/beneficiarios/:id`
- `GET /api/familias`
- `GET /api/familias/:id`
- `POST /api/familias`
- `PUT /api/familias/:id`
- `POST /api/familias/:id/membros`
- `PUT /api/familias/:id/membros/:membroId`
- `DELETE /api/familias/:id/membros/:membroId`

## Como rodar localmente

### 1) Backend Node
```bash
cd backend
npm install
cp .env.example.node .env
# ajuste DATABASE_URL se necessario
npm run prisma:generate
npm run dev
```
Backend em: `http://localhost:3333`

### 2) Frontend React
```bash
cd frontend
npm install
cp .env.example.react .env
# ajuste VITE_API_URL se necessario
npm run react:dev
```
Frontend em: `http://localhost:5173`

## Observacoes de banco
- Nenhuma tabela nova foi criada.
- Nenhum campo fisico foi alterado nesta fase.
- Prisma foi configurado para reutilizar o schema PostgreSQL existente.
