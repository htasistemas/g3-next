export const registroPontoOcorrenciaTipos = [
  "AJUSTE_MANUAL",
  "ATRASO",
  "FALTA",
  "HORA_EXTRA",
  "BANCO_HORAS",
  "ESQUECIMENTO_BATIDA",
  "INCONSISTENCIA_SEQUENCIA",
  "CORRECAO_ADMINISTRATIVA",
  "OBSERVACAO_OPERACIONAL"
] as const;

export type RegistroPontoOcorrenciaTipo = (typeof registroPontoOcorrenciaTipos)[number];

export type RegistroPontoFilters = {
  data_inicial?: string;
  data_final?: string;
  usuario_id?: string;
  status?: "COMPLETO" | "INCOMPLETO";
  ocorrencia?: string;
  unidade?: string;
  somente_alterados?: boolean;
  somente_inconsistencias?: boolean;
};

export type RegistroPontoMarcarInput = {
  latitude?: number;
  longitude?: number;
  accuracy_metros?: number;
  origem_manual?: string;
  validar_localizacao?: boolean;
};

export type RegistroPontoAjusteInput = {
  entrada_1?: string;
  saida_1?: string;
  entrada_2?: string;
  saida_2?: string;
  observacoes?: string;
  justificativa: string;
  observacao: string;
};

export type RegistroPontoOcorrenciaInput = {
  tipo: RegistroPontoOcorrenciaTipo;
  descricao?: string;
};

export type RegistroPontoAtor = {
  id?: bigint;
  nome_usuario: string;
  permissoes: string[];
};

export type RegistroPontoOrigem = {
  ip?: string;
  user_agent?: string;
  latitude?: number;
  longitude?: number;
  accuracy_metros?: number;
  origem_manual?: string;
};

export type RegistroPontoListaItem = {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_login: string;
  unidade?: string;
  data: string;
  entrada_1?: string;
  saida_1?: string;
  entrada_2?: string;
  saida_2?: string;
  horas_extras_minutos: number;
  banco_horas_minutos: number;
  faltas_minutos: number;
  atrasos_minutos: number;
  observacoes?: string;
  ocorrencias: string[];
  alterado_manualmente: boolean;
  status: "COMPLETO" | "INCOMPLETO";
  proxima_batida?: string;
  total_trabalhado_minutos: number;
  criado_em: string;
  atualizado_em: string;
};

export type RegistroPontoEspelhoResponse = {
  registros: RegistroPontoListaItem[];
  totais: {
    horas_extras_minutos: number;
    banco_horas_minutos: number;
    faltas_minutos: number;
    atrasos_minutos: number;
    total_trabalhado_minutos: number;
    total_dias: number;
    total_ajustes: number;
  };
};

export type RegistroPontoHistoricoItem = {
  id: string;
  acao: string;
  usuario_id?: string;
  usuario_nome?: string;
  justificativa?: string;
  observacao?: string;
  ip_origem?: string;
  dados_antes?: Record<string, unknown>;
  dados_depois?: Record<string, unknown>;
  criado_em: string;
};

export type RegistroPontoHistoricoResponse = {
  registro_id: string;
  historico: RegistroPontoHistoricoItem[];
  ocorrencias: Array<{
    id: string;
    tipo: RegistroPontoOcorrenciaTipo;
    descricao?: string;
    origem: string;
    criado_por_nome?: string;
    criado_em: string;
  }>;
};

export type RegistroPontoUsuarioCatalogoItem = {
  id: string;
  nome: string;
  login: string;
  unidade?: string;
};

export type RegistroPontoStatusBatida = {
  registro: RegistroPontoListaItem;
  mensagem: string;
  bloqueado?: boolean;
};
