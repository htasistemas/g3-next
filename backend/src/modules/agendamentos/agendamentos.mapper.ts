import type { AgendamentoListaEsperaRow, AgendamentoRow } from "./agendamentos.types.js";

function formatarDataIso(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatarHora(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) {
    const horas = String(value.getUTCHours()).padStart(2, "0");
    const minutos = String(value.getUTCMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
  }
  const texto = String(value);
  const match = texto.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : texto;
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mapAgendamentoRow(row: AgendamentoRow) {
  return {
    id: Number(row.id),
    beneficiarioId: row.beneficiario_id ? Number(row.beneficiario_id) : undefined,
    familiaId: row.familia_id ? Number(row.familia_id) : undefined,
    inscricaoOrigemId: row.inscricao_origem_id ? row.inscricao_origem_id.toString() : undefined,
    beneficiarioNome: row.beneficiario_nome,
    familiaNome: row.familia_nome ?? undefined,
    responsavelNome: row.responsavel_nome ?? undefined,
    telefone: row.telefone ?? undefined,
    email: row.email ?? undefined,
    formaContatoPreferencial: row.forma_contato_preferencial ?? undefined,
    observacoesImportantes: row.observacoes_importantes ?? undefined,
    restricoesAlerta: row.restricoes_alerta ?? undefined,
    necessidadeEspecial: row.necessidade_especial ?? undefined,
    transporteApoio: row.transporte_apoio ?? undefined,
    unidade: row.unidade,
    setor: row.setor,
    tipoAtendimento: row.tipo_atendimento,
    subcategoria: row.subcategoria ?? undefined,
    profissionalId: row.profissional_id ?? undefined,
    profissionalNome: row.profissional_nome ?? undefined,
    equipeApoio: asArray<string>(row.equipe_apoio),
    data: formatarDataIso(row.data_agendamento),
    horaInicial: formatarHora(row.hora_inicial),
    horaFinal: formatarHora(row.hora_final),
    duracaoMinutos: row.duracao_minutos ?? undefined,
    sala: row.sala ?? undefined,
    recurso: row.recurso ?? undefined,
    modalidade: row.modalidade,
    origemAtendimento: row.origem_atendimento ?? undefined,
    prioridade: row.prioridade,
    status: row.status,
    motivo: row.motivo ?? undefined,
    objetivo: row.objetivo ?? undefined,
    observacaoInterna: row.observacao_interna ?? undefined,
    observacaoCurta: row.observacao_curta ?? undefined,
    coletivo: row.coletivo,
    tituloColetivo: row.titulo_coletivo ?? undefined,
    capacidadeMaxima: row.capacidade_maxima ?? undefined,
    recorrencia: row.recorrencia && typeof row.recorrencia === "object" ? row.recorrencia : undefined,
    retornoProgramadoPara: formatarDataIso(row.retorno_programado_para),
    encaminhamentoOrigem: row.encaminhamento_origem ?? undefined,
    primeiraVez: row.primeira_vez,
    retorno: row.retorno,
    urgencia: row.urgencia,
    documentosPendentes: row.documentos_pendentes,
    autorizacaoPendente: row.autorizacao_pendente,
    itemTipo: row.item_tipo ?? undefined,
    itemOrigemId: row.item_origem_id ? Number(row.item_origem_id) : undefined,
    itemNome: row.item_nome ?? undefined,
    itemDiasSemana: row.item_dias_semana ?? undefined,
    itemLocal: row.item_local ?? undefined,
    diaSemana: row.dia_semana ?? undefined,
    agendaPaiId: row.agenda_pai_id ? Number(row.agenda_pai_id) : undefined,
    agendaHorarioId: row.agenda_horario_id ? Number(row.agenda_horario_id) : undefined,
    formaAgendamento: row.forma_agendamento ?? undefined,
    horarioIndividual: formatarHora(row.horario_individual),
    agendaPrincipal: row.agenda_principal ?? false,
    horarios: row.horarios ?? [],
    confirmacaoCanal: row.confirmacao_canal ?? undefined,
    confirmadoEm: row.confirmado_em?.toISOString(),
    confirmadoPorNome: row.confirmado_por_nome ?? undefined,
    observacaoConfirmacao: row.observacao_confirmacao ?? undefined,
    statusChegada: row.status_chegada ?? undefined,
    horarioChegadaReal: formatarHora(row.horario_chegada_real),
    horarioInicioReal: formatarHora(row.horario_inicio_real),
    horarioFimReal: formatarHora(row.horario_fim_real),
    concluidoResumo: row.concluido_resumo ?? undefined,
    desfecho: row.desfecho ?? undefined,
    comparecimento: row.comparecimento ?? undefined,
    encaminhamentoInterno: row.encaminhamento_interno ?? undefined,
    encaminhamentoExterno: row.encaminhamento_externo ?? undefined,
    custoAtendimento: row.custo_atendimento ?? undefined,
    centralAtendimentoId: row.central_atendimento_id ? Number(row.central_atendimento_id) : undefined,
    participantes: asArray(row.participantes),
    criadoPorNome: row.criado_por_nome ?? undefined,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}

export function mapListaEsperaRow(row: AgendamentoListaEsperaRow) {
  return {
    id: Number(row.id),
    beneficiarioId: row.beneficiario_id ? Number(row.beneficiario_id) : undefined,
    beneficiarioNome: row.beneficiario_nome,
    familiaId: row.familia_id ? Number(row.familia_id) : undefined,
    familiaNome: row.familia_nome ?? undefined,
    unidade: row.unidade ?? undefined,
    setor: row.setor ?? undefined,
    tipoAtendimento: row.tipo_atendimento,
    profissionalPreferencial: row.profissional_preferencial ?? undefined,
    faixaHorarioPreferida: row.faixa_horario_preferida ?? undefined,
    prioridade: row.prioridade ?? undefined,
    motivo: row.motivo ?? undefined,
    observacao: row.observacao ?? undefined,
    dataEntrada: formatarDataIso(row.data_entrada),
    encaixeAutomatico: row.encaixe_automatico,
    convertidoAgendamentoId: row.convertido_agendamento_id ? Number(row.convertido_agendamento_id) : undefined,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}
