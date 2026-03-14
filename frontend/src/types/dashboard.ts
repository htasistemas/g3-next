export type DashboardFiltros = {
  startDate?: string;
  endDate?: string;
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
