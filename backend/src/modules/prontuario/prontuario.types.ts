export type ProntuarioStatus = "RASCUNHO" | "EM_ATENDIMENTO" | "FINALIZADO" | "CANCELADO";

export type ProntuarioAtendimentoInput = {
  especialidade: string;
  tipo_atendimento: string;
  data_atendimento?: string;
  hora_inicio?: string;
  hora_fim?: string;
  status?: ProntuarioStatus;
  motivo?: string;
  demanda_principal?: string;
  avaliacao?: string;
  evolucao?: string;
  intervencoes?: string[];
  conduta?: string;
  retorno_data?: string;
  observacoes?: string;
  campos_especificos?: Record<string, unknown>;
  restrito?: boolean;
  profissional_id?: string;
  unidade_id?: string;
};

export type ProntuarioAdendoInput = {
  conteudo: string;
  motivo?: string;
};
