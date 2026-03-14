export type RegistroPontoOcorrenciaTipo =
  | "AJUSTE_MANUAL"
  | "ATRASO"
  | "FALTA"
  | "HORA_EXTRA"
  | "BANCO_HORAS"
  | "ESQUECIMENTO_BATIDA"
  | "INCONSISTENCIA_SEQUENCIA"
  | "CORRECAO_ADMINISTRATIVA"
  | "OBSERVACAO_OPERACIONAL";

export type RegistroPontoStatus = "COMPLETO" | "INCOMPLETO";

export type RegistroPontoItem = {
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
  status: RegistroPontoStatus;
  proxima_batida?: string;
  total_trabalhado_minutos: number;
  criado_em: string;
  atualizado_em: string;
};

export type RegistroPontoListaResponse = {
  registros: RegistroPontoItem[];
};

export type RegistroPontoEspelhoResponse = {
  registros: RegistroPontoItem[];
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

export type RegistroPontoFiltro = {
  data_inicial?: string;
  data_final?: string;
  usuario_id?: string;
  status?: RegistroPontoStatus;
  ocorrencia?: string;
  unidade?: string;
  somente_alterados?: boolean;
  somente_inconsistencias?: boolean;
};

export type RegistroPontoMarcarPayload = {
  usuario_login: string;
  senha: string;
  latitude?: number;
  longitude?: number;
  accuracy_metros?: number;
  origem_manual?: string;
  validar_localizacao?: boolean;
};

export type RegistroPontoMarcarResponse = {
  registro: RegistroPontoItem;
  mensagem: string;
  bloqueado?: boolean;
};

export type RegistroPontoAjustePayload = {
  entrada_1?: string;
  saida_1?: string;
  entrada_2?: string;
  saida_2?: string;
  observacoes?: string;
  justificativa: string;
  observacao: string;
};

export type RegistroPontoOcorrenciaPayload = {
  tipo: RegistroPontoOcorrenciaTipo;
  descricao?: string;
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

export type RegistroPontoHistoricoOcorrencia = {
  id: string;
  tipo: RegistroPontoOcorrenciaTipo;
  descricao?: string;
  origem: string;
  criado_por_nome?: string;
  criado_em: string;
};

export type RegistroPontoHistoricoResponse = {
  registro_id: string;
  historico: RegistroPontoHistoricoItem[];
  ocorrencias: RegistroPontoHistoricoOcorrencia[];
};

export type RegistroPontoUsuarioCatalogoItem = {
  id: string;
  nome: string;
  login: string;
  unidade?: string;
};

export type RegistroPontoHorarioTrabalho = {
  horario_entrada_1?: string;
  horario_saida_1?: string;
  horario_entrada_2?: string;
  horario_saida_2?: string;
  jornada_configurada: boolean;
};

export type RegistroPontoHorarioTrabalhoPayload = {
  horario_entrada_1?: string;
  horario_saida_1?: string;
  horario_entrada_2?: string;
  horario_saida_2?: string;
};

export type RegistroPontoAlertaPendente = {
  exibir_alerta: boolean;
  data_referencia?: string;
  campo?: "entrada_1" | "saida_1" | "entrada_2" | "saida_2";
  rotulo_batida?: string;
  horario_previsto?: string;
  mensagem?: string;
};
