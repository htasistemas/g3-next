import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type {
  TarefaAdministrativaChecklistRow,
  TarefaAdministrativaHistoricoRow,
  TarefaAdministrativaRow
} from "./tarefa-administrativa.types.js";

function toIsoDateTime(value?: Date | null) {
  if (!value) return undefined;
  return value.toISOString();
}

export function mapTarefaAdministrativaToResponse(
  tarefa: TarefaAdministrativaRow,
  checklist: TarefaAdministrativaChecklistRow[],
  historico: TarefaAdministrativaHistoricoRow[]
) {
  return {
    id: toStringId(tarefa.id),
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    responsavel: tarefa.responsavel,
    prioridade: tarefa.prioridade,
    prazo: toIsoDate(tarefa.prazo),
    status: tarefa.status,
    criadoEm: tarefa.criado_em.toISOString(),
    atualizadoEm: tarefa.atualizado_em.toISOString(),
    checklist: checklist
      .sort((a, b) => a.ordem - b.ordem || Number(a.id - b.id))
      .map((item) => ({
        id: toStringId(item.id),
        titulo: item.titulo,
        concluido: item.concluido,
        concluidoEm: toIsoDateTime(item.concluido_em),
        ordem: item.ordem
      })),
    historico: historico
      .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime() || Number(b.id - a.id))
      .map((item) => ({
        id: toStringId(item.id),
        mensagem: item.mensagem,
        criadoEm: item.criado_em.toISOString()
      }))
  };
}
