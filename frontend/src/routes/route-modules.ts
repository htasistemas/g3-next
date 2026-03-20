type RouteModule = Record<string, unknown>;
type RouteModuleLoader = () => Promise<unknown>;

type RouteModuleDefinition = {
  path: string;
  loader: RouteModuleLoader;
};

const routeModules: RouteModuleDefinition[] = [
  { path: "/login", loader: () => import("@/pages/login-page") },
  { path: "/criar-conta", loader: () => import("@/pages/criar-conta-page") },
  { path: "/manutencao", loader: () => import("@/pages/maintenance-preview-page") },
  { path: "/termos-de-uso", loader: () => import("@/pages/termos-uso-page") },
  { path: "/politica-de-privacidade", loader: () => import("@/pages/politica-privacidade-page") },
  { path: "/senhas/painel", loader: () => import("@/pages/atendimentos/painel-senhas-page") },
  { path: "/dashboard/visao-geral", loader: () => import("@/pages/dashboard/visao-geral-page") },
  { path: "/dashboard/indicadores", loader: () => import("@/pages/dashboard/indicadores-page") },
  { path: "/dashboard/power-bi", loader: () => import("@/pages/dashboard/power-bi-page") },
  {
    path: "/dashboard/vulnerabilidade",
    loader: () => import("@/pages/dashboard/vulnerabilidade-page")
  },
  {
    path: "/cadastros/beneficiarios",
    loader: () => import("@/pages/beneficiarios/cadastro-beneficiario-page")
  },
  {
    path: "/cadastros/profissionais",
    loader: () => import("@/pages/profissionais/cadastro-profissional-page")
  },
  {
    path: "/cadastros/voluntariado",
    loader: () => import("@/pages/voluntarios/cadastro-voluntariado-page")
  },
  {
    path: "/atendimentos/matriculas",
    loader: () => import("@/pages/matriculas/cadastro-matriculas-page")
  },
  {
    path: "/atendimentos/banco-empregos",
    loader: () => import("@/pages/atendimentos/banco-empregos-page")
  },
  { path: "/atendimentos/biblioteca", loader: () => import("@/pages/atendimentos/biblioteca-page") },
  {
    path: "/atendimentos/registro-visitas",
    loader: () => import("@/pages/atendimentos/registro-visitas-page")
  },
  { path: "/atendimentos/ocorrencias", loader: () => import("@/pages/atendimentos/ocorrencias-page") },
  {
    path: "/atendimentos/chamada-senhas",
    loader: () => import("@/pages/atendimentos/chamada-senhas-page")
  },
  {
    path: "/financeiro/registro-doacao",
    loader: () => import("@/pages/registro-doacao/registro-doacao-page")
  },
  {
    path: "/financeiro/doacoes-realizadas",
    loader: () => import("@/pages/doacoes-realizadas/doacoes-realizadas-page")
  },
  { path: "/setor-rh/registro-ponto", loader: () => import("@/pages/registro-ponto/registro-ponto-page") },
  { path: "/setor-rh/contratacao", loader: () => import("@/pages/setor-rh/contratacao-page") },
  {
    path: "/setor-administrativo/almoxarifado",
    loader: () => import("@/pages/setor-administrativo/almoxarifado-page")
  },
  {
    path: "/setor-administrativo/controle-veiculos",
    loader: () => import("@/pages/setor-administrativo/controle-veiculos-page")
  },
  {
    path: "/setor-administrativo/emprestimo-eventos",
    loader: () => import("@/pages/setor-administrativo/emprestimo-eventos-page")
  },
  {
    path: "/setor-administrativo/fotos-eventos",
    loader: () => import("@/pages/setor-administrativo/fotos-eventos-page")
  },
  {
    path: "/setor-administrativo/gestao-documentos",
    loader: () => import("@/pages/setor-administrativo/gestao-documentos-page")
  },
  {
    path: "/setor-administrativo/oficios-protocolos",
    loader: () => import("@/pages/setor-administrativo/oficios-protocolos-page")
  },
  { path: "/setor-administrativo/patrimonio", loader: () => import("@/pages/setor-administrativo/patrimonio-page") },
  {
    path: "/setor-administrativo/tarefas-pendencias",
    loader: () => import("@/pages/setor-administrativo/tarefas-pendencias-page")
  },
  {
    path: "/setor-administrativo/lembretes-diarios",
    loader: () => import("@/pages/setor-administrativo/lembretes-diarios-page")
  },
  {
    path: "/setor-juridico/plano-trabalho",
    loader: () => import("@/pages/setor-juridico/plano-trabalho-page-next")
  },
  {
    path: "/setor-juridico/termo-fomento",
    loader: () => import("@/pages/setor-juridico/termo-fomento-page")
  },
  {
    path: "/setor-financeiro/autorizacao-compras",
    loader: () => import("@/pages/setor-financeiro/autorizacao-compras-page")
  },
  {
    path: "/setor-financeiro/contabilidade",
    loader: () => import("@/pages/setor-financeiro/contabilidade-page")
  },
  {
    path: "/setor-financeiro/prestacao-contas",
    loader: () => import("@/pages/setor-financeiro/prestacao-contas-page")
  },
  {
    path: "/cadastros/unidades-assistenciais",
    loader: () => import("@/pages/unidades-assistenciais/cadastro-unidade-assistencial-page")
  },
  {
    path: "/cadastros/vinculo-familiar",
    loader: () => import("@/pages/familias/cadastro-vinculo-familiar-page")
  },
  {
    path: "/configuracoes/parametros-sistema",
    loader: () => import("@/pages/configuracoes/parametros-sistema-page")
  },
  {
    path: "/configuracoes/atualizar-sistema",
    loader: () => import("@/pages/configuracoes/atualizar-sistema-page")
  },
  {
    path: "/configuracoes/datas-comemorativas",
    loader: () => import("@/pages/configuracoes/datas-comemorativas-page")
  },
  {
    path: "/captacao-recursos/dashboard",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/doadores",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/doacoes",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/campanhas",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/portal-doador",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/comprovantes",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/configuracoes-pagamento",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/relatorios",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/captacao-recursos/permissoes",
    loader: () => import("@/pages/captacao-recursos/captacao-recursos-page")
  },
  {
    path: "/portal-doador",
    loader: () => import("@/pages/captacao-recursos/portal-doador-page")
  },
  { path: "/configuracoes/usuarios", loader: () => import("@/pages/configuracoes/usuarios-page") },
  {
    path: "/configuracoes/mensagens-personalizadas",
    loader: () => import("@/pages/configuracoes/mensagens-personalizadas-page")
  },
  {
    path: "/configuracoes/chamado-tecnico",
    loader: () => import("@/pages/configuracoes/chamado-tecnico-page")
  },
  {
    path: "/configuracoes/pesquise-na-ia",
    loader: () => import("@/pages/configuracoes/semente-page")
  }
];

const routeLoadersByPath = new Map<string, RouteModuleLoader>(
  routeModules.map((routeModule) => [routeModule.path, routeModule.loader])
);

const pendingRouteModules = new Map<string, Promise<RouteModule>>();

function normalizarPathRota(path: string) {
  return path.split(/[?#]/u, 1)[0] ?? path;
}

export function obterLoaderRota(path: string) {
  return routeLoadersByPath.get(normalizarPathRota(path));
}

export function carregarModuloRota(path: string) {
  const pathNormalizado = normalizarPathRota(path);
  const loader = routeLoadersByPath.get(pathNormalizado);

  if (!loader) {
    return Promise.resolve(undefined);
  }

  const requisicaoPendente = pendingRouteModules.get(pathNormalizado);
  if (requisicaoPendente) {
    return requisicaoPendente;
  }

  const requisicao = loader()
    .then((module) => module as RouteModule)
    .catch((erro) => {
      pendingRouteModules.delete(pathNormalizado);
      throw erro;
    });

  pendingRouteModules.set(pathNormalizado, requisicao);
  return requisicao;
}

export async function precarregarRota(path: string) {
  await carregarModuloRota(path);
}

export async function precarregarRotas(paths: string[]) {
  for (const path of paths) {
    try {
      await precarregarRota(path);
    } catch {}
  }
}
