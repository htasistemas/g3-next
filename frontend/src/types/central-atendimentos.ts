export type CentralBuscaBeneficiarioFiltro = {
  busca?: string;
  bairro?: string;
  situacao_cadastral?: string;
  faixa_etaria?: string;
  sexo?: string;
  familia_vinculada?: boolean;
  ultimo_atendimento?: string;
  com_beneficio_no_mes?: boolean;
  sem_atendimento_recente?: boolean;
};

export type CentralRelatorioTipo = "individual" | "familiar" | "financeiro-social" | "social";

export type CentralAtendimentoForm = {
  data_hora: string;
  tipo_atendimento: string;
  setor: string;
  profissional_responsavel: string;
  prioridade?: string;
  status?: string;
  classificacao?: string;
  necessidade_identificada?: string;
  resumo: string;
  observacoes?: string;
  retorno_previsto?: string;
};

export type CentralBeneficioForm = {
  data: string;
  tipo: string;
  item: string;
  quantidade?: number;
  valor_unitario?: number;
  valor_total?: number;
  origem_recurso?: string;
  projeto_programa?: string;
  profissional_responsavel: string;
  observacoes?: string;
  ciente_alertas?: boolean;
};

export type CentralEncaminhamentoForm = {
  data: string;
  tipo: string;
  destino: string;
  profissional: string;
  motivo: string;
  retorno_esperado?: string;
  status?: string;
  observacoes?: string;
};

export type CentralBeneficiarioBuscaItem = {
  id: string;
  codigo?: string;
  nomeCompleto: string;
  dataNascimento?: string;
  idade?: number;
  sexo?: string;
  telefone?: string;
  cpf?: string;
  bairro?: string;
  familiaId?: string;
  familiaNome?: string;
  situacaoCadastral?: string;
  ultimoAtendimento?: string;
};

export type CentralAtendimento = {
  id: string;
  dataHora: string;
  tipoAtendimento: string;
  setor: string;
  profissionalResponsavel: string;
  prioridade?: string;
  status?: string;
  classificacao?: string;
  necessidadeIdentificada?: string;
  resumo: string;
  observacoes?: string;
  retornoPrevisto?: string;
};

export type CentralBeneficio = {
  origem?: string;
  id: string;
  data?: string;
  tipo: string;
  item: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
  origemRecurso?: string;
  projetoPrograma?: string;
  profissionalResponsavel?: string;
  observacoes?: string;
  cienteAlertas?: boolean;
};

export type CentralEncaminhamento = {
  id: string;
  data?: string;
  tipo: string;
  destino: string;
  profissional: string;
  motivo: string;
  retornoEsperado?: string;
  status?: string;
  observacoes?: string;
};

export type CentralInscricao = {
  id: string;
  nome: string;
  tipo?: string;
  dataInicio?: string;
  dataFinal?: string;
  situacao?: string;
  responsavel?: string;
  local?: string;
  dataInscricao?: string;
};

export type CentralHistoricoItem = {
  id: string;
  data?: string;
  categoria: string;
  titulo: string;
  descricao?: string;
  profissional?: string;
};

export type CentralAlerta = {
  prioridade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
};

export type CentralGrupoFamiliar = {
  id: string;
  nome: string;
  responsavelFamiliar?: string;
  enderecoPrincipal?: string;
  situacaoFamiliar?: string;
  status?: string;
  membros: Array<{
    id: string;
    codigo?: string;
    nomeCompleto: string;
    parentesco?: string;
    responsavelFamiliar?: boolean;
    situacaoCadastral?: string;
    telefone?: string;
  }>;
  custoMes?: number;
  custoAno?: number;
  custoHistorico?: number;
  alertas?: string[];
};

export type CentralCustos = {
  beneficiario: { mes: number; ano: number; total: number };
  familia: { mes: number; ano: number; total: number };
  porTipo: Array<{ nome: string; valor: number }>;
  porItem: Array<{ nome: string; valor: number }>;
  evolucaoMensal: Array<{ mes: string; valor: number }>;
  detalhamento: Array<{ data?: string; tipo: string; item: string; valorTotal: number }>;
};

export type CentralVisaoGeral = {
  beneficiario: {
    id: string;
    codigo?: string;
    nomeCompleto: string;
    cpf?: string;
    dataNascimento?: string;
    idade?: number;
    sexo?: string;
    telefone?: string;
    email?: string;
    foto3x4?: string;
    endereco?: string;
    bairro?: string;
    familiaId?: string;
    familiaNome?: string;
    responsavelFamiliar?: string;
    situacaoCadastral?: string;
    ultimoAtendimento?: string;
  };
  indicadores: {
    ultimoAtendimento?: string;
    proximoAtendimento?: string;
    beneficiosRecebidosMes: number;
    cestaBasicaMes: number;
    atendimentosMes: number;
    beneficiosAno: number;
    cursosAtivos: number;
    custoMes: number;
    custoAno: number;
    custoHistorico: number;
    alertasAtivos: number;
  };
  alertas: CentralAlerta[];
  atendimentos: CentralAtendimento[];
  beneficios: CentralBeneficio[];
  inscricoes: CentralInscricao[];
  encaminhamentos: CentralEncaminhamento[];
  historico: CentralHistoricoItem[];
  custos: CentralCustos;
  grupoFamiliar: CentralGrupoFamiliar | null;
};
