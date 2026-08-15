import { toStringId } from "../../utils/string-utils.js";
export function mapTransparenciaToResponse(transparencia, recebimentos, destinacoes, comprovantes, timelines, checklist, despesas = [], parecerHistorico = []) {
    return {
        id: toStringId(transparencia.id),
        unidadeId: transparencia.unidade_id ? toStringId(transparencia.unidade_id) : undefined,
        instrumento: transparencia.instrumento ?? undefined,
        objeto: transparencia.objeto ?? undefined,
        periodoInicio: transparencia.periodo_inicio?.toISOString().slice(0, 10),
        periodoFim: transparencia.periodo_fim?.toISOString().slice(0, 10),
        tipoPrestacao: transparencia.tipo_prestacao ?? "FINAL",
        statusWorkflow: transparencia.status_workflow ?? "RASCUNHO",
        criadoEm: transparencia.criado_em?.toISOString(),
        atualizadoEm: transparencia.atualizado_em?.toISOString(),
        totalRecebido: transparencia.total_recebido ?? undefined,
        totalRecebidoHelper: transparencia.total_recebido_helper ?? undefined,
        totalAplicado: transparencia.total_aplicado ?? undefined,
        totalAplicadoHelper: transparencia.total_aplicado_helper ?? undefined,
        saldoDisponivel: transparencia.saldo_disponivel ?? undefined,
        saldoDisponivelHelper: transparencia.saldo_disponivel_helper ?? undefined,
        prestadoMes: transparencia.prestado_mes ?? undefined,
        prestadoMesHelper: transparencia.prestado_mes_helper ?? undefined,
        parecerConclusao: transparencia.parecer_conclusao ?? undefined,
        parecerTexto: transparencia.parecer_texto ?? undefined,
        parecerRessalvas: transparencia.parecer_ressalvas ?? undefined,
        parecerRecomendacoes: transparencia.parecer_recomendacoes ?? undefined,
        parecerResponsavel: transparencia.parecer_responsavel ?? undefined,
        parecerData: transparencia.parecer_data?.toISOString().slice(0, 10),
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
        })),
        despesas: despesas
            .filter((item) => item.transparencia_id === transparencia.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => ({
            id: toStringId(item.id),
            descricao: item.descricao,
            fornecedor: item.fornecedor ?? undefined,
            documentoFiscal: item.documento_fiscal ?? undefined,
            dataPagamento: item.data_pagamento?.toISOString().slice(0, 10),
            categoria: item.categoria ?? undefined,
            valor: item.valor ?? undefined,
            status: item.status ?? undefined
        })),
        parecerHistorico: parecerHistorico
            .filter((item) => item.transparencia_id === transparencia.id)
            .sort((a, b) => b.versao - a.versao)
            .map((item) => ({
            id: toStringId(item.id),
            versao: item.versao,
            conclusao: item.conclusao ?? undefined,
            parecerTexto: item.parecer_texto ?? undefined,
            ressalvas: item.ressalvas ?? undefined,
            recomendacoes: item.recomendacoes ?? undefined,
            responsavel: item.responsavel ?? undefined,
            dataParecer: item.data_parecer?.toISOString().slice(0, 10),
            usuarioNome: item.usuario_nome ?? undefined,
            criadoEm: item.criado_em.toISOString()
        }))
    };
}
