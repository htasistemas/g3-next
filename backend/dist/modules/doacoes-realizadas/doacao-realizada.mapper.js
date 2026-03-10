import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function formatDate(value) {
    if (!value)
        return undefined;
    if (value instanceof Date)
        return toIsoDate(value);
    const texto = String(value).trim();
    if (!texto)
        return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto))
        return texto;
    const data = new Date(texto);
    if (Number.isNaN(data.getTime()))
        return undefined;
    return toIsoDate(data);
}
export function mapDoacaoRealizadaToResponse(row, itens) {
    return {
        id_doacao_realizada: toStringId(row.id),
        beneficiario_id: row.beneficiario_id ? toStringId(row.beneficiario_id) : undefined,
        vinculo_familiar_id: row.vinculo_familiar_id ? toStringId(row.vinculo_familiar_id) : undefined,
        beneficiario_nome: row.beneficiario_nome ?? undefined,
        familia_nome: row.familia_nome ?? undefined,
        tipo_doacao: row.tipo_doacao,
        situacao: row.situacao,
        responsavel: row.responsavel ?? undefined,
        observacoes: row.observacoes ?? undefined,
        data_doacao: formatDate(row.data_doacao),
        total_itens: typeof row.total_itens === "bigint" ? Number(row.total_itens) : row.total_itens ?? itens.length,
        itens: itens.map((item) => ({
            id_item_doacao: toStringId(item.id),
            item_id: toStringId(item.almoxarifado_item_id),
            codigo_item: item.codigo_item,
            descricao_item: item.descricao_item,
            unidade_item: item.unidade_item,
            quantidade: item.quantidade,
            observacoes: item.observacoes ?? undefined
        })),
        data_cadastro: row.criado_em.toISOString(),
        data_atualizacao: row.atualizado_em.toISOString()
    };
}
