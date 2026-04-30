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
  usuario_login: string;
  senha: string;
  face_imagem?: string;
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
  modo_confirmacao?: "senha" | "face";
  usuario_login?: string;
  senha?: string;
  face_imagem?: string;
};

export type RegistroPontoOcorrenciaInput = {
  tipo: RegistroPontoOcorrenciaTipo;
  descricao?: string;
};

export type RegistroPontoHorarioUsuarioInput = {
  horario_entrada_1?: string;
  horario_saida_1?: string;
  horario_entrada_2?: string;
  horario_saida_2?: string;
};

export type RegistroPontoAtor = {
  id?: bigint;
  nome_usuario: string;
  tenant_id: string;
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

export type RegistroPontoHorarioUsuario = {
  horario_entrada_1?: string;
  horario_saida_1?: string;
  horario_entrada_2?: string;
  horario_saida_2?: string;
  jornada_configurada: boolean;
};

export type RegistroPontoAlertaPendencia = {
  exibir_alerta: boolean;
  data_referencia?: string;
  campo?: "entrada_1" | "saida_1" | "entrada_2" | "saida_2";
  rotulo_batida?: string;
  horario_previsto?: string;
  mensagem?: string;
};
