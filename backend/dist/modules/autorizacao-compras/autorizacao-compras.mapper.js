import { toIsoDate } from "../../utils/string-utils.js";
export function mapAutorizacaoCompraResumoToResponse(row) {
    return {
        id: Number(row.id),
        numeroSolicitacao: row.numero_solicitacao ?? undefined,
        titulo: row.titulo,
        solicitante: row.solicitante ?? row.responsavel ?? undefined,
        setorSolicitante: row.setor_solicitante ?? row.area ?? undefined,
        centroCusto: row.centro_custo ?? undefined,
        dataSolicitacao: toIsoDate(row.data_solicitacao),
        tipoCompra: row.tipo,
        naturezaCompra: row.natureza_compra ?? undefined,
        prioridade: row.prioridade,
        status: row.status,
        valorTotal: row.valor_total_itens ?? row.valor ?? 0,
        valorSolicitacao: row.valor_solicitacao ?? row.valor_total_itens ?? row.valor ?? 0,
        orcamento: {
            previsto: row.orcamento_previsto ?? 0,
            utilizado: row.orcamento_utilizado ?? 0,
            saldoDisponivel: row.orcamento_saldo ?? 0,
            extrapola: row.extrapola_orcamento,
            autorizacaoEspecial: row.autorizacao_especial_orcamento,
            justificativa: row.justificativa_orcamento ?? undefined
        },
        numeroReserva: row.numero_reserva ?? undefined,
        autorizacaoPagamento: {
            numero: row.autorizacao_pagamento_numero ?? undefined,
            autor: row.autorizacao_pagamento_autor ?? undefined,
            data: toIsoDate(row.autorizacao_pagamento_data),
            observacoes: row.autorizacao_pagamento_observacoes ?? undefined,
            valorAutorizado: row.pagamento_autorizado_valor ?? undefined,
            vencimento: toIsoDate(row.pagamento_vencimento),
            formaPagamento: row.pagamento_forma ?? undefined,
            contaPagadoraId: row.conta_pagadora_id ? Number(row.conta_pagadora_id) : undefined,
            documentoReferencia: row.documento_referencia ?? undefined,
            documentoFiscal: row.documento_fiscal ?? undefined,
            lancamentoFinanceiroId: row.lancamento_financeiro_id
                ? Number(row.lancamento_financeiro_id)
                : undefined
        },
        fornecedorSugerido: row.menor_preco_fornecedor
            ? {
                cotacaoId: row.menor_preco_cotacao_id ? Number(row.menor_preco_cotacao_id) : undefined,
                fornecedor: row.menor_preco_fornecedor,
                valor: row.menor_preco_valor ?? 0
            }
            : undefined,
        fornecedorEscolhido: row.vencedor
            ? {
                cotacaoId: row.cotacao_vencedora_id ? Number(row.cotacao_vencedora_id) : undefined,
                fornecedor: row.vencedor
            }
            : undefined,
        flagExcecaoMenorPreco: row.flag_excecao_menor_preco,
        justificativaExcecaoMenorPreco: row.justificativa_excecao_menor_preco ?? undefined,
        dispensarCotacao: row.dispensar_cotacao,
        motivoDispensa: row.motivo_dispensa ?? undefined,
        registroPatrimonio: row.registro_patrimonio,
        registroAlmoxarifado: row.registro_almoxarifado,
        ativo: row.ativo,
        canceladoEm: row.cancelado_em?.toISOString(),
        finalizadoEm: row.finalizado_em?.toISOString(),
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapAutorizacaoCompraItemToResponse(row) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        descricao: row.descricao,
        quantidade: row.quantidade,
        unidade: row.unidade,
        valorEstimado: row.valor_estimado,
        valorTotalEstimado: row.quantidade * row.valor_estimado,
        categoria: row.categoria ?? undefined,
        tipoItem: row.tipo_item,
        ordem: row.ordem,
        ativo: row.ativo
    };
}
export function mapAutorizacaoCompraCotacaoToResponse(row, extras) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        fornecedor: row.fornecedor,
        razaoSocial: row.razao_social ?? undefined,
        cnpj: row.cnpj ?? undefined,
        contato: row.contato ?? undefined,
        telefone: row.telefone ?? undefined,
        email: row.email ?? undefined,
        valor: row.valor,
        prazoEntrega: toIsoDate(row.prazo_entrega),
        formaPagamento: row.forma_pagamento ?? undefined,
        validadeProposta: toIsoDate(row.validade),
        observacoes: row.observacoes ?? undefined,
        dataCotacao: toIsoDate(row.data_cotacao),
        orcamentoArquivoId: row.orcamento_arquivo_id ? Number(row.orcamento_arquivo_id) : undefined,
        cartaoCnpjArquivoId: row.cartao_cnpj_arquivo_id
            ? Number(row.cartao_cnpj_arquivo_id)
            : undefined,
        ehMenorPreco: extras?.menorCotacaoId === row.id,
        ehEscolhida: extras?.cotacaoVencedoraId === row.id,
        indicadoresFornecedor: extras?.indicadoresFornecedor?.[Number(row.id)],
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapReservaBancariaToResponse(row) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        contaBancariaId: Number(row.conta_bancaria_id),
        valor: row.valor,
        status: row.status,
        observacao: row.observacao ?? undefined,
        usuarioResponsavel: row.usuario_responsavel ?? undefined,
        canceladoEm: row.cancelado_em?.toISOString(),
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapAutorizacaoCompraAprovacaoToResponse(row, nivel) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        nivelId: Number(row.nivel_id),
        nivelCodigo: nivel?.codigo,
        nivelNome: nivel?.nome,
        decisao: row.decisao,
        parecer: row.parecer,
        observacao: row.observacao ?? undefined,
        motivo: row.motivo ?? undefined,
        usuarioId: row.usuario_id ? Number(row.usuario_id) : undefined,
        usuarioNome: row.usuario_nome ?? undefined,
        permissoes: Array.isArray(row.permissoes_json) ? row.permissoes_json : [],
        ip: row.ip ?? undefined,
        maquina: row.maquina ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapAutorizacaoCompraNivelToResponse(nivel, aprovacoes) {
    const ultima = [...aprovacoes]
        .filter((aprovacao) => aprovacao.nivel_id === nivel.id)
        .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime())[0];
    return {
        id: Number(nivel.id),
        codigo: nivel.codigo,
        nome: nivel.nome,
        ordem: nivel.ordem,
        valorMinimo: nivel.valor_minimo,
        valorMaximo: nivel.valor_maximo ?? undefined,
        permissaoRequerida: nivel.permissao_requerida,
        status: ultima?.decisao === "APROVAR"
            ? "aprovado"
            : ultima?.decisao === "REPROVAR"
                ? "reprovado"
                : ultima?.decisao === "DEVOLVER_AJUSTE"
                    ? "devolvido"
                    : "pendente",
        usuarioNome: ultima?.usuario_nome ?? undefined,
        parecer: ultima?.parecer ?? undefined,
        motivo: ultima?.motivo ?? undefined,
        criadoEm: ultima?.criado_em.toISOString()
    };
}
export function mapAutorizacaoCompraHistoricoToResponse(row) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        acao: row.acao,
        aba: row.aba ?? undefined,
        statusAnterior: row.status_anterior ?? undefined,
        statusNovo: row.status_novo ?? undefined,
        observacao: row.observacao ?? undefined,
        justificativa: row.justificativa ?? undefined,
        usuarioId: row.usuario_id ? Number(row.usuario_id) : undefined,
        usuarioNome: row.usuario_nome ?? undefined,
        perfil: row.perfil ?? undefined,
        ip: row.ip ?? undefined,
        maquina: row.maquina ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapAutorizacaoCompraIntegracaoToResponse(row) {
    return {
        id: Number(row.id),
        autorizacaoCompraId: Number(row.autorizacao_compra_id),
        tipo: row.tipo,
        referenciaId: row.referencia_id ?? undefined,
        status: row.status,
        detalhe: row.detalhe ?? undefined,
        usuarioId: row.usuario_id ? Number(row.usuario_id) : undefined,
        usuarioNome: row.usuario_nome ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapArquivoResumoToResponse(row) {
    return {
        id: Number(row.id),
        entidadeTipo: row.entidade_tipo,
        entidadeId: row.entidade_id ? Number(row.entidade_id) : undefined,
        categoria: row.categoria,
        nomeOriginal: row.nome_original,
        nomeArquivo: row.nome_arquivo,
        caminhoArquivo: row.caminho_arquivo,
        mimeType: row.mime_type,
        observacao: row.observacao ?? undefined,
        dataUpload: row.data_upload.toISOString()
    };
}
export function mapAutorizacaoCompraDetalheToResponse(input) {
    const resumo = mapAutorizacaoCompraResumoToResponse(input.compra);
    return {
        ...resumo,
        itens: input.itens.map(mapAutorizacaoCompraItemToResponse),
        niveisAprovacao: input.niveis.map((nivel) => mapAutorizacaoCompraNivelToResponse(nivel, input.aprovacoes)),
        aprovacoes: input.aprovacoes.map((aprovacao) => mapAutorizacaoCompraAprovacaoToResponse(aprovacao, input.niveis.find((nivel) => nivel.id === aprovacao.nivel_id))),
        cotacoes: input.cotacoes.map((cotacao) => mapAutorizacaoCompraCotacaoToResponse(cotacao, {
            menorCotacaoId: input.compra.menor_preco_cotacao_id,
            cotacaoVencedoraId: input.compra.cotacao_vencedora_id,
            indicadoresFornecedor: input.indicadoresFornecedor
        })),
        reservas: input.reservas.map(mapReservaBancariaToResponse),
        historico: input.historico.map(mapAutorizacaoCompraHistoricoToResponse),
        integracoes: input.integracoes.map(mapAutorizacaoCompraIntegracaoToResponse),
        anexos: (input.anexos ?? []).map(mapArquivoResumoToResponse)
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
