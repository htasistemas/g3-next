import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { RequireAuth } from "@/app/require-auth";
import { RequirePermission } from "@/app/require-permission";
import { CadastroBeneficiarioPage } from "@/pages/beneficiarios/cadastro-beneficiario-page";
import { CadastroVinculoFamiliarPage } from "@/pages/familias/cadastro-vinculo-familiar-page";
import { CadastroUnidadeAssistencialPage } from "@/pages/unidades-assistenciais/cadastro-unidade-assistencial-page";
import { CadastroProfissionalPage } from "@/pages/profissionais/cadastro-profissional-page";
import { CadastroVoluntariadoPage } from "@/pages/voluntarios/cadastro-voluntariado-page";
import { ParametrosSistemaPage } from "@/pages/configuracoes/parametros-sistema-page";
import { UsuariosPage } from "@/pages/configuracoes/usuarios-page";
import { VisaoGeralPage } from "@/pages/dashboard/visao-geral-page";
import { IndicadoresPage } from "@/pages/dashboard/indicadores-page";
import { CriarContaPage } from "@/pages/criar-conta-page";
import { LoginPage } from "@/pages/login-page";
import { PoliticaPrivacidadePage } from "@/pages/politica-privacidade-page";
import { TermosUsoPage } from "@/pages/termos-uso-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/criar-conta",
    element: <CriarContaPage />
  },
  {
    path: "/termos-de-uso",
    element: <TermosUsoPage />
  },
  {
    path: "/politica-de-privacidade",
    element: <PoliticaPrivacidadePage />
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard/visao-geral" replace /> },
      { path: "/dashboard/visao-geral", element: <VisaoGeralPage /> },
      { path: "/dashboard/indicadores", element: <IndicadoresPage /> },
      { path: "/cadastros/beneficiarios", element: <CadastroBeneficiarioPage /> },
      { path: "/cadastros/profissionais", element: <CadastroProfissionalPage /> },
      { path: "/cadastros/voluntariado", element: <CadastroVoluntariadoPage /> },
      { path: "/cadastros/unidades-assistenciais", element: <CadastroUnidadeAssistencialPage /> },
      { path: "/cadastros/vinculo-familiar", element: <CadastroVinculoFamiliarPage /> },
      {
        path: "/configuracoes/parametros-sistema",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR"]}>
            <ParametrosSistemaPage />
          </RequirePermission>
        )
      },
      {
        path: "/configuracoes/usuarios",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR"]}>
            <UsuariosPage />
          </RequirePermission>
        )
      }
    ]
  }
]);
