import { formatDateTimeLocal } from "./emprestimos-eventos-datetime.js";
function toIsoDateTime(value) {
    return formatDateTimeLocal(value);
}
export function mapEventoEmprestimoToResponse(row) {
    return {
        id: Number(row.id),
        titulo: row.titulo,
        descricao: row.descricao ?? null,
        local: row.local ?? null,
        promovidoPor: row.promovido_por ?? null,
        dataInicio: formatDateTimeLocal(row.data_inicio),
        dataFim: formatDateTimeLocal(row.data_fim),
        status: row.status
    };
}
export function mapEmprestimoItemToResponse(row) {
    return {
        id: Number(row.id),
        itemId: Number(row.item_id),
        tipoItem: row.tipo_item,
        quantidade: row.quantidade,
        statusItem: row.status_item,
        observacaoItem: row.observacao_item ?? null,
        nomeItem: row.nome_item ?? null,
        numeroPatrimonio: row.numero_patrimonio ?? null
    };
}
export function mapEmprestimoToResponse(row, itens) {
    return {
        id: Number(row.id),
        evento: {
            id: Number(row.evento_id),
            titulo: row.evento_titulo,
            descricao: row.evento_descricao ?? null,
            local: row.evento_local ?? null,
            promovidoPor: row.evento_promovido_por ?? null,
            dataInicio: formatDateTimeLocal(row.evento_data_inicio),
            dataFim: formatDateTimeLocal(row.evento_data_fim),
            status: row.evento_status
        },
        unidadeId: row.unidade_id ? Number(row.unidade_id) : null,
        responsavel: row.responsavel_id || row.responsavel_nome
            ? {
                id: row.responsavel_id ? Number(row.responsavel_id) : null,
                nome: row.responsavel_nome ?? ""
            }
            : null,
        dataRetiradaPrevista: formatDateTimeLocal(row.data_retirada_prevista),
        dataDevolucaoPrevista: formatDateTimeLocal(row.data_devolucao_prevista),
        dataRetiradaReal: toIsoDateTime(row.data_retirada_real),
        dataDevolucaoReal: toIsoDateTime(row.data_devolucao_real),
        status: row.status,
        observacoes: row.observacoes ?? null,
        itens: itens.map(mapEmprestimoItemToResponse)
    };
}
export function mapMovimentacaoToResponse(row) {
    return {
        id: Number(row.id),
        emprestimoId: Number(row.emprestimo_id),
        acao: row.acao,
        descricao: row.descricao ?? null,
        usuarioId: row.usuario_id ? Number(row.usuario_id) : null,
        criadoEm: formatDateTimeLocal(row.criado_em)
    };
}
export function mapResponsavelEmprestimoToResponse(row) {
    return {
        id: Number(row.id),
        nome: row.nome,
        documento: row.documento ?? null,
        telefone: row.telefone ?? null,
        email: row.email ?? null,
        observacoes: row.observacoes ?? null,
        criadoEm: formatDateTimeLocal(row.criado_em),
        atualizadoEm: formatDateTimeLocal(row.atualizado_em)
    };
}
