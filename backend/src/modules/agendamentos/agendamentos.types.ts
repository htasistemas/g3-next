export type AgendamentoStatus =
  | "Agendado"
  | "Confirmado"
  | "Em espera"
  | "Encaixe"
  | "Em atendimento"
  | "Atendido"
  | "Faltou"
  | "Cancelado"
  | "Remarcado"
  | "Encaminhado"
  | "Retorno pendente"
  | "Alta"
  | "Atendimento coletivo"
  | "Urgencia";

export type AgendamentoModalidade =
  | "Presencial"
  | "Remoto"
  | "Domiciliar"
  | "Externo"
  | "Coletivo";

export type AgendamentoPrioridade = "Normal" | "Media" | "Alta" | "Urgencia";
export type AgendamentoOperacionalTipo = "curso" | "atendimento" | "oficina";

export type AgendamentoInput = {
  id?: string;
  beneficiarioId?: number | null;
  familiaId?: number | null;
  inscricaoOrigemId?: string | null;
  beneficiarioNome: string;
  familiaNome?: string | null;
  responsavelNome?: string | null;
  telefone?: string | null;
  email?: string | null;
  formaContatoPreferencial?: string | null;
  observacoesImportantes?: string | null;
  restricoesAlerta?: string | null;
  necessidadeEspecial?: string | null;
  transporteApoio?: string | null;
  unidade: string;
  setor: string;
  tipoAtendimento: string;
  subcategoria?: string | null;
  profissionalId?: string | null;
  profissionalNome?: string | null;
  equipeApoio?: string[] | null;
  data: string;
  horaInicial: string;
  horaFinal?: string | null;
  duracaoMinutos?: number | null;
  sala?: string | null;
  recurso?: string | null;
  modalidade: AgendamentoModalidade;
  origemAtendimento?: string | null;
  prioridade: AgendamentoPrioridade;
  status?: AgendamentoStatus;
  motivo?: string | null;
  objetivo?: string | null;
  observacaoInterna?: string | null;
  observacaoCurta?: string | null;
  coletivo?: boolean;
  tituloColetivo?: string | null;
  capacidadeMaxima?: number | null;
  participantes?: AgendamentoParticipanteInput[] | null;
  recorrencia?: {
    frequencia?: "Semanal" | "Quinzenal" | "Mensal" | "Personalizada";
    repeticoes?: number;
    intervaloDias?: number | null;
  } | null;
  retornoProgramadoPara?: string | null;
  encaminhamentoOrigem?: string | null;
  primeiraVez?: boolean;
  retorno?: boolean;
  urgencia?: boolean;
  documentosPendentes?: boolean;
  autorizacaoPendente?: boolean;
  permitirConflito?: boolean;
  itemTipo?: AgendamentoOperacionalTipo | null;
  itemOrigemId?: number | null;
  itemNome?: string | null;
  itemDiasSemana?: string | null;
  itemLocal?: string | null;
  diaSemana?: string | null;
};

export type AgendamentoOperacionalInput = {
  id?: string;
  tipo: AgendamentoOperacionalTipo;
  itemId: number;
  data: string;
  beneficiariosIds?: number[];
  matriculasIds?: number[];
};

export type AgendamentoOperacionalItemRow = {
  id: bigint;
  tipo: string | null;
  nome: string;
  profissional: string | null;
  horario_inicial: string | null;
  duracao_horas: number | null;
  dias_semana: string | null;
  sala_nome: string | null;
  instituicao_parceira: string | null;
  status: string | null;
};

export type AgendamentoOperacionalBeneficiarioRow = {
  matricula_id: bigint;
  beneficiario_id: bigint | null;
  beneficiario_nome: string;
  telefone: string | null;
  email: string | null;
  status: string | null;
  cpf: string | null;
  profissional_nome: string | null;
};

export type AgendamentoBeneficiarioRow = {
  id: bigint;
  agendamento_id: bigint;
  beneficiario_id: bigint | null;
  beneficiario_nome: string;
  data_nascimento: Date | null;
  telefone: string | null;
  email: string | null;
  status: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type AgendamentoEnvioCanal = "WHATSAPP" | "EMAIL";

export type AgendamentoParticipanteInput = {
  matriculaId?: number | null;
  beneficiarioId?: number | null;
  beneficiarioNome: string;
  telefone?: string | null;
  comparecimento?: "Pendente" | "Presente" | "Faltou" | "Justificado";
  observacao?: string | null;
};

export type AgendamentoListaEsperaInput = {
  beneficiarioId?: number | null;
  beneficiarioNome: string;
  familiaId?: number | null;
  familiaNome?: string | null;
  unidade?: string | null;
  setor?: string | null;
  tipoAtendimento: string;
  profissionalPreferencial?: string | null;
  faixaHorarioPreferida?: string | null;
  prioridade?: AgendamentoPrioridade;
  motivo?: string | null;
  observacao?: string | null;
  dataEntrada?: string | null;
  encaixeAutomatico?: boolean;
};

export type AgendamentoCheckInInput = {
  statusChegada: "Aguardando" | "Chegou" | "Em triagem" | "Em atendimento" | "Finalizado" | "Nao compareceu" | "Cancelado na recepcao" | "Reagendado";
  horarioChegada?: string | null;
  horarioInicio?: string | null;
  horarioFim?: string | null;
  observacao?: string | null;
};

export type AgendamentoConclusaoInput = {
  resumo: string;
  desfecho?: string | null;
  comparecimento?: "Presente" | "Faltou" | "Justificado";
  retornoGeradoPara?: string | null;
  encaminhamentoInterno?: string | null;
  encaminhamentoExterno?: string | null;
  observacaoImportante?: string | null;
  custoAtendimento?: number | null;
};

export type AgendamentoRemarcacaoInput = {
  data: string;
  horaInicial: string;
  horaFinal?: string | null;
  profissionalNome?: string | null;
  sala?: string | null;
  recurso?: string | null;
  permitirConflito?: boolean;
  motivo?: string | null;
};

export type AgendamentoFiltros = {
  busca?: string;
  unidade?: string;
  setor?: string;
  profissional?: string;
  tipoAtendimento?: string;
  beneficiario?: string;
  beneficiarioId?: string;
  familia?: string;
  status?: string;
  periodoInicio?: string;
  periodoFim?: string;
  sala?: string;
  recurso?: string;
  prioridade?: string;
  modalidade?: string;
  visualizacao?: string;
};

export type AgendamentoRow = {
  id: bigint;
  beneficiario_id: bigint | null;
  familia_id: bigint | null;
  inscricao_origem_id: bigint | null;
  beneficiario_nome: string;
  familia_nome: string | null;
  responsavel_nome: string | null;
  telefone: string | null;
  email: string | null;
  forma_contato_preferencial: string | null;
  observacoes_importantes: string | null;
  restricoes_alerta: string | null;
  necessidade_especial: string | null;
  transporte_apoio: string | null;
  unidade: string;
  setor: string;
  tipo_atendimento: string;
  subcategoria: string | null;
  profissional_id: string | null;
  profissional_nome: string | null;
  equipe_apoio: unknown;
  data_agendamento: Date | string;
  hora_inicial: string;
  hora_final: string | null;
  duracao_minutos: number | null;
  sala: string | null;
  recurso: string | null;
  modalidade: string;
  origem_atendimento: string | null;
  prioridade: string;
  status: string;
  motivo: string | null;
  objetivo: string | null;
  observacao_interna: string | null;
  observacao_curta: string | null;
  coletivo: boolean;
  titulo_coletivo: string | null;
  capacidade_maxima: number | null;
  recorrencia: unknown;
  retorno_programado_para: Date | string | null;
  encaminhamento_origem: string | null;
  primeira_vez: boolean;
  retorno: boolean;
  urgencia: boolean;
  documentos_pendentes: boolean;
  autorizacao_pendente: boolean;
  item_tipo: string | null;
  item_origem_id: bigint | null;
  item_nome: string | null;
  item_dias_semana: string | null;
  item_local: string | null;
  dia_semana: string | null;
  confirmacao_canal: string | null;
  confirmado_em: Date | null;
  confirmado_por_nome: string | null;
  observacao_confirmacao: string | null;
  status_chegada: string | null;
  horario_chegada_real: string | null;
  horario_inicio_real: string | null;
  horario_fim_real: string | null;
  concluido_resumo: string | null;
  desfecho: string | null;
  comparecimento: string | null;
  encaminhamento_interno: string | null;
  encaminhamento_externo: string | null;
  custo_atendimento: number | null;
  central_atendimento_id: bigint | null;
  participantes: unknown;
  criado_por_usuario_id: bigint | null;
  criado_por_nome: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type AgendamentoListaEsperaRow = {
  id: bigint;
  beneficiario_id: bigint | null;
  beneficiario_nome: string;
  familia_id: bigint | null;
  familia_nome: string | null;
  unidade: string | null;
  setor: string | null;
  tipo_atendimento: string;
  profissional_preferencial: string | null;
  faixa_horario_preferida: string | null;
  prioridade: string | null;
  motivo: string | null;
  observacao: string | null;
  data_entrada: Date | string;
  encaixe_automatico: boolean;
  convertido_agendamento_id: bigint | null;
  criado_em: Date;
  atualizado_em: Date;
};
