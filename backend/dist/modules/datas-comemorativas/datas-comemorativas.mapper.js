import { toStringId } from "../../utils/string-utils.js";
function montarDataVisual(row, year) {
    if (row.data_evento) {
        return row.data_evento.toISOString().slice(0, 10);
    }
    const ano = year ?? new Date().getFullYear();
    return `${ano}-${String(row.mes).padStart(2, "0")}-${String(row.dia).padStart(2, "0")}`;
}
export function mapDataComemorativaToResponse(row, year) {
    return {
        id: toStringId(row.id),
        titulo: row.titulo,
        descricao: row.descricao ?? undefined,
        dia: row.dia,
        mes: row.mes,
        ano: row.ano ?? undefined,
        dataEvento: row.data_evento ? row.data_evento.toISOString().slice(0, 10) : undefined,
        dataVisual: montarDataVisual(row, year),
        tipoEvento: row.tipo_evento,
        abrangencia: row.abrangencia,
        uf: row.uf ?? undefined,
        municipio: row.municipio ?? undefined,
        recorrenteAnual: row.recorrente_anual,
        fonteOrigem: row.fonte_origem ?? undefined,
        origemReferencia: row.origem_referencia ?? undefined,
        corExibicao: row.cor_exibicao ?? undefined,
        icone: row.icone ?? undefined,
        prioridadePopup: row.prioridade_popup ?? 0,
        exibirNoPopup: row.exibir_no_popup,
        ativo: row.ativo,
        excluidoLogico: row.excluido_logico,
        criadoPor: row.criado_por ? toStringId(row.criado_por) : undefined,
        atualizadoPor: row.atualizado_por ? toStringId(row.atualizado_por) : undefined,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
