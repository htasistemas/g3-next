import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { RequireAuth } from "@/app/require-auth";
import { RequirePermission } from "@/app/require-permission";

function carregarPagina<TModule, TExport extends keyof TModule & string>(
  loader: () => Promise<TModule>,
  exportName: TExport
) {
  const LazyPage = lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType };
  });

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LazyPage />
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-8 text-sm text-[var(--g3-muted)]">
      Carregando tela...
    </div>
  );
}

const LoginPage = carregarPagina(() => import("@/pages/login-page"), "LoginPage");
const CriarContaPage = carregarPagina(() => import("@/pages/criar-conta-page"), "CriarContaPage");
const TermosUsoPage = carregarPagina(() => import("@/pages/termos-uso-page"), "TermosUsoPage");
const PoliticaPrivacidadePage = carregarPagina(
  () => import("@/pages/politica-privacidade-page"),
  "PoliticaPrivacidadePage"
);
const PainelSenhasPage = carregarPagina(
  () => import("@/pages/atendimentos/painel-senhas-page"),
  "PainelSenhasPage"
);
const VisaoGeralPage = carregarPagina(
  () => import("@/pages/dashboard/visao-geral-page"),
  "VisaoGeralPage"
);
const IndicadoresPage = carregarPagina(
  () => import("@/pages/dashboard/indicadores-page"),
  "IndicadoresPage"
);
const PowerBiPage = carregarPagina(() => import("@/pages/dashboard/power-bi-page"), "PowerBiPage");
const CadastroBeneficiarioPage = carregarPagina(
  () => import("@/pages/beneficiarios/cadastro-beneficiario-page"),
  "CadastroBeneficiarioPage"
);
const CadastroProfissionalPage = carregarPagina(
  () => import("@/pages/profissionais/cadastro-profissional-page"),
  "CadastroProfissionalPage"
);
const CadastroVoluntariadoPage = carregarPagina(
  () => import("@/pages/voluntarios/cadastro-voluntariado-page"),
  "CadastroVoluntariadoPage"
);
const CadastroMatriculasPage = carregarPagina(
  () => import("@/pages/matriculas/cadastro-matriculas-page"),
  "CadastroMatriculasPage"
);
const BancoEmpregosPage = carregarPagina(
  () => import("@/pages/atendimentos/banco-empregos-page"),
  "BancoEmpregosPage"
);
const BibliotecaPage = carregarPagina(
  () => import("@/pages/atendimentos/biblioteca-page"),
  "BibliotecaPage"
);
const RegistroVisitasPage = carregarPagina(
  () => import("@/pages/atendimentos/registro-visitas-page"),
  "RegistroVisitasPage"
);
const OcorrenciasPage = carregarPagina(
  () => import("@/pages/atendimentos/ocorrencias-page"),
  "OcorrenciasPage"
);
const ChamadaSenhasPage = carregarPagina(
  () => import("@/pages/atendimentos/chamada-senhas-page"),
  "ChamadaSenhasPage"
);
const RegistroDoacaoPage = carregarPagina(
  () => import("@/pages/registro-doacao/registro-doacao-page"),
  "RegistroDoacaoPage"
);
const DoacoesRealizadasPage = carregarPagina(
  () => import("@/pages/doacoes-realizadas/doacoes-realizadas-page"),
  "DoacoesRealizadasPage"
);
const RegistroPontoPage = carregarPagina(
  () => import("@/pages/registro-ponto/registro-ponto-page"),
  "RegistroPontoPage"
);
const ContratacaoPage = carregarPagina(
  () => import("@/pages/setor-rh/contratacao-page"),
  "ContratacaoPage"
);
const AlmoxarifadoPage = carregarPagina(
  () => import("@/pages/setor-administrativo/almoxarifado-page"),
  "AlmoxarifadoPage"
);
const ControleVeiculosPage = carregarPagina(
  () => import("@/pages/setor-administrativo/controle-veiculos-page"),
  "ControleVeiculosPage"
);
const EmprestimoEventosPage = carregarPagina(
  () => import("@/pages/setor-administrativo/emprestimo-eventos-page"),
  "EmprestimoEventosPage"
);
const FotosEventosPage = carregarPagina(
  () => import("@/pages/setor-administrativo/fotos-eventos-page"),
  "FotosEventosPage"
);
const GestaoDocumentosPage = carregarPagina(
  () => import("@/pages/setor-administrativo/gestao-documentos-page"),
  "GestaoDocumentosPage"
);
const OficiosProtocolosPage = carregarPagina(
  () => import("@/pages/setor-administrativo/oficios-protocolos-page"),
  "OficiosProtocolosPage"
);
const PatrimonioPage = carregarPagina(
  () => import("@/pages/setor-administrativo/patrimonio-page"),
  "PatrimonioPage"
);
const TarefasPendenciasPage = carregarPagina(
  () => import("@/pages/setor-administrativo/tarefas-pendencias-page"),
  "TarefasPendenciasPage"
);
const LembretesDiariosPage = carregarPagina(
  () => import("@/pages/setor-administrativo/lembretes-diarios-page"),
  "LembretesDiariosPage"
);
const PlanoTrabalhoPage = carregarPagina(
  () => import("@/pages/setor-juridico/plano-trabalho-page-next"),
  "PlanoTrabalhoPage"
);
const TermoFomentoPage = carregarPagina(
  () => import("@/pages/setor-juridico/termo-fomento-page"),
  "TermoFomentoPage"
);
const AutorizacaoComprasPage = carregarPagina(
  () => import("@/pages/setor-financeiro/autorizacao-compras-page"),
  "AutorizacaoComprasPage"
);
const ContabilidadePage = carregarPagina(
  () => import("@/pages/setor-financeiro/contabilidade-page"),
  "ContabilidadePage"
);
const PrestacaoContasPage = carregarPagina(
  () => import("@/pages/setor-financeiro/prestacao-contas-page"),
  "PrestacaoContasPage"
);
const CadastroUnidadeAssistencialPage = carregarPagina(
  () => import("@/pages/unidades-assistenciais/cadastro-unidade-assistencial-page"),
  "CadastroUnidadeAssistencialPage"
);
const CadastroVinculoFamiliarPage = carregarPagina(
  () => import("@/pages/familias/cadastro-vinculo-familiar-page"),
  "CadastroVinculoFamiliarPage"
);
const ParametrosSistemaPage = carregarPagina(
  () => import("@/pages/configuracoes/parametros-sistema-page"),
  "ParametrosSistemaPage"
);
const UsuariosPage = carregarPagina(
  () => import("@/pages/configuracoes/usuarios-page"),
  "UsuariosPage"
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: LoginPage
  },
  {
    path: "/criar-conta",
    element: CriarContaPage
  },
  {
    path: "/termos-de-uso",
    element: TermosUsoPage
  },
  {
    path: "/politica-de-privacidade",
    element: PoliticaPrivacidadePage
  },
  {
    path: "/senhas/painel",
    element: <RequireAuth>{PainelSenhasPage}</RequireAuth>
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
      { path: "/dashboard/visao-geral", element: VisaoGeralPage },
      { path: "/dashboard/indicadores", element: IndicadoresPage },
      { path: "/dashboard/power-bi", element: PowerBiPage },
      { path: "/cadastros/beneficiarios", element: CadastroBeneficiarioPage },
      { path: "/cadastros/profissionais", element: CadastroProfissionalPage },
      { path: "/cadastros/voluntariado", element: CadastroVoluntariadoPage },
      { path: "/atendimentos/matriculas", element: CadastroMatriculasPage },
      { path: "/atendimentos/banco-empregos", element: BancoEmpregosPage },
      { path: "/atendimentos/biblioteca", element: BibliotecaPage },
      { path: "/atendimentos/registro-visitas", element: RegistroVisitasPage },
      { path: "/atendimentos/ocorrencias", element: OcorrenciasPage },
      { path: "/atendimentos/chamada-senhas", element: ChamadaSenhasPage },
      { path: "/financeiro/registro-doacao", element: RegistroDoacaoPage },
      { path: "/financeiro/doacoes-realizadas", element: DoacoesRealizadasPage },
      { path: "/setor-rh/registro-ponto", element: RegistroPontoPage },
      { path: "/setor-rh/contratacao", element: ContratacaoPage },
      { path: "/setor-administrativo/almoxarifado", element: AlmoxarifadoPage },
      { path: "/setor-administrativo/controle-veiculos", element: ControleVeiculosPage },
      { path: "/setor-administrativo/emprestimo-eventos", element: EmprestimoEventosPage },
      { path: "/setor-administrativo/fotos-eventos", element: FotosEventosPage },
      { path: "/setor-administrativo/gestao-documentos", element: GestaoDocumentosPage },
      { path: "/setor-administrativo/oficios-protocolos", element: OficiosProtocolosPage },
      { path: "/setor-administrativo/patrimonio", element: PatrimonioPage },
      { path: "/setor-administrativo/tarefas-pendencias", element: TarefasPendenciasPage },
      { path: "/setor-administrativo/lembretes-diarios", element: LembretesDiariosPage },
      { path: "/setor-juridico/plano-trabalho", element: PlanoTrabalhoPage },
      { path: "/setor-juridico/termo-fomento", element: TermoFomentoPage },
      { path: "/setor-financeiro/autorizacao-compras", element: AutorizacaoComprasPage },
      { path: "/setor-financeiro/contabilidade", element: ContabilidadePage },
      { path: "/setor-financeiro/prestacao-contas", element: PrestacaoContasPage },
      { path: "/cadastros/unidades-assistenciais", element: CadastroUnidadeAssistencialPage },
      { path: "/cadastros/vinculo-familiar", element: CadastroVinculoFamiliarPage },
      {
        path: "/configuracoes/parametros-sistema",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR"]}>
            {ParametrosSistemaPage}
          </RequirePermission>
        )
      },
      {
        path: "/configuracoes/usuarios",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR"]}>
            {UsuariosPage}
          </RequirePermission>
        )
      }
    ]
  }
]);
