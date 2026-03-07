import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { RequireAuth } from "@/app/require-auth";
import { HomePage } from "@/pages/home-page";
import { CadastroBeneficiarioPage } from "@/pages/beneficiarios/cadastro-beneficiario-page";
import { CadastroVinculoFamiliarPage } from "@/pages/familias/cadastro-vinculo-familiar-page";
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
      { index: true, element: <HomePage /> },
      { path: "/cadastros/beneficiarios", element: <CadastroBeneficiarioPage /> },
      { path: "/cadastros/vinculo-familiar", element: <CadastroVinculoFamiliarPage /> }
    ]
  }
]);
