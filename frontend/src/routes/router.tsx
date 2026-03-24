import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, createBrowserRouter, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/app/app-shell";
import { RequireAuth } from "@/app/require-auth";
import { RequirePermission } from "@/app/require-permission";
import { carregarModuloRota, obterLoaderRota } from "@/routes/route-modules";

const CHUNK_RELOAD_KEY = "g3:chunk-reload";

function ehErroImportacaoDinamica(erro: unknown) {
  if (!(erro instanceof Error)) {
    return false;
  }

  const mensagem = erro.message.toLowerCase();
  return (
    mensagem.includes("failed to fetch dynamically imported module") ||
    mensagem.includes("importing a module script failed") ||
    mensagem.includes("failed to load url") ||
    mensagem.includes("error loading dynamically imported module")
  );
}

function limparMarcadorReloadChunk() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {}
}

function tentarRecuperarImportacaoDinamica(path: string, erro: unknown) {
  if (!ehErroImportacaoDinamica(erro)) {
    return false;
  }

  try {
    const ultimoPath = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    if (ultimoPath === path) {
      return false;
    }

    sessionStorage.setItem(CHUNK_RELOAD_KEY, path);
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

function carregarPagina(path: string, exportName: string) {
  if (!obterLoaderRota(path)) {
    throw new Error(`Rota sem loader registrado: ${path}`);
  }

  const LazyPage = lazy(async () => {
    try {
      const module = await carregarModuloRota(path);
      if (!module) {
        throw new Error(`Modulo da rota nao encontrado: ${path}`);
      }

      limparMarcadorReloadChunk();
      return { default: module[exportName] as ComponentType };
    } catch (erro) {
      if (tentarRecuperarImportacaoDinamica(path, erro)) {
        return new Promise<never>(() => {});
      }

      throw erro;
    }
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

function RouteErrorBoundary() {
  const erro = useRouteError();

  const titulo = isRouteErrorResponse(erro)
    ? `${erro.status} ${erro.statusText || "Erro"}`
    : "Nao foi possivel carregar esta tela";

  const descricao = isRouteErrorResponse(erro)
    ? erro.data?.message || "A rota retornou um erro inesperado."
    : erro instanceof Error
      ? erro.message
      : "Ocorreu um erro inesperado ao carregar o modulo.";

  const erroChunk = ehErroImportacaoDinamica(erro);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--g3-bg)] px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--g3-muted)]">Erro de navegacao</p>
          <h1 className="text-2xl font-black text-[var(--g3-foreground)]">{titulo}</h1>
          <p className="text-sm text-[var(--g3-muted)]">
            {erroChunk
              ? "O sistema encontrou uma versao antiga em cache e nao conseguiu carregar os arquivos mais novos. Atualize a pagina para sincronizar a aplicacao."
              : descricao}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            Atualizar pagina
          </Button>
          <Button type="button" variant="outline" onClick={() => (window.location.href = "/dashboard/visao-geral")}>
            Ir para visao geral
          </Button>
        </div>

        {!erroChunk && erro instanceof Error ? (
          <pre className="mt-6 overflow-auto rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-xs text-[var(--g3-muted)]">
            {erro.message}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

const LoginPage = carregarPagina("/login", "LoginPage");
const CriarContaPage = carregarPagina("/criar-conta", "CriarContaPage");
const MaintenancePreviewPage = carregarPagina("/manutencao", "MaintenancePreviewPage");
const TermosUsoPage = carregarPagina("/termos-de-uso", "TermosUsoPage");
const PoliticaPrivacidadePage = carregarPagina("/politica-de-privacidade", "PoliticaPrivacidadePage");
const LicencaUsoRetornoPage = carregarPagina(
  "/licenca-de-uso/retorno-pagamento",
  "LicencaUsoRetornoPage"
);
const PainelSenhasPage = carregarPagina("/senhas/painel", "PainelSenhasPage");
const FrenteCaixaPage = carregarPagina("/setor-vendas/frente-caixa", "FrenteCaixaPage");
const HistoricoVendasPage = carregarPagina("/setor-vendas/historico", "HistoricoVendasPage");
const VisaoGeralPage = carregarPagina("/dashboard/visao-geral", "VisaoGeralPage");
const IndicadoresPage = carregarPagina("/dashboard/indicadores", "IndicadoresPage");
const PowerBiPage = carregarPagina("/dashboard/power-bi", "PowerBiPage");
const VulnerabilidadePage = carregarPagina("/dashboard/vulnerabilidade", "VulnerabilidadePage");
const CadastroBeneficiarioPage = carregarPagina("/cadastros/beneficiarios", "CadastroBeneficiarioPage");
const CadastroProfissionalPage = carregarPagina("/cadastros/profissionais", "CadastroProfissionalPage");
const CadastroVoluntariadoPage = carregarPagina("/cadastros/voluntariado", "CadastroVoluntariadoPage");
const CadastroMatriculasPage = carregarPagina("/atendimentos/matriculas", "CadastroMatriculasPage");
const CentralAtendimentosPage = carregarPagina("/atendimentos/central-atendimentos", "CentralAtendimentosPage");
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
const DatasComemorativasPage = carregarPagina(
  "/configuracoes/datas-comemorativas",
  "DatasComemorativasPage"
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
const ManualSistemaPage = carregarPagina("/configuracoes/manual-do-sistema", "ManualSistemaPage");
const LicencaUsoPage = carregarPagina("/configuracoes/licenca-uso", "LicencaUsoPage");
const SementePage = carregarPagina("/configuracoes/pesquise-na-ia", "SementePage");
const SobreOSistemaPage = carregarPagina("/configuracoes/sobre-o-sistema", "SobreOSistemaPage");
const CaptacaoRecursosPage = carregarPagina(
  "/captacao-recursos/dashboard",
  "CaptacaoRecursosPage"
);
const PortalDoadorPage = carregarPagina("/portal-doador", "PortalDoadorPage");

export const router = createBrowserRouter([
  {
    path: "/login",
    element: LoginPage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/criar-conta",
    element: CriarContaPage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/manutencao",
    element: MaintenancePreviewPage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/termos-de-uso",
    element: TermosUsoPage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/politica-de-privacidade",
    element: PoliticaPrivacidadePage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/licenca-de-uso/retorno-pagamento",
    element: LicencaUsoRetornoPage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/portal-doador",
    element: PortalDoadorPage,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/senhas/painel",
    element: <RequireAuth>{PainelSenhasPage}</RequireAuth>,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/setor-vendas/frente-caixa",
    element: <RequireAuth>{FrenteCaixaPage}</RequireAuth>,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/dashboard/visao-geral" replace /> },
      { path: "/dashboard/visao-geral", element: VisaoGeralPage },
      { path: "/dashboard/indicadores", element: IndicadoresPage },
      { path: "/dashboard/vulnerabilidade", element: VulnerabilidadePage },
      { path: "/dashboard/power-bi", element: PowerBiPage },
      { path: "/cadastros/beneficiarios", element: CadastroBeneficiarioPage },
      { path: "/cadastros/profissionais", element: CadastroProfissionalPage },
      { path: "/cadastros/voluntariado", element: CadastroVoluntariadoPage },
      {
        path: "/atendimentos/central-atendimentos",
        element: (
          <RequirePermission
            permissions={["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "CENTRAL_ATENDIMENTOS_VISUALIZAR"]}
          >
            {CentralAtendimentosPage}
          </RequirePermission>
        )
      },
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
      { path: "/setor-vendas/historico", element: HistoricoVendasPage },
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
        path: "/configuracoes/datas-comemorativas",
        element: (
          <RequirePermission
            permissions={["ADMINISTRADOR", "DATAS_COMEMORATIVAS_VISUALIZAR"]}
          >
            {DatasComemorativasPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/dashboard",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR", "CAPTACAO_DASHBOARD_VISUALIZAR"]}>
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/doadores",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CAPTACAO_DOADORES_VISUALIZAR",
              "CAPTACAO_DOADORES_CADASTRAR",
              "CAPTACAO_DOADORES_EDITAR"
            ]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/doacoes",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CAPTACAO_DOACOES_VISUALIZAR",
              "CAPTACAO_DOACOES_CADASTRAR"
            ]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/campanhas",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CAPTACAO_DASHBOARD_VISUALIZAR",
              "CAPTACAO_CAMPANHAS_CRIAR",
              "CAPTACAO_CAMPANHAS_EDITAR"
            ]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/portal-doador",
        element: (
          <RequirePermission
            permissions={["ADMINISTRADOR", "CAPTACAO_PORTAL_ACESSAR", "CAPTACAO_CONFIGURAR"]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/comprovantes",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CAPTACAO_DOACOES_VISUALIZAR",
              "CAPTACAO_COMPROVANTES_EMITIR",
              "CAPTACAO_COMPROVANTES_REENVIAR"
            ]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/configuracoes-pagamento",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR", "CAPTACAO_CONFIGURAR"]}>
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/relatorios",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CAPTACAO_RELATORIOS_VISUALIZAR",
              "CAPTACAO_RELATORIOS_EXPORTAR"
            ]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
      {
        path: "/captacao-recursos/permissoes",
        element: (
          <RequirePermission
            permissions={[
              "ADMINISTRADOR",
              "CAPTACAO_CONFIGURAR",
              "CAPTACAO_RELATORIOS_VISUALIZAR"
            ]}
          >
            {CaptacaoRecursosPage}
          </RequirePermission>
        )
      },
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
        path: "/configuracoes/licenca-uso",
        element: (
          <RequirePermission permissions={["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]}>
            {LicencaUsoPage}
          </RequirePermission>
        )
      },
      {
        path: "/configuracoes/manual-do-sistema",
        element: ManualSistemaPage
      },
      {
        path: "/configuracoes/pesquise-na-ia",
        element: SementePage
      },
      {
        path: "/configuracoes/sobre-o-sistema",
        element: SobreOSistemaPage
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
