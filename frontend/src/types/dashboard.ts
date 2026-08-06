export type DashboardFiltros = {
  startDate?: string;
  endDate?: string;
};

export type DashboardGerencialFiltros = DashboardFiltros & {
  periodoPreset?: string;
  unidade?: string;
  projeto?: string;
  programa?: string;
  servico?: string;
  profissional?: string;
  tipoAtendimento?: string;
  statusBeneficiario?: string;
  faixaEtaria?: string;
  sexo?: string;
  bairro?: string;
  cidade?: string;
  territorio?: string;
  origemEncaminhamento?: string;
};

export type DashboardGerencialBucket = {
  chave: string;
  rotulo: string;
  total: number;
};

export type DashboardGerencialMatrizFaixaEtariaBairro = {
  bairro: string;
  total: number;
  criancas: number;
  adolescentes: number;
  jovens: number;
  adultos: number;
  idosos: number;
  naoInformada: number;
};

export type DashboardGerencialKpi = {
  id: string;
  titulo: string;
  valor: number;
  comparacaoAnterior: number;
  variacaoPercentual: number;
  tendencia: "alta" | "estavel" | "baixa";
  interpretacao: "positiva" | "negativa" | "neutra";
  meta?: number | null;
  percentualMeta?: number | null;
  tooltip: string;
  origem: string;
  rotaDetalhe?: string;
};

export type DashboardGerencialPendencia = {
  id: string;
  titulo: string;
  descricao: string;
  modulo: string;
  prioridade: "critica" | "alta" | "media" | "baixa" | "informativa";
  quantidade: number;
  prazo?: string | null;
  responsavel?: string | null;
  unidade?: string | null;
  projeto?: string | null;
  rotaDetalhe?: string;
};

export type DashboardGerencialEvento = {
  id: string;
  titulo: string;
  data: string | null;
  horario?: string | null;
  local?: string | null;
  unidade?: string | null;
  responsavel?: string | null;
  inscritos?: number | null;
  vagasDisponiveis?: number | null;
  situacao?: string | null;
  prazoRestanteDias?: number | null;
  rotaDetalhe?: string;
};

export type DashboardGerencialProjeto = {
  id: string;
  projeto: string;
  programa?: string | null;
  responsavel?: string | null;
  unidade?: string | null;
  periodoInicio?: string | null;
  periodoFim?: string | null;
  beneficiariosPrevistos: number;
  beneficiariosAtendidos: number;
  pessoasUnicasAtendidas: number;
  atividadesPrevistas: number;
  atividadesRealizadas: number;
  metaAtingidaPercentual: number;
  orcamentoPrevisto?: number | null;
  valorExecutado?: number | null;
  financeiroExecutadoPercentual?: number | null;
  prazoConsumidoPercentual: number;
  pendencias: number;
  proximoMarco?: string | null;
  situacao: "dentro_da_meta" | "atencao" | "atrasado" | "critico" | "concluido" | "suspenso" | "sem_dados_suficientes";
  rotaDetalhe?: string;
};

export type DashboardGerencialResponse = {
  filtros: {
    startDate: string;
    endDate: string;
  };
  instituicao: {
    id?: string;
    nome?: string;
    logoUrl?: string | null;
  };
  ultimaAtualizacao: string;
  permissoes: {
    podeExportar: boolean;
    podePersonalizar: boolean;
    podeVerFinanceiro: boolean;
    podeVerDadosSensiveis: boolean;
  };
  opcoes: {
    unidades: string[];
    projetos: string[];
    programas: string[];
    servicos: string[];
    profissionais: string[];
    tiposAtendimento: string[];
    statusBeneficiario: string[];
    bairros: string[];
    cidades: string[];
    territorios: string[];
  };
  cards: DashboardGerencialKpi[];
  evolucaoBeneficiarios: Array<{
    periodo: string;
    ativos: number;
    novos: number;
    desligados: number;
    reativados: number;
    acumulado: number;
  }>;
  atendimentos: {
    total: number;
    pessoasUnicas: number;
    taxaComparecimento: number;
    taxaAusencia: number;
    porStatus: DashboardGerencialBucket[];
    porTipo: DashboardGerencialBucket[];
    porDiaSemana: DashboardGerencialBucket[];
  };
  doacoes: {
    cestasEntregues: number;
    cestasAEntregar: number;
    cestasAtrasadas: number;
    porBairro: DashboardGerencialBucket[];
    porTipo: DashboardGerencialBucket[];
    planejadasPorPrioridade: DashboardGerencialBucket[];
  };
  cursos: {
    aulasRegistradas: number;
    presencas: number;
    ausencias: number;
    justificadas: number;
    taxaAusencia: number;
    porCurso: DashboardGerencialBucket[];
    porStatus: DashboardGerencialBucket[];
  };
  engajamento: Array<{
    frente: string;
    beneficiariosVinculados: number;
    atividades: number;
    atendimentos: number;
    frequenciaPercentual: number;
    taxaParticipacao: number;
    formula: string;
  }>;
  projetos: DashboardGerencialProjeto[];
  pendencias: DashboardGerencialPendencia[];
  eventos: DashboardGerencialEvento[];
  impactoSocial: DashboardGerencialBucket[];
  perfilBeneficiarios: {
    faixaEtaria: DashboardGerencialBucket[];
    sexo: DashboardGerencialBucket[];
    bairros: DashboardGerencialBucket[];
    cidades: DashboardGerencialBucket[];
    status: DashboardGerencialBucket[];
    idadePorBairro: DashboardGerencialMatrizFaixaEtariaBairro[];
  };
  riscoTerritorial: Array<{
    bairro: string;
    beneficiarios: number;
    cestasEntregues: number;
    cestasAEntregar: number;
    ausenciasCurso: number;
    criticidade: number;
  }>;
  analiseInteligente: Array<{
    id: string;
    titulo: string;
    descricao: string;
    indicador: string;
    periodo: string;
    regra: string;
    origem: string;
    rotaDetalhe?: string;
  }>;
  avisos: string[];
};

export type DashboardTop12 = {
  beneficiariosAtendidosPeriodo: number;
  familiasExtremaPobreza: number;
  rendaMediaFamiliar: number;
  cursosAtivos: number;
  taxaMediaOcupacaoCursos: number;
  certificadosEmitidos: number;
  doacoesPeriodo: number;
  itensDoadoResumo: Record<string, number>;
  visitasDomiciliares: number;
  termosVencendo: number;
  execucaoFinanceira: number;
  absenteismo: number;
};

export type DashboardAtendimento = {
  totalBeneficiarios: number;
  ativos: number;
  pendentes: number;
  bloqueados: number;
  emAnalise: number;
  desatualizados: number;
  cadastroCompletoPercentual: number;
  beneficiariosPeriodo: number;
  novosBeneficiarios: number;
  reincidentes: number;
  faixaEtaria: Record<string, number>;
  idades: Record<string, number>;
  vulnerabilidades: Record<string, number>;
  bairros: Record<string, number>;
};

export type DashboardFamilias = {
  total: number;
  mediaPessoas: number;
  rendaMediaFamiliar: number;
  rendaPerCapitaMedia: number;
  insegurancaAlimentar: Record<string, number>;
  faixaRenda: Record<string, number>;
};

export type DashboardTermos = {
  ativos: number;
  valorTotal: number;
  alertas: {
    numero: string;
    vigenciaFim: string | null;
    status: string | null;
  }[];
};

export type DashboardCadastros = {
  beneficiarios: number;
  profissionais: number;
  voluntarios: number;
  familias: number;
  bensPatrimonio: number;
  itensAlmoxarifado: number;
  livrosDisponiveis: number;
  veiculos: number;
};

export type DashboardFinanceiroConta = {
  id: string;
  nome: string;
  banco?: string | null;
  numero?: string | null;
  tipo?: string | null;
  categoria: "Caixa" | "Banco";
  saldo: number;
};

export type DashboardAssistenciaResponse = {
  filters: {
    startDate: string | null;
    endDate: string | null;
  };
  cadastros: DashboardCadastros;
  top12: DashboardTop12;
  atendimento: DashboardAtendimento;
  familias: DashboardFamilias;
  termos: DashboardTermos;
  financeiro: {
    valoresAReceber: number;
    valoresEmCaixa: number;
    valoresEmBanco: number;
    contas: DashboardFinanceiroConta[];
  };
};

export type DashboardVulnerabilidadePoint = {
  id: string;
  camada: string;
  titulo: string;
  subtitulo?: string;
  bairro?: string;
  cidade?: string;
  latitude?: number;
  longitude?: number;
  dataReferencia?: string;
};

export type DashboardVulnerabilidadeLayer = {
  total: number;
  geolocalizados: number;
  pendentesGeolocalizacao: number;
  pontos: DashboardVulnerabilidadePoint[];
};

export type DashboardVulnerabilidadeResponse = {
  unidadePrincipal: {
    id: string;
    nome: string;
    cidade?: string;
    estado?: string;
    latitude?: number;
    longitude?: number;
    raioMetros?: number;
  } | null;
  camadas: {
    cestaBasica: DashboardVulnerabilidadeLayer;
    familiasCadastradas: DashboardVulnerabilidadeLayer;
    situacaoViolencia: DashboardVulnerabilidadeLayer;
  };
  sugestoes: Array<{
    id: string;
    titulo: string;
    descricao: string;
  }>;
};

export type DashboardVulnerabilidadeGeocodingResponse = {
  processados: number;
  atualizados: number;
  naoEncontrados: number;
  restanteEstimado: number;
};
