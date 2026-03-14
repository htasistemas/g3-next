export type DashboardFiltros = {
  startDate?: string;
  endDate?: string;
};

export type DashboardTermoAlerta = {
  numero: string;
  vigenciaFim: string | null;
  status: string | null;
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
  cadastros: {
    beneficiarios: number;
    profissionais: number;
    voluntarios: number;
    familias: number;
    bensPatrimonio: number;
    itensAlmoxarifado: number;
    livrosDisponiveis: number;
    veiculos: number;
  };
  top12: {
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
  atendimento: {
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
  familias: {
    total: number;
    mediaPessoas: number;
    rendaMediaFamiliar: number;
    rendaPerCapitaMedia: number;
    insegurancaAlimentar: Record<string, number>;
    faixaRenda: Record<string, number>;
  };
  termos: {
    ativos: number;
    valorTotal: number;
    alertas: DashboardTermoAlerta[];
  };
  financeiro: {
    valoresAReceber: number;
    valoresEmCaixa: number;
    valoresEmBanco: number;
    contas: DashboardFinanceiroConta[];
  };
};
