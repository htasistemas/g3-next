import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type { LembreteDiarioRow } from "./lembrete-diario.types.js";

function formatarHora(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  const texto = String(value).trim();
  if (!texto) return undefined;
  return texto.slice(0, 5);
}

export function mapLembreteDiarioToResponse(row: LembreteDiarioRow) {
  return {
    id: Number(row.id),
    titulo: row.titulo,
    descricao: row.descricao ?? undefined,
    dataInicial: toIsoDate(row.data_inicial) ?? "",
    usuarioId: row.usuario_id ? Number(row.usuario_id) : 0,
    todosUsuarios: row.todos_usuarios,
    recorrencia: row.recorrencia,
    horaAviso: formatarHora(row.hora_aviso),
    status: row.status,
    proximaExecucaoEm: row.proxima_execucao_em.toISOString(),
    adiadoAte: row.adiado_ate?.toISOString(),
    concluidoEm: row.concluido_em?.toISOString(),
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString(),
    idInterno: toStringId(row.id)
  };
}
