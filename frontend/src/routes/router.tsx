import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { RequireAuth } from "@/app/require-auth";
import { RequirePermission } from "@/app/require-permission";
import { carregarModuloRota, obterLoaderRota } from "@/routes/route-modules";

function carregarPagina(path: string, exportName: string) {
  if (!obterLoaderRota(path)) {
    throw new Error(`Rota sem loader registrado: ${path}`);
  }

  const LazyPage = lazy(async () => {
    const module = await carregarModuloRota(path);
    if (!module) {
      throw new Error(`Modulo da rota nao encontrado: ${path}`);
    }
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

const LoginPage = carregarPagina("/login", "LoginPage");
const CriarContaPage = carregarPagina("/criar-conta", "CriarContaPage");
const MaintenancePreviewPage = carregarPagina("/manutencao", "MaintenancePreviewPage");
const TermosUsoPage = carregarPagina("/termos-de-uso", "TermosUsoPage");
const PoliticaPrivacidadePage = carregarPagina("/politica-de-privacidade", "PoliticaPrivacidadePage");
const PainelSenhasPage = carregarPagina("/senhas/painel", "PainelSenhasPage");
const VisaoGeralPage = carregarPagina("/dashboard/visao-geral", "VisaoGeralPage");
const IndicadoresPage = carregarPagina("/dashboard/indicadores", "IndicadoresPage");
const PowerBiPage = carregarPagina("/dashboard/power-bi", "PowerBiPage");
const VulnerabilidadePage = carregarPagina("/dashboard/vulnerabilidade", "VulnerabilidadePage");
const CadastroBeneficiarioPage = carregarPagina("/cadastros/beneficiarios", "CadastroBeneficiarioPage");
const CadastroProfissionalPage = carregarPagina("/cadastros/profissionais", "CadastroProfissionalPage");
const CadastroVoluntariadoPage = carregarPagina("/cadastros/voluntariado", "CadastroVoluntariadoPage");
const CadastroMatriculasPage = carregarPagina("/atendimentos/matriculas", "CadastroMatriculasPage");
const BancoEmpregosPage = carregarPagina("/atendimentos/banco-empregos", "BancoEmpregosPage");
const BibliotecaPage = carregarPagina("/atendimentos/biblioteca", "BibliotecaPage");
const RegistroVisitasPage = carregarPagina("/atendimentos/registro-visitas", "RegistroVisitasPage");
const OcorrenciasPage = carregarPagina("/atendimentos/ocorrencias", "OcorrenciasPage");
const ChamadaSenhasPage = carregarPagina("/atendimentos/chamada-senhas", "ChamadaSenhasPage");
const RegistroDoacaoPage = carregarPagina("/financeiro/registro-doacao", "RegistroDoacaoPage");
const DoacoesRealizadasPage = carregarPagina("/financeiro/doacoes-realizadas", "DoacoesRealizadasPage");
const RegistroPontoPage = carregarPagina("/setor-rh/registro-ponto", "RegistroPontoPage");
const ContratacaoPage = carregarPagina("/setor-rh/contratacao", "ContratacaoPage");
const AlmoxarifadoPage = carregarPagina("/setor-administrativo/almoxarifado", "AlmoxarifadoPage");
const ControleVeiculosPage = carregarPagina(
  "/setor-administrativo/controle-veiculos",
  "ControleVeiculosPage"
);
const EmprestimoEventosPage = carregarPagina(
  "/setor-administrativo/emprestimo-eventos",
  "EmprestimoEventosPage"
);
const FotosEventosPage = carregarPagina("/setor-administrativo/fotos-eventos", "FotosEventosPage");
const GestaoDocumentosPage = carregarPagina(
  "/setor-administrativo/gestao-documentos",
  "GestaoDocumentosPage"
);
const OficiosProtocolosPage = carregarPagina(
  "/setor-administrativo/oficios-protocolos",
  "OficiosProtocolosPage"
);
const PatrimonioPage = carregarPagina("/setor-administrativo/patrimonio", "PatrimonioPage");
const TarefasPendenciasPage = carregarPagina(
  "/setor-administrativo/tarefas-pendencias",
  "TarefasPendenciasPage"
);
const LembretesDiariosPage = carregarPagina(
  "/setor-administrativo/lembretes-diarios",
  "LembretesDiariosPage"
);
const PlanoTrabalhoPage = carregarPagina("/setor-juridico/plano-trabalho", "PlanoTrabalhoPage");
const TermoFomentoPage = carregarPagina("/setor-juridico/termo-fomento", "TermoFomentoPage");
const AutorizacaoComprasPage = carregarPagina(
  "/setor-financeiro/autorizacao-compras",
  "AutorizacaoComprasPage"
);
const ContabilidadePage = carregarPagina("/setor-financeiro/contabilidade", "ContabilidadePage");
const PrestacaoContasPage = carregarPagina("/setor-financeiro/prestacao-contas", "PrestacaoContasPage");
const CadastroUnidadeAssistencialPage = carregarPagina(
  "/cadastros/unidades-assistenciais",
  "CadastroUnidadeAssistencialPage"
);
const CadastroVinculoFamiliarPage = carregarPagina(
  "/cadastros/vinculo-familiar",
  "CadastroVinculoFamiliarPage"
);
const ParametrosSistemaPage = carregarPagina(
  "/configuracoes/parametros-sistema",
  "ParametrosSistemaPage"
);
const AtualizarSistemaPage = carregarPagina(
  "/configuracoes/atualizar-sistema",
  "AtualizarSistemaPage"
);
const UsuariosPage = carregarPagina("/configuracoes/usuarios", "UsuariosPage");
const MensagensPersonalizadasPage = carregarPagina(
  "/configuracoes/mensagens-personalizadas",
  "MensagensPersonalizadasPage"
);
const ChamadoTecnicoPage = carregarPagina("/configuracoes/chamado-tecnico", "ChamadoTecnicoPage");

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
    path: "/manutencao",
    element: MaintenancePreviewPage
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
      { path: "/dashboard/vulnerabilidade", element: VulnerabilidadePage },
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
        path: "/configuracoes/atualizar-sistema",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CONFIG_ATUALIZAR_SISTEMA",
              "CONFIG_ALTERAR_MODO_ATUALIZACAO",
              "CONFIG_EXECUTAR_ROLLBACK"
            ]}
          >
            {AtualizarSistemaPage}
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
      },
      {
        path: "/configuracoes/chamado-tecnico",
        element: ChamadoTecnicoPage
      },
      {
        path: "/configuracoes/mensagens-personalizadas",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "OPERADOR",
              "LEITURA_APENAS",
              "MENSAGENS_PERSONALIZADAS_VISUALIZAR"
            ]}
          >
            {MensagensPersonalizadasPage}
          </RequirePermission>
        )
      }
    ]
  }
]);
