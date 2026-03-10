export type DashboardPowerBiPeriodoPreset =
  | "hoje"
  | "ultimos7dias"
  | "ultimos30dias"
  | "mesAtual"
  | "anoAtual"
  | "personalizado";

export type DashboardPowerBiFiltros = {
  periodPreset?: DashboardPowerBiPeriodoPreset;
  startDate?: string;
  endDate?: string;
  unidades?: string[];
  municipios?: string[];
  bairros?: string[];
  programas?: string[];
  situacoesCadastro?: string[];
  faixasEtarias?: string[];
  generos?: string[];
  responsaveisTecnicos?: string[];
  tiposAtendimento?: string[];
  origensEncaminhamento?: string[];
  statusAcompanhamento?: string[];
  familiaBeneficiario?: string;
  tecnicoUsuario?: string;
};

export type DashboardPowerBiOpcaoFiltro = {
  value: string;
  label: string;
  total?: number;
};

export type DashboardPowerBiCardTrend = "subiu" | "caiu" | "estavel";

export type DashboardPowerBiCard = {
  id: string;
  titulo: string;
  valor: number;
  descricao: string;
  comparacaoValor: number;
  comparacaoRotulo: string;
  tendencia: DashboardPowerBiCardTrend;
  icone: string;
  detalheDatasetId?: string;
  tooltip?: string;
};

export type DashboardPowerBiSerie = {
  label: string;
  valor: number;
};

export type DashboardPowerBiValorNomeado = {
  nome: string;
  valor: number;
  descricao?: string;
};

export type DashboardPowerBiIndicadoresResumo = {
  composicaoFamiliarMedia: number;
  familiasComCriancas: number;
  familiasComIdosos: number;
  familiasComPcd: number;
  familiasMonoparentais: number;
  tempoMedioEntreAtendimentosDias: number;
  casosSemAtualizacao: number;
  tempoMedioConcessaoDias: number;
  taxaRetornoRede: number;
  taxaPresenca: number;
};

export type DashboardPowerBiDetalheColuna = {
  key: string;
  label: string;
};

export type DashboardPowerBiDetalheLinha = Record<string, string | number | null>;

export type DashboardPowerBiDetalheTabela = {
  id: string;
  titulo: string;
  descricao?: string;
  colunas: DashboardPowerBiDetalheColuna[];
  linhas: DashboardPowerBiDetalheLinha[];
  total: number;
};

export type DashboardPowerBiSecao = {
  resumo?: DashboardPowerBiValorNomeado[];
  series?: DashboardPowerBiSerie[];
  distribuicoes?: DashboardPowerBiValorNomeado[];
  rankings?: DashboardPowerBiValorNomeado[];
  tabelaId?: string;
};

export type DashboardPowerBiResponse = {
  atualizadoEm: string;
  filtrosAplicados: Required<DashboardPowerBiFiltros>;
  filtrosDisponiveis: {
    unidades: DashboardPowerBiOpcaoFiltro[];
    municipios: DashboardPowerBiOpcaoFiltro[];
    bairros: DashboardPowerBiOpcaoFiltro[];
    programas: DashboardPowerBiOpcaoFiltro[];
    situacoesCadastro: DashboardPowerBiOpcaoFiltro[];
    faixasEtarias: DashboardPowerBiOpcaoFiltro[];
    generos: DashboardPowerBiOpcaoFiltro[];
    responsaveisTecnicos: DashboardPowerBiOpcaoFiltro[];
    tiposAtendimento: DashboardPowerBiOpcaoFiltro[];
    origensEncaminhamento: DashboardPowerBiOpcaoFiltro[];
    statusAcompanhamento: DashboardPowerBiOpcaoFiltro[];
  };
  cardsGerenciais: DashboardPowerBiCard[];
  indicadoresResumo: DashboardPowerBiIndicadoresResumo;
  visaoGeral: DashboardPowerBiSecao & {
    statusDistribuicao: DashboardPowerBiValorNomeado[];
    territorial: DashboardPowerBiValorNomeado[];
    rankingUnidades: DashboardPowerBiValorNomeado[];
  };
  cadastrosSociais: DashboardPowerBiSecao & {
    faixasEtarias: DashboardPowerBiValorNomeado[];
    generos: DashboardPowerBiValorNomeado[];
    territorios: DashboardPowerBiValorNomeado[];
    ativosInativos: DashboardPowerBiValorNomeado[];
    faixaRenda: DashboardPowerBiValorNomeado[];
  };
  atendimentos: DashboardPowerBiSecao & {
    porTecnico: DashboardPowerBiValorNomeado[];
    porUnidade: DashboardPowerBiValorNomeado[];
    porTipo: DashboardPowerBiValorNomeado[];
    presenciaisRemotos: DashboardPowerBiValorNomeado[];
    casosAbertosEncerrados: DashboardPowerBiValorNomeado[];
  };
  beneficiosConcessoes: DashboardPowerBiSecao & {
    porTipo: DashboardPowerBiValorNomeado[];
    deferidosIndeferidos: DashboardPowerBiValorNomeado[];
  };
  acompanhamentoSocial: DashboardPowerBiSecao & {
    porVulnerabilidade: DashboardPowerBiValorNomeado[];
    porResponsavel: DashboardPowerBiValorNomeado[];
  };
  encaminhamentosRede: DashboardPowerBiSecao & {
    porTipo: DashboardPowerBiValorNomeado[];
    porInstituicao: DashboardPowerBiValorNomeado[];
    pendentesRetorno: DashboardPowerBiValorNomeado[];
  };
  projetosAcoes: DashboardPowerBiSecao & {
    porOficina: DashboardPowerBiValorNomeado[];
    participacaoFaixaEtaria: DashboardPowerBiValorNomeado[];
  };
  conveniosParcerias: DashboardPowerBiSecao & {
    porTipo: DashboardPowerBiValorNomeado[];
    porInstituicao: DashboardPowerBiValorNomeado[];
    vencimentos: DashboardPowerBiValorNomeado[];
  };
  pendenciasAlertas: DashboardPowerBiSecao & {
    criticos: DashboardPowerBiValorNomeado[];
  };
  detalhamentos: Record<string, DashboardPowerBiDetalheTabela>;
};
