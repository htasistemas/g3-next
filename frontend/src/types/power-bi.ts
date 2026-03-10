export type PowerBiPeriodoPreset =
  | "hoje"
  | "ultimos7dias"
  | "ultimos30dias"
  | "mesAtual"
  | "anoAtual"
  | "personalizado";

export type PowerBiFiltros = {
  periodPreset?: PowerBiPeriodoPreset;
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

export type PowerBiOpcaoFiltro = {
  value: string;
  label: string;
  total?: number;
};

export type PowerBiCardTrend = "subiu" | "caiu" | "estavel";

export type PowerBiCard = {
  id: string;
  titulo: string;
  valor: number;
  descricao: string;
  comparacaoValor: number;
  comparacaoRotulo: string;
  tendencia: PowerBiCardTrend;
  icone: string;
  detalheDatasetId?: string;
  tooltip?: string;
};

export type PowerBiSerie = {
  label: string;
  valor: number;
};

export type PowerBiValorNomeado = {
  nome: string;
  valor: number;
  descricao?: string;
};

export type PowerBiIndicadoresResumo = {
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

export type PowerBiDetalheColuna = {
  key: string;
  label: string;
};

export type PowerBiDetalheLinha = Record<string, string | number | null>;

export type PowerBiDetalheTabela = {
  id: string;
  titulo: string;
  descricao?: string;
  colunas: PowerBiDetalheColuna[];
  linhas: PowerBiDetalheLinha[];
  total: number;
};

export type PowerBiSecao = {
  resumo?: PowerBiValorNomeado[];
  series?: PowerBiSerie[];
  distribuicoes?: PowerBiValorNomeado[];
  rankings?: PowerBiValorNomeado[];
  tabelaId?: string;
};

export type PowerBiResponse = {
  atualizadoEm: string;
  filtrosAplicados: Required<PowerBiFiltros>;
  filtrosDisponiveis: {
    unidades: PowerBiOpcaoFiltro[];
    municipios: PowerBiOpcaoFiltro[];
    bairros: PowerBiOpcaoFiltro[];
    programas: PowerBiOpcaoFiltro[];
    situacoesCadastro: PowerBiOpcaoFiltro[];
    faixasEtarias: PowerBiOpcaoFiltro[];
    generos: PowerBiOpcaoFiltro[];
    responsaveisTecnicos: PowerBiOpcaoFiltro[];
    tiposAtendimento: PowerBiOpcaoFiltro[];
    origensEncaminhamento: PowerBiOpcaoFiltro[];
    statusAcompanhamento: PowerBiOpcaoFiltro[];
  };
  cardsGerenciais: PowerBiCard[];
  indicadoresResumo: PowerBiIndicadoresResumo;
  visaoGeral: PowerBiSecao & {
    statusDistribuicao: PowerBiValorNomeado[];
    territorial: PowerBiValorNomeado[];
    rankingUnidades: PowerBiValorNomeado[];
  };
  cadastrosSociais: PowerBiSecao & {
    faixasEtarias: PowerBiValorNomeado[];
    generos: PowerBiValorNomeado[];
    territorios: PowerBiValorNomeado[];
    ativosInativos: PowerBiValorNomeado[];
    faixaRenda: PowerBiValorNomeado[];
  };
  atendimentos: PowerBiSecao & {
    porTecnico: PowerBiValorNomeado[];
    porUnidade: PowerBiValorNomeado[];
    porTipo: PowerBiValorNomeado[];
    presenciaisRemotos: PowerBiValorNomeado[];
    casosAbertosEncerrados: PowerBiValorNomeado[];
  };
  beneficiosConcessoes: PowerBiSecao & {
    porTipo: PowerBiValorNomeado[];
    deferidosIndeferidos: PowerBiValorNomeado[];
  };
  acompanhamentoSocial: PowerBiSecao & {
    porVulnerabilidade: PowerBiValorNomeado[];
    porResponsavel: PowerBiValorNomeado[];
  };
  encaminhamentosRede: PowerBiSecao & {
    porTipo: PowerBiValorNomeado[];
    porInstituicao: PowerBiValorNomeado[];
    pendentesRetorno: PowerBiValorNomeado[];
  };
  projetosAcoes: PowerBiSecao & {
    porOficina: PowerBiValorNomeado[];
    participacaoFaixaEtaria: PowerBiValorNomeado[];
  };
  conveniosParcerias: PowerBiSecao & {
    porTipo: PowerBiValorNomeado[];
    porInstituicao: PowerBiValorNomeado[];
    vencimentos: PowerBiValorNomeado[];
  };
  pendenciasAlertas: PowerBiSecao & {
    criticos: PowerBiValorNomeado[];
  };
  detalhamentos: Record<string, PowerBiDetalheTabela>;
};
