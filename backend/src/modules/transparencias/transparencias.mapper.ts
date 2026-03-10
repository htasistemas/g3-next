import { toStringId } from "../../utils/string-utils.js";
import type {
  TransparenciaChecklistRow,
  TransparenciaComprovanteRow,
  TransparenciaDestinacaoRow,
  TransparenciaRecebimentoRow,
  TransparenciaRow,
  TransparenciaTimelineRow
} from "./transparencias.types.js";

export function mapTransparenciaToResponse(
  transparencia: TransparenciaRow,
  recebimentos: TransparenciaRecebimentoRow[],
  destinacoes: TransparenciaDestinacaoRow[],
  comprovantes: TransparenciaComprovanteRow[],
  timelines: TransparenciaTimelineRow[],
  checklist: TransparenciaChecklistRow[]
) {
  return {
    id: toStringId(transparencia.id),
    unidadeId: transparencia.unidade_id ? toStringId(transparencia.unidade_id) : undefined,
    totalRecebido: transparencia.total_recebido ?? undefined,
    totalRecebidoHelper: transparencia.total_recebido_helper ?? undefined,
    totalAplicado: transparencia.total_aplicado ?? undefined,
    totalAplicadoHelper: transparencia.total_aplicado_helper ?? undefined,
    saldoDisponivel: transparencia.saldo_disponivel ?? undefined,
    saldoDisponivelHelper: transparencia.saldo_disponivel_helper ?? undefined,
    prestadoMes: transparencia.prestado_mes ?? undefined,
    prestadoMesHelper: transparencia.prestado_mes_helper ?? undefined,
    recebimentos: recebimentos
      .filter((item) => item.transparencia_id === transparencia.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        fonte: item.fonte,
        valor: item.valor ?? undefined,
        periodicidade: item.periodicidade ?? undefined,
        status: item.status ?? undefined
      })),
    destinacoes: destinacoes
      .filter((item) => item.transparencia_id === transparencia.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        titulo: item.titulo,
        descricao: item.descricao ?? undefined,
        percentual: item.percentual ?? undefined
      })),
    comprovantes: comprovantes
      .filter((item) => item.transparencia_id === transparencia.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        titulo: item.titulo,
        descricao: item.descricao ?? undefined,
        arquivoNome: item.arquivo_nome ?? undefined,
        arquivoUrl: item.arquivo_url ?? undefined
      })),
    timelines: timelines
      .filter((item) => item.transparencia_id === transparencia.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        titulo: item.titulo,
        detalhe: item.detalhe ?? undefined,
        status: item.status ?? undefined
      })),
    checklist: checklist
      .filter((item) => item.transparencia_id === transparencia.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        titulo: item.titulo,
        descricao: item.descricao ?? undefined,
        status: item.status ?? undefined
      }))
  };
}
