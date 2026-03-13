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
