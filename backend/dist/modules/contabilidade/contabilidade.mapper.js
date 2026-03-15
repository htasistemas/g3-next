import { toIsoDate } from "../../utils/string-utils.js";
import { normalizarStatusConta, normalizarStatusLancamento, normalizarStatusTransferencia, normalizarSituacaoConciliacao, normalizarTipoConta, normalizarTipoLancamento } from "./contabilidade.workflow.js";
export function mapContaBancariaToResponse(row) {
    return {
        id: Number(row.id),
        banco: row.banco,
        agencia: row.agencia ?? undefined,
        numero: row.numero,
        digito: row.digito ?? undefined,
        nomeConta: row.nome_conta ?? `${row.banco} - ${row.numero}`,
        tipo: normalizarTipoConta(row.tipo),
        titular: row.titular ?? undefined,
        projetoVinculado: row.projeto_vinculado ?? undefined,
        pixVinculado: row.pix_vinculado,
        tipoChavePix: row.tipo_chave_pix ?? undefined,
        chavePix: row.chave_pix ?? undefined,
        recebimentoLocal: row.recebimento_local,
        saldoInicial: row.saldo_inicial ?? row.saldo,
        dataSaldoInicial: toIsoDate(row.data_saldo_inicial) ?? "",
        saldoAtual: row.saldo,
        limiteMinimoAlerta: row.limite_minimo_alerta ?? 0,
        status: normalizarStatusConta(row.status),
        permiteMovimentacao: row.permite_movimentacao,
        observacao: row.observacao ?? undefined,
        dataAtualizacao: toIsoDate(row.data_atualizacao) ?? ""
    };
}
export function mapCategoriaFinanceiraToResponse(row) {
    return {
        id: Number(row.id),
        codigo: row.codigo,
        nome: row.nome,
        tipo: row.tipo,
        grupo: row.grupo ?? undefined,
        subgrupo: row.subgrupo ?? undefined,
        categoriaPaiId: row.categoria_pai_id ? Number(row.categoria_pai_id) : undefined,
        aceitaLancamentoDireto: row.aceita_lancamento_direto,
        status: row.status,
        observacao: row.observacao ?? undefined
    };
}
export function mapCentroCustoToResponse(row) {
    return {
        id: Number(row.id),
        codigo: row.codigo,
        nome: row.nome,
        setorResponsavel: row.setor_responsavel,
        descricao: row.descricao ?? undefined,
        status: row.status
    };
}
export function mapLancamentoToResponse(row) {
    const tipo = normalizarTipoLancamento(row.tipo);
    return {
        id: Number(row.id),
        dataLancamento: toIsoDate(row.data_lancamento) ?? "",
        tipo,
        natureza: row.natureza ?? tipo,
        contaBancariaId: row.conta_bancaria_id ? Number(row.conta_bancaria_id) : undefined,
        categoriaId: row.categoria_financeira_id ? Number(row.categoria_financeira_id) : undefined,
        centroCustoId: row.centro_custo_id ? Number(row.centro_custo_id) : undefined,
        setor: row.setor ?? undefined,
        descricao: row.descricao,
        contraparte: row.contraparte,
        documento: row.documento ?? undefined,
        historico: row.historico ?? row.descricao,
        vencimento: toIsoDate(row.vencimento) ?? "",
        valor: row.valor,
        formaPagamento: row.forma_pagamento ?? undefined,
        status: normalizarStatusLancamento(row.situacao, tipo),
        origem: row.origem ?? "MANUAL",
        observacao: row.observacao ?? undefined,
        dataBaixa: toIsoDate(row.data_baixa) ?? undefined,
        responsavel: row.responsavel ?? undefined,
        projeto: row.projeto ?? undefined,
        compraId: row.compra_id ? Number(row.compra_id) : undefined,
        conciliado: row.conciliado,
        bloqueadoOrigem: row.bloqueado_origem,
        contaBancariaNome: row.conta_bancaria_nome ?? undefined,
        categoriaNome: row.categoria_nome ?? undefined,
        centroCustoNome: row.centro_custo_nome ?? undefined
    };
}
export function mapMovimentacaoToResponse(row) {
    return {
        id: Number(row.id),
        tipo: row.tipo,
        descricao: row.descricao,
        contraparte: row.contraparte ?? undefined,
        categoria: row.categoria ?? undefined,
        categoriaId: row.categoria_financeira_id ? Number(row.categoria_financeira_id) : undefined,
        centroCustoId: row.centro_custo_id ? Number(row.centro_custo_id) : undefined,
        contaBancariaId: row.conta_bancaria_id ? Number(row.conta_bancaria_id) : undefined,
        dataMovimentacao: toIsoDate(row.data_movimentacao) ?? "",
        valor: row.valor,
        origem: row.origem ?? undefined,
        observacao: row.observacao ?? undefined,
        saldoAnterior: row.saldo_anterior ?? undefined,
        saldoAtual: row.saldo_atual ?? undefined,
        lancamentoFinanceiroId: row.lancamento_financeiro_id ? Number(row.lancamento_financeiro_id) : undefined,
        transferenciaId: row.transferencia_id ? Number(row.transferencia_id) : undefined,
        contaBancariaNumero: row.conta_bancaria_numero ?? undefined,
        contaBancariaBanco: row.conta_bancaria_banco ?? undefined,
        contaBancariaNome: row.conta_bancaria_nome ?? undefined,
        categoriaNome: row.categoria_nome ?? undefined,
        centroCustoNome: row.centro_custo_nome ?? undefined
    };
}
export function mapTransferenciaToResponse(row) {
    return {
        id: Number(row.id),
        contaOrigemId: Number(row.conta_origem_id),
        contaDestinoId: Number(row.conta_destino_id),
        dataTransferencia: toIsoDate(row.data_transferencia) ?? "",
        valor: row.valor,
        descricao: row.descricao,
        responsavel: row.responsavel ?? undefined,
        observacao: row.observacao ?? undefined,
        status: normalizarStatusTransferencia(row.status),
        movimentacaoSaidaId: row.movimentacao_saida_id ? Number(row.movimentacao_saida_id) : undefined,
        movimentacaoEntradaId: row.movimentacao_entrada_id ? Number(row.movimentacao_entrada_id) : undefined,
        contaOrigemNome: row.conta_origem_nome ?? undefined,
        contaDestinoNome: row.conta_destino_nome ?? undefined
    };
}
export function mapConciliacaoToResponse(row) {
    return {
        id: Number(row.id),
        contaBancariaId: Number(row.conta_bancaria_id),
        dataMovimento: toIsoDate(row.data_movimento) ?? "",
        descricaoExtrato: row.descricao_extrato,
        valorExtrato: row.valor_extrato,
        lancamentoFinanceiroId: row.lancamento_financeiro_id ? Number(row.lancamento_financeiro_id) : undefined,
        movimentacaoFinanceiraId: row.movimentacao_financeira_id ? Number(row.movimentacao_financeira_id) : undefined,
        situacao: normalizarSituacaoConciliacao(row.situacao),
        diferenca: row.diferenca ?? 0,
        observacao: row.observacao ?? undefined,
        contaBancariaNome: row.conta_bancaria_nome ?? undefined,
        lancamentoDescricao: row.lancamento_descricao ?? undefined,
        movimentacaoDescricao: row.movimentacao_descricao ?? undefined
    };
}
export function mapHistoricoContabilToResponse(row) {
    return {
        id: Number(row.id),
        aba: row.aba,
        acao: row.acao,
        tipoRegistro: row.tipo_registro,
        registroId: row.registro_id ?? undefined,
        valor: row.valor ?? undefined,
        conta: row.conta ?? undefined,
        statusAnterior: row.status_anterior ?? undefined,
        statusNovo: row.status_novo ?? undefined,
        observacao: row.observacao ?? undefined,
        origem: row.origem ?? undefined,
        usuarioId: row.usuario_id ? Number(row.usuario_id) : undefined,
        usuarioNome: row.usuario_nome ?? undefined,
        perfil: row.perfil ?? undefined,
        ip: row.ip ?? undefined,
        maquina: row.maquina ?? undefined,
        dataHora: row.criado_em.toISOString()
    };
}
export function mapCompraIntegradaToResponse(row) {
    return {
        compraId: Number(row.compra_id),
        numeroCompra: row.numero_solicitacao ?? undefined,
        fornecedor: row.fornecedor ?? undefined,
        valorAprovado: row.valor_aprovado ?? 0,
        valorReservado: row.valor_reservado ?? 0,
        valorAutorizado: row.valor_autorizado ?? 0,
        contaBancariaId: row.conta_bancaria_id ? Number(row.conta_bancaria_id) : undefined,
        contaNome: row.conta_nome ?? undefined,
        dataPrevistaPagamento: toIsoDate(row.data_prevista_pagamento) ?? undefined,
        statusCompra: row.status_compra ?? undefined,
        statusFinanceiro: row.status_financeiro ?? undefined,
        lancamentoFinanceiroId: row.lancamento_financeiro_id
            ? Number(row.lancamento_financeiro_id)
            : undefined
    };
}
export function mapEmendaToResponse(row) {
    return {
        id: Number(row.id),
        identificacao: row.identificacao,
        referenciaLegal: row.referencia_legal ?? undefined,
        dataPrevista: toIsoDate(row.data_prevista) ?? "",
        valorPrevisto: row.valor_previsto,
        diasAlerta: row.dias_alerta,
        status: row.status,
        observacoes: row.observacoes ?? undefined
    };
}
