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

export const registroPontoHoraExtraStatusTipos = [
  "SEM_EXTRA",
  "EXTRA_PENDENTE_AUTORIZACAO",
  "EXTRA_AUTORIZADA",
  "EXTRA_NEGADA",
  "EXTRA_COMPENSADA_BANCO",
  "EXTRA_PAGA_FOLHA"
] as const;

export type RegistroPontoHoraExtraStatus = (typeof registroPontoHoraExtraStatusTipos)[number];

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
  horas_extras_pendentes_minutos: number;
  horas_extras_autorizadas_minutos: number;
  horas_extras_negadas_minutos: number;
  horas_extras_compensadas_minutos: number;
  horas_extras_pagas_minutos: number;
  banco_horas_minutos: number;
  faltas_minutos: number;
  atrasos_minutos: number;
  observacoes?: string;
  ocorrencias: string[];
  ocorrencias_descricao?: string[];
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
    horas_extras_pendentes_minutos: number;
    horas_extras_autorizadas_minutos: number;
    horas_extras_negadas_minutos: number;
    horas_extras_compensadas_minutos: number;
    horas_extras_pagas_minutos: number;
    banco_horas_minutos: number;
    faltas_minutos: number;
    atrasos_minutos: number;
    total_trabalhado_minutos: number;
    total_dias: number;
    total_ajustes: number;
  };
  periodo: {
    data_inicial?: string | null;
    data_final?: string | null;
    fechado: boolean;
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

export type RegistroPontoHoraExtraPendencia = {
  id: string;
  status: RegistroPontoHoraExtraStatus;
  campo_batida: "entrada_1" | "saida_1" | "entrada_2" | "saida_2";
  horario_previsto: string;
  horario_real: string;
  minutos_excedentes: number;
  tolerancia_minutos: number;
  limite_diario_minutos: number;
  ciencia_obrigatoria: boolean;
  justificativa_obrigatoria: boolean;
  mensagem: string;
  mensagem_ciencia?: string;
};

export type RegistroPontoStatusBatida = {
  registro: RegistroPontoListaItem;
  mensagem: string;
  bloqueado?: boolean;
  pendencia_hora_extra?: RegistroPontoHoraExtraPendencia;
};

export type RegistroPontoHoraExtraConfiguracao = {
  tolerancia_entrada_antecipada_minutos: number;
  exigir_autorizacao_hora_extra_antecipada: boolean;
  limite_hora_extra_diaria_minutos: number;
  permitir_solicitacao_hora_extra_pelo_funcionario: boolean;
  mensagem_ciencia_hora_extra: string;
};

export type RegistroPontoHoraExtraItem = {
  id: string;
  registro_ponto_id: string;
  registro_ponto_batida_id: string;
  usuario_id: string;
  usuario_nome?: string;
  usuario_login?: string;
  unidade?: string;
  setor?: string;
  data_referencia: string;
  campo_batida: "entrada_1" | "saida_1" | "entrada_2" | "saida_2";
  horario_previsto: string;
  horario_real: string;
  minutos_excedentes: number;
  status: RegistroPontoHoraExtraStatus;
  justificativa_funcionario?: string;
  ciencia_registrada: boolean;
  ciencia_em?: string;
  ciencia_usuario_nome?: string;
  gestor_id?: string;
  gestor_nome?: string;
  gestor_justificativa?: string;
  minutos_aprovados: number;
  minutos_negados: number;
  criado_em: string;
  atualizado_em: string;
};

export type RegistroPontoHoraExtraResumo = {
  total_pendentes_minutos: number;
  total_autorizadas_minutos: number;
  total_negadas_minutos: number;
  total_compensadas_minutos: number;
  total_pagas_minutos: number;
  saldo_banco_horas_aprovado_minutos: number;
};

export type RegistroPontoHoraExtraFiltro = {
  funcionario?: string;
  data_inicial?: string;
  data_final?: string;
  setor?: string;
  status?: RegistroPontoHoraExtraStatus | "TODOS";
  tenant_id?: string;
};

export type RegistroPontoHoraExtraDecisaoInput = {
  justificativa: string;
  minutos_aprovados?: number;
  minutos_negados?: number;
};

export type RegistroPontoHoraExtraCienciaInput = {
  justificativa_funcionario: string;
  ciencia_registrada: boolean;
};

export type RegistroPontoRelatorioMensalFiltro = {
  data_inicial?: string;
  data_final?: string;
  usuario_id?: string;
  funcionario?: string;
  setor?: string;
};

export type RegistroPontoRelatorioMensalItem = {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_login: string;
  unidade?: string;
  setor?: string;
  data_referencia: string;
  jornada_prevista?: string;
  batidas_reais: string[];
  entradas_antecipadas: Array<{
    campo_batida: "entrada_1" | "saida_1" | "entrada_2" | "saida_2";
    horario_previsto: string;
    horario_real: string;
    minutos_excedentes: number;
    status: RegistroPontoHoraExtraStatus;
    justificativa_funcionario?: string;
    ciencia_registrada: boolean;
    gestor_nome?: string;
    gestor_justificativa?: string;
  }>;
  horas_extras_pendentes_minutos: number;
  horas_extras_aprovadas_minutos: number;
  horas_extras_negadas_minutos: number;
  saldo_banco_horas_aprovado_minutos: number;
  justificativas: string[];
  ciencia_funcionario: boolean;
  aprovacao_gestor_rh: boolean;
};

export type RegistroPontoRelatorioMensalResponse = {
  registros: RegistroPontoRelatorioMensalItem[];
  totais: {
    funcionarios: number;
    horas_extras_pendentes_minutos: number;
    horas_extras_aprovadas_minutos: number;
    horas_extras_negadas_minutos: number;
    saldo_banco_horas_aprovado_minutos: number;
  };
};
