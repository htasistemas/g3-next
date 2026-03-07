# Proposta de Arquitetura - G3 Next

## Objetivo da fase
Criar uma base moderna para migração gradual do G3, iniciando por Beneficiários, com separação clara de responsabilidades e compatibilidade com PostgreSQL atual.

## Estrutura adotada
- `frontend/`
  - React + TypeScript + Tailwind + shadcn/ui + React Router + React Hook Form + Zod + TanStack Query + Recharts
  - Nova estrutura criada:
    - `src/app`
    - `src/pages`
    - `src/components`
    - `src/components/ui`
    - `src/features`
    - `src/features/beneficiarios`
    - `src/hooks`
    - `src/services`
    - `src/lib`
    - `src/types`
    - `src/routes`
- `backend/`
  - Node.js + Express + TypeScript + Prisma
  - Nova estrutura criada:
    - `src/modules`
    - `src/modules/beneficiarios`
    - `src/controllers`
    - `src/services`
    - `src/repositories`
    - `src/routes`
    - `src/middlewares`
    - `src/database`
    - `src/config`
    - `src/shared`
    - `src/utils`
  - Prisma em `backend/prisma/schema.prisma` mapeando tabelas existentes.

## Diretrizes de design aplicadas
- API REST padronizada com respostas consistentes:
  - `{ beneficiarios: [...] }`
  - `{ beneficiario: {...} }`
- Validação em duas camadas:
  - Frontend: Zod + React Hook Form
  - Backend: Zod no controller/service
- Requisições duplicadas evitadas:
  - Botões desabilitados durante `pending`
  - Mutations com estado controlado
- Erro centralizado no backend:
  - `AppError` + `errorHandler`
- Estado assíncrono no frontend:
  - TanStack Query para cache, invalidação e sincronização.

## Modelo de crescimento por módulos
Cada novo domínio seguirá o mesmo padrão:
- `modules/<dominio>/controllers`
- `modules/<dominio>/services`
- `modules/<dominio>/repositories`
- `modules/<dominio>/routes`
- Schemas e mapeadores por domínio

## Compatibilidade com banco
- Mantida compatibilidade com schema atual.
- Sem criação de novas tabelas nesta fase.
- Sem mudanças destrutivas.
- Próximas mudanças de schema devem ser propostas em documento de impacto antes da execução.

## Próximos passos recomendados
1. Adicionar autenticação/autorização no backend Node.
2. Migrar relatórios para padrão único HTML + PDF no Node.
3. Implementar upload real de anexos no novo backend.
4. Migrar módulo de vínculo familiar mantendo o mesmo padrão.
