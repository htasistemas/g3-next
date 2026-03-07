# Entrega Fase 2 - Autenticacao e Relatorios (Node/React)

## 1) Autenticacao e autorizacao implementadas

### Backend
- Novas rotas:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Comportamento:
  - Login valida usuario em `usuarios` e senha `bcrypt` (`senha_hash`).
  - Token JWT assinado com `APP_AUTH_TOKEN_SECRET`.
  - Token armazenado em cookie `HttpOnly` (`g3_auth_token`), sem necessidade de `localStorage`.
  - Middleware de autenticacao para ler token via cookie ou `Authorization: Bearer`.
  - Middleware de autorizacao por permissao:
    - `ADMINISTRADOR`
    - `OPERADOR`
    - `LEITURA_APENAS`

### Frontend
- Login React em `/login`.
- Sessao em memoria com `AuthProvider`.
- Rotas protegidas com `RequireAuth`.
- Logout no cabecalho.
- Sem uso de `localStorage` para token.

## 2) Relatorios migrados para o backend Node

### Endpoints novos em `/api/reports` (protegidos por autenticacao)
- `POST /api/reports/authorization-term`
- `POST /api/reports/beneficiarios/relacao`
- `POST /api/reports/beneficiarios/ficha`

### Padrao aplicado
- Template reutilizavel:
  - `RelatorioTemplatePadrao` em `backend/src/modules/reports/templates/relatorio-template-padrao.ts`
- Renderizador PDF:
  - `HtmlPdfRenderer` em `backend/src/modules/reports/services/html-pdf-renderer.ts`
- Regras:
  - A4
  - margem 20mm
  - rodape padrao com 3 linhas da instituicao
  - `Pagina X de Y`
  - `Content-Disposition: inline; filename="*.pdf"`

## 3) Integracao no frontend
- A acao `Imprimir` do cadastro de beneficiario agora consome:
  - `POST /api/reports/beneficiarios/ficha`
- O PDF abre em nova guia com 1 clique.

## 4) Seguranca aplicada
- Rotas de beneficiario protegidas por autenticacao e permissao.
- Exclusao restrita para `ADMINISTRADOR`.
- Relatorios protegidos por autenticacao e permissao.
- Mensagens amigaveis de erro sem stacktrace ao cliente.

## 5) Variaveis de ambiente novas (backend)
- `APP_AUTH_TOKEN_SECRET`
- `APP_AUTH_TOKEN_EXPIRATION_MINUTES`

Arquivo base: `backend/.env.example.node`
