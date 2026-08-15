import { toIsoDate, toStringId } from "../../utils/string-utils.js";
export function mapPatrimonioToResponse(patrimonio, movimentos) {
    return {
        idPatrimonio: toStringId(patrimonio.id),
        numeroPatrimonio: patrimonio.numero_patrimonio,
        nome: patrimonio.nome,
        categoria: patrimonio.categoria ?? undefined,
        subcategoria: patrimonio.subcategoria ?? undefined,
        conservacao: patrimonio.conservacao ?? undefined,
        status: patrimonio.status ?? undefined,
        dataAquisicao: toIsoDate(patrimonio.data_aquisicao),
        valorAquisicao: patrimonio.valor_aquisicao ?? undefined,
        origem: patrimonio.origem ?? undefined,
        responsavel: patrimonio.responsavel ?? undefined,
        unidadeId: patrimonio.unidade_id ? toStringId(patrimonio.unidade_id) : undefined,
        unidade: patrimonio.unidade ?? undefined,
        sala: patrimonio.sala ?? undefined,
        taxaDepreciacao: patrimonio.taxa_depreciacao ?? undefined,
        observacoes: patrimonio.observacoes ?? undefined,
        dataCadastro: patrimonio.criado_em.toISOString(),
        dataAtualizacao: patrimonio.atualizado_em.toISOString(),
        movimentos: movimentos
            .sort((a, b) => b.data_movimento.getTime() - a.data_movimento.getTime() || Number(b.id - a.id))
            .map((movimento) => ({
            idMovimento: toStringId(movimento.id),
            tipo: movimento.tipo,
            destino: movimento.destino ?? undefined,
            responsavel: movimento.responsavel ?? undefined,
            observacao: movimento.observacao ?? undefined,
            dataMovimento: toIsoDate(movimento.data_movimento) ?? ""
        }))
    };
}
export function mapPatrimonioCategoriaToResponse(categoria) {
    const subcategorias = Array.isArray(categoria.subcategorias)
        ? categoria.subcategorias.map((item) => String(item)).filter(Boolean)
        : [];
    return {
        id: toStringId(categoria.id),
        nome: categoria.nome,
        taxaDepreciacao: categoria.taxa_depreciacao ?? undefined,
        subcategorias,
        ativo: categoria.ativo,
        dataCadastro: categoria.criado_em.toISOString(),
        dataAtualizacao: categoria.atualizado_em.toISOString()
    };
}
