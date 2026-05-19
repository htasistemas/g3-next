import { toStringId } from "../../utils/string-utils.js";
import type { ProjetoHistoricoRow, ProjetoRow, ProjetoTarefaRow } from "./projeto.types.js";

const projetoStatusLabels: Record<string, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  PARADO: "Parado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado"
};

const prioridadeLabels: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente"
};

const areaLabels: Record<string, string> = {
  ASSISTENCIA_SOCIAL: "Assistência social",
  EDUCACAO: "Educação",
  SAUDE: "Saúde",
  ALIMENTACAO: "Alimentação",
  CAPACITACAO_PROFISSIONAL: "Capacitação profissional",
  CULTURA: "Cultura",
  ESPORTE: "Esporte",
  HABITACAO: "Habitação",
  CAPTACAO_RECURSOS: "Captação de recursos",
  OUTRO: "Outro"
};

const tarefaTipoLabels: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EXECUCAO: "Execução",
  ATENDIMENTO: "Atendimento",
  COMPRA: "Compra",
  PRESTACAO_CONTAS: "Prestação de contas",
  RELATORIO: "Relatório",
  REUNIAO: "Reunião",
  MONITORAMENTO: "Monitoramento",
  DIVULGACAO: "Divulgação",
  OUTRO: "Outro"
};

function toIsoDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function parseEquipe(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
      }
    } catch {
      return value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function formatProjetoStatusLabel(value?: string | null) {
  return value ? projetoStatusLabels[value] ?? value : "---";
}

export function formatProjetoPrioridadeLabel(value?: string | null) {
  return value ? prioridadeLabels[value] ?? value : "---";
}

export function formatProjetoAreaLabel(value?: string | null) {
  return value ? areaLabels[value] ?? value : "---";
}

export function formatProjetoTarefaTipoLabel(value?: string | null) {
  return value ? tarefaTipoLabels[value] ?? value : "---";
}

export function mapProjetoTarefaToResponse(tarefa: ProjetoTarefaRow) {
  const hoje = new Date();
  const dataPrevista = toIsoDate(tarefa.data_prevista);
  const atrasada =
    tarefa.status !== "CONCLUIDO" &&
    tarefa.data_prevista instanceof Date &&
    tarefa.data_prevista.getTime() < new Date(hoje.toDateString()).getTime();

  return {
    id: toStringId(tarefa.id),
    projetoId: toStringId(tarefa.projeto_id),
    titulo: tarefa.titulo,
    descricao: tarefa.descricao ?? "",
    tipoTarefa: tarefa.tipo_tarefa,
    tipoTarefaLabel: formatProjetoTarefaTipoLabel(tarefa.tipo_tarefa),
    responsavel: tarefa.responsavel,
    prioridade: tarefa.prioridade,
    prioridadeLabel: formatProjetoPrioridadeLabel(tarefa.prioridade),
    status: tarefa.status,
    statusLabel: formatProjetoStatusLabel(tarefa.status),
    dataPrevista,
    dataConclusao: toIsoDate(tarefa.data_conclusao),
    observacoes: tarefa.observacoes ?? "",
    ordemKanban: tarefa.ordem_kanban ?? 0,
    ativo: tarefa.ativo,
    atrasada,
    createdAt: tarefa.created_at.toISOString(),
    updatedAt: tarefa.updated_at.toISOString()
  };
}

export function mapProjetoHistoricoToResponse(item: ProjetoHistoricoRow) {
  return {
    id: toStringId(item.id),
    projetoId: toStringId(item.projeto_id),
    tarefaId: item.tarefa_id ? toStringId(item.tarefa_id) : null,
    tipoEvento: item.tipo_evento,
    descricao: item.descricao,
    detalhes: item.detalhes_json ?? null,
    usuarioId: item.usuario_id ? toStringId(item.usuario_id) : null,
    usuarioNome: item.usuario_nome ?? "Sistema",
    createdAt: item.created_at.toISOString()
  };
}

export function mapProjetoToResponse(
  projeto: ProjetoRow,
  tarefas: ProjetoTarefaRow[],
  historico: ProjetoHistoricoRow[]
) {
  const totalTarefas = Number(projeto.total_tarefas ?? tarefas.length);
  const tarefasConcluidas = Number(
    projeto.tarefas_concluidas ?? tarefas.filter((item) => item.status === "CONCLUIDO").length
  );
  const percentual =
    projeto.percentual_evolucao !== null && projeto.percentual_evolucao !== undefined
      ? Number(projeto.percentual_evolucao)
      : totalTarefas > 0
        ? Math.round((tarefasConcluidas / totalTarefas) * 100)
        : projeto.status === "CONCLUIDO"
          ? 100
          : 0;

  const hoje = new Date();
  const atraso =
    projeto.status !== "CONCLUIDO" &&
    projeto.status !== "CANCELADO" &&
    projeto.prazo_previsto.getTime() < new Date(hoje.toDateString()).getTime();

  return {
    id: toStringId(projeto.id),
    nome: projeto.nome,
    descricaoCurta:
      (projeto.descricao_completa ?? "").trim().slice(0, 160) || "Sem descrição informada.",
    descricaoCompleta: projeto.descricao_completa ?? "",
    objetivoGeral: projeto.objetivo_geral ?? "",
    publicoAlvo: projeto.publico_alvo ?? "",
    unidadeAssistencialId: projeto.unidade_assistencial_id
      ? toStringId(projeto.unidade_assistencial_id)
      : null,
    unidadeAssistencialNome: projeto.unidade_assistencial_nome ?? "",
    responsavel: projeto.responsavel,
    equipeEnvolvida: parseEquipe(projeto.equipe_envolvida),
    dataInicio: toIsoDate(projeto.data_inicio),
    prazoPrevisto: toIsoDate(projeto.prazo_previsto),
    dataTerminoReal: toIsoDate(projeto.data_termino_real),
    prioridade: projeto.prioridade,
    prioridadeLabel: formatProjetoPrioridadeLabel(projeto.prioridade),
    status: projeto.status,
    statusLabel: formatProjetoStatusLabel(projeto.status),
    areaProjeto: projeto.area_projeto,
    areaProjetoLabel: formatProjetoAreaLabel(projeto.area_projeto),
    fonteRecurso: projeto.fonte_recurso ?? "",
    observacoes: projeto.observacoes ?? "",
    ativo: projeto.ativo,
    percentualEvolucao: percentual,
    quantidadeTarefas: totalTarefas,
    quantidadeTarefasConcluidas: tarefasConcluidas,
    indicadorPrazo: projeto.status === "CONCLUIDO" ? "CONCLUIDO" : atraso ? "ATRASADO" : "NO_PRAZO",
    createdAt: projeto.created_at.toISOString(),
    updatedAt: projeto.updated_at.toISOString(),
    tarefas: tarefas.map(mapProjetoTarefaToResponse),
    historico: historico.map(mapProjetoHistoricoToResponse)
  };
}
