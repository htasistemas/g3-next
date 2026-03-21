export type CentralAtendimentosBuscaFilters = {
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

export type CentralAtendimentoInput = {
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

export type CentralBeneficioInput = {
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

export type CentralEncaminhamentoInput = {
  data: string;
  tipo: string;
  destino: string;
  profissional: string;
  motivo: string;
  retorno_esperado?: string;
  status?: string;
  observacoes?: string;
};

export type CentralRelatorioTipo =
  | "individual"
  | "familiar"
  | "financeiro-social"
  | "social";
