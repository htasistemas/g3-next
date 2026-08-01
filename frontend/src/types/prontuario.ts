export type ProntuarioStatus = "RASCUNHO" | "EM_ATENDIMENTO" | "FINALIZADO" | "CANCELADO";

export type ProntuarioBeneficiario = {
  id: string;
  codigo?: string;
  nome_completo: string;
  nome_social?: string;
  nome_mae?: string;
  data_nascimento?: string;
  bairro?: string;
  cpf?: string;
  telefone?: string;
  foto?: string;
  unidade_assistencial?: string;
  cid_principal?: string;
  descricao_medicacao?: string;
  ultimo_atendimento?: string;
};

export type ProntuarioAtendimento = {
  id: string;
  prontuario_id: string;
  profissional_nome?: string;
  profissional_categoria?: string;
  especialidade: string;
  tipo_atendimento: string;
  data_atendimento: string;
  hora_inicio?: string;
  hora_fim?: string;
  duracao_minutos?: number;
  status: ProntuarioStatus;
  motivo?: string;
  demanda_principal?: string;
  avaliacao?: string;
  evolucao?: string;
  intervencoes: string[];
  conduta?: string;
  retorno_data?: string;
  observacoes?: string;
  campos_especificos?: Record<string, unknown>;
  restrito: boolean;
  finalizado_em?: string;
  adendos?: Array<{ id: string; conteudo: string; motivo?: string; criado_em: string; usuario_nome?: string }>;
};

export type ProntuarioContexto = {
  beneficiario: ProntuarioBeneficiario;
  atendimentos: ProntuarioAtendimento[];
  rascunho: ProntuarioAtendimento | null;
};

export type ProntuarioAtendimentoForm = Omit<ProntuarioAtendimento, "id" | "prontuario_id" | "status" | "adendos" | "finalizado_em" | "duracao_minutos" | "profissional_nome" | "profissional_categoria" | "restrito"> & {
  status?: ProntuarioStatus;
  restrito?: boolean;
};
