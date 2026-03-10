import { toIsoDate } from "../../utils/string-utils.js";
export function mapAutorizacaoCompraToResponse(row) {
    return {
        id: Number(row.id),
        titulo: row.titulo,
        tipo: row.tipo,
        area: row.area ?? undefined,
        responsavel: row.responsavel ?? undefined,
        dataPrevista: toIsoDate(row.data_prevista),
        valor: row.valor ?? undefined,
        quantidadeItens: row.quantidade_itens,
        justificativa: row.justificativa ?? undefined,
        centroCusto: row.centro_custo ?? undefined,
        prioridade: row.prioridade,
        status: row.status,
        aprovador: row.aprovador ?? undefined,
        decisao: row.decisao ?? undefined,
        observacoesAprovacao: row.observacoes_aprovacao ?? undefined,
        dataAprovacao: toIsoDate(row.data_aprovacao),
        dispensarCotacao: row.dispensar_cotacao,
        motivoDispensa: row.motivo_dispensa ?? undefined,
        vencedor: row.vencedor ?? undefined,
        registroPatrimonio: row.registro_patrimonio,
        registroAlmoxarifado: row.registro_almoxarifado,
        numeroReserva: row.numero_reserva ?? undefined,
        numeroTermo: row.numero_termo ?? undefined,
        autorizacaoPagamentoNumero: row.autorizacao_pagamento_numero ?? undefined,
        autorizacaoPagamentoAutor: row.autorizacao_pagamento_autor ?? undefined,
        autorizacaoPagamentoData: toIsoDate(row.autorizacao_pagamento_data),
        autorizacaoPagamentoObservacoes: row.autorizacao_pagamento_observacoes ?? undefined,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapAutorizacaoCompraCotacaoToResponse(row) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        fornecedor: row.fornecedor,
        razaoSocial: row.razao_social ?? undefined,
        cnpj: row.cnpj ?? undefined,
        valor: row.valor,
        prazoEntrega: toIsoDate(row.prazo_entrega),
        validade: toIsoDate(row.validade),
        conformidade: row.conformidade ?? undefined,
        observacoes: row.observacoes ?? undefined,
        orcamentoFisicoNome: row.orcamento_fisico_nome ?? undefined,
        orcamentoFisicoTipo: row.orcamento_fisico_tipo ?? undefined,
        orcamentoFisicoConteudo: row.orcamento_fisico_conteudo ?? undefined,
        criadoEm: row.criado_em.toISOString(),
        cartaoCnpjUrl: row.cartao_cnpj_url ?? undefined,
        cartaoCnpjNome: row.cartao_cnpj_nome ?? undefined,
        cartaoCnpjTipo: row.cartao_cnpj_tipo ?? undefined,
        cartaoCnpjConteudo: row.cartao_cnpj_conteudo ?? undefined
    };
}
export function mapReservaBancariaToResponse(row) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        contaBancariaId: Number(row.conta_bancaria_id),
        valor: row.valor,
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapFornecedorByCnpj(row) {
    return {
        cnpj: row?.cnpj ?? undefined,
        razaoSocial: row?.razao_social ?? undefined,
        nomeFantasia: row?.razao_social ?? undefined,
        idConsulta: row?.cnpj ?? undefined
    };
}
