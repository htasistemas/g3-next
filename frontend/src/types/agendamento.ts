export type AgendamentoPrioridade = "Normal" | "Media" | "Alta" | "Urgencia";
export type AgendamentoModalidade = "Presencial" | "Remoto" | "Domiciliar" | "Externo" | "Coletivo";

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

export type AgendamentoParticipante = {
  beneficiarioId?: number;
  beneficiarioNome: string;
  telefone?: string;
  comparecimento?: "Pendente" | "Presente" | "Faltou" | "Justificado";
  observacao?: string;
};

export type Agendamento = {
  id?: number;
  beneficiarioId?: number;
  familiaId?: number;
  inscricaoOrigemId?: string;
  beneficiarioNome: string;
  familiaNome?: string;
  responsavelNome?: string;
  telefone?: string;
  email?: string;
  formaContatoPreferencial?: string;
  observacoesImportantes?: string;
  restricoesAlerta?: string;
  necessidadeEspecial?: string;
  transporteApoio?: string;
  unidade: string;
  setor: string;
  tipoAtendimento: string;
  subcategoria?: string;
  profissionalId?: string;
  profissionalNome?: string;
  equipeApoio?: string[];
  data: string;
  horaInicial: string;
  horaFinal?: string;
  duracaoMinutos?: number;
  sala?: string;
  recurso?: string;
  modalidade: AgendamentoModalidade;
  origemAtendimento?: string;
  prioridade: AgendamentoPrioridade;
  status?: AgendamentoStatus;
  motivo?: string;
  objetivo?: string;
  observacaoInterna?: string;
  observacaoCurta?: string;
  coletivo?: boolean;
  tituloColetivo?: string;
  capacidadeMaxima?: number;
  participantes?: AgendamentoParticipante[];
  recorrencia?: {
    frequencia?: "Semanal" | "Quinzenal" | "Mensal" | "Personalizada";
    repeticoes?: number;
    intervaloDias?: number | null;
  };
  retornoProgramadoPara?: string;
  encaminhamentoOrigem?: string;
  primeiraVez?: boolean;
  retorno?: boolean;
  urgencia?: boolean;
  documentosPendentes?: boolean;
  autorizacaoPendente?: boolean;
  permitirConflito?: boolean;
  confirmacaoCanal?: string;
  confirmadoEm?: string;
  confirmadoPorNome?: string;
  observacaoConfirmacao?: string;
  statusChegada?: string;
  horarioChegadaReal?: string;
  horarioInicioReal?: string;
  horarioFimReal?: string;
  concluidoResumo?: string;
  desfecho?: string;
  comparecimento?: string;
  encaminhamentoInterno?: string;
  encaminhamentoExterno?: string;
  custoAtendimento?: number;
  centralAtendimentoId?: number;
  criadoPorNome?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type AgendamentoListaEspera = {
  id?: number;
  beneficiarioId?: number;
  beneficiarioNome: string;
  familiaId?: number;
  familiaNome?: string;
  unidade?: string;
  setor?: string;
  tipoAtendimento: string;
  profissionalPreferencial?: string;
  faixaHorarioPreferida?: string;
  prioridade?: AgendamentoPrioridade;
  motivo?: string;
  observacao?: string;
  dataEntrada?: string;
  encaixeAutomatico?: boolean;
  convertidoAgendamentoId?: number;
};

export type AgendamentoFiltros = {
  busca?: string;
  unidade?: string;
  setor?: string;
  profissional?: string;
  tipoAtendimento?: string;
  beneficiario?: string;
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
