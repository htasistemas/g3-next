import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function splitMetasVinculadas(value) {
    return (value ?? "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
}
export function mapPlanoTrabalhoToResponse(plano, objetivosEspecificos, metas, etapas, aplicacaoRecursos, desembolso, checklistPrestacao) {
    return {
        id: toStringId(plano.id),
        codigoInterno: plano.codigo_interno,
        titulo: plano.titulo,
        tipoParceria: plano.tipo_parceria ?? undefined,
        orgaoParceiro: plano.orgao_parceiro ?? undefined,
        editalChamamento: plano.edital_chamamento ?? undefined,
        periodoInicio: toIsoDate(plano.periodo_inicio),
        periodoFim: toIsoDate(plano.periodo_fim),
        status: plano.status,
        responsavelTecnico: plano.responsavel_tecnico ?? undefined,
        responsavelLegal: plano.responsavel_legal ?? undefined,
        termoFomentoId: plano.termo_fomento_id ? toStringId(plano.termo_fomento_id) : undefined,
        numeroProcesso: plano.numero_processo ?? undefined,
        razaoSocial: plano.razao_social ?? undefined,
        nomeFantasia: plano.nome_fantasia ?? undefined,
        cnpj: plano.cnpj ?? undefined,
        cep: plano.cep ?? undefined,
        logradouro: plano.logradouro ?? undefined,
        numero: plano.numero ?? undefined,
        complemento: plano.complemento ?? undefined,
        bairro: plano.bairro ?? undefined,
        cidade: plano.cidade ?? undefined,
        uf: plano.uf ?? undefined,
        telefone: plano.telefone ?? undefined,
        email: plano.email ?? undefined,
        representanteLegal: plano.representante_legal ?? undefined,
        representanteCpf: plano.representante_cpf ?? undefined,
        representanteCargo: plano.representante_cargo ?? undefined,
        bancoNome: plano.banco_nome ?? undefined,
        bancoAgencia: plano.banco_agencia ?? undefined,
        bancoConta: plano.banco_conta ?? undefined,
        bancoOperacao: plano.banco_operacao ?? undefined,
        bancoPix: plano.banco_pix ?? undefined,
        bancoObservacao: plano.banco_observacao ?? undefined,
        historicoOsc: plano.historico_osc ?? undefined,
        finalidadeInstitucional: plano.finalidade_institucional ?? undefined,
        experienciaAnterior: plano.experiencia_anterior ?? undefined,
        conselhosCertificacoes: plano.conselhos_certificacoes ?? undefined,
        publicoAtendidoAtual: plano.publico_atendido_atual ?? undefined,
        capacidadeTecnicaOperacional: plano.capacidade_tecnica_operacional ?? undefined,
        descricaoObjeto: plano.descricao_objeto ?? undefined,
        areaAtuacao: plano.area_atuacao ?? undefined,
        localExecucao: plano.local_execucao ?? undefined,
        abrangenciaTerritorial: plano.abrangencia_territorial ?? undefined,
        publicoAlvo: plano.publico_alvo ?? undefined,
        quantidadeBeneficiarios: plano.quantidade_beneficiarios ?? undefined,
        criteriosSelecao: plano.criterios_selecao ?? undefined,
        problemaSocial: plano.problema_social ?? undefined,
        causasConsequencias: plano.causas_consequencias ?? undefined,
        dadosIndicadores: plano.dados_indicadores ?? undefined,
        capacidadeExecucao: plano.capacidade_execucao ?? undefined,
        impactoEsperado: plano.impacto_esperado ?? undefined,
        objetivoGeral: plano.objetivo_geral ?? undefined,
        objetivosEspecificos: objetivosEspecificos
            .filter((item) => item.plano_trabalho_id === plano.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => ({
            id: toStringId(item.id),
            descricao: item.descricao,
            resultadoEsperado: item.resultado_esperado ?? undefined,
            metasVinculadas: splitMetasVinculadas(item.metas_vinculadas)
        })),
        metas: metas
            .filter((meta) => meta.plano_trabalho_id === plano.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((meta) => ({
            id: toStringId(meta.id),
            numeroMeta: meta.numero_meta ?? "",
            descricao: meta.descricao,
            indicadorResultado: meta.indicador_resultado ?? undefined,
            unidadeMedida: meta.unidade_medida ?? undefined,
            quantidadePrevista: meta.quantidade_prevista ?? undefined,
            meioVerificacao: meta.meio_verificacao ?? undefined,
            dataInicio: toIsoDate(meta.data_inicio),
            dataFim: toIsoDate(meta.data_fim),
            responsavel: meta.responsavel ?? undefined,
            situacao: meta.situacao ?? undefined,
            etapas: etapas
                .filter((etapa) => etapa.meta_id === meta.id)
                .sort((a, b) => a.ordem - b.ordem)
                .map((etapa) => ({
                id: toStringId(etapa.id),
                nome: etapa.nome_etapa ?? "",
                acaoExecutar: etapa.acao_executar ?? undefined,
                descricaoDetalhada: etapa.descricao_detalhada ?? undefined,
                publicoAtendido: etapa.publico_atendido ?? undefined,
                quantidade: etapa.quantidade ?? undefined,
                unidade: etapa.unidade ?? undefined,
                local: etapa.local_execucao ?? undefined,
                dataInicio: toIsoDate(etapa.data_inicio),
                dataFim: toIsoDate(etapa.data_fim),
                valorEstimado: etapa.valor_estimado ?? undefined,
                documentoComprobatorioEsperado: etapa.documento_comprobatorio ?? undefined,
                responsavel: etapa.responsavel ?? undefined,
                situacao: etapa.situacao ?? undefined
            }))
        })),
        aplicacaoRecursos: aplicacaoRecursos
            .filter((item) => item.plano_trabalho_id === plano.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => ({
            id: toStringId(item.id),
            categoriaDespesa: item.categoria_despesa,
            item: item.item,
            descricao: item.descricao ?? undefined,
            quantidade: item.quantidade ?? undefined,
            unidade: item.unidade ?? undefined,
            valorUnitario: item.valor_unitario ?? undefined,
            valorTotal: item.valor_total ?? undefined,
            fonteRecurso: item.fonte_recurso ?? undefined,
            metaNumero: item.meta_numero ?? undefined,
            etapaNome: item.etapa_nome ?? undefined,
            naturezaDespesa: item.natureza_despesa ?? undefined,
            observacao: item.observacao ?? undefined
        })),
        desembolso: desembolso
            .filter((item) => item.plano_trabalho_id === plano.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => ({
            id: toStringId(item.id),
            mesAno: item.mes_ano,
            valorPrevisto: item.valor_previsto ?? undefined,
            fonteRecurso: item.fonte_recurso ?? undefined,
            metaNumero: item.meta_numero ?? undefined,
            observacao: item.observacao ?? undefined
        })),
        formaAcompanhamento: plano.forma_acompanhamento ?? undefined,
        indicadoresMonitoramento: plano.indicadores_monitoramento ?? undefined,
        periodicidadeMonitoramento: plano.periodicidade_monitoramento ?? undefined,
        responsavelColetaDados: plano.responsavel_coleta_dados ?? undefined,
        instrumentosMonitoramento: splitMetasVinculadas(plano.instrumentos_monitoramento),
        resultadoEsperadoMonitoramento: plano.resultado_esperado_monitoramento ?? undefined,
        evidenciasObrigatorias: plano.evidencias_obrigatorias ?? undefined,
        periodicidadePrestacao: plano.periodicidade_prestacao ?? undefined,
        dataLimitePrestacao: toIsoDate(plano.data_limite_prestacao),
        documentosExigidos: plano.documentos_exigidos ?? undefined,
        responsavelPrestacao: plano.responsavel_prestacao ?? undefined,
        observacoesPrestacao: plano.observacoes_prestacao ?? undefined,
        checklistPrestacao: checklistPrestacao
            .filter((item) => item.plano_trabalho_id === plano.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => ({
            id: toStringId(item.id),
            descricao: item.descricao,
            obrigatorio: item.obrigatorio,
            concluido: item.concluido
        })),
        localDeclaracao: plano.local_declaracao ?? undefined,
        dataDeclaracao: toIsoDate(plano.data_declaracao),
        nomeRepresentanteDeclaracao: plano.nome_representante_declaracao ?? undefined,
        cpfRepresentanteDeclaracao: plano.cpf_representante_declaracao ?? undefined,
        cargoRepresentanteDeclaracao: plano.cargo_representante_declaracao ?? undefined,
        declaracaoVeracidade: plano.declaracao_veracidade ?? false,
        aprovacaoInterna: plano.aprovacao_interna ?? undefined,
        situacaoAprovacao: plano.situacao_aprovacao ?? undefined,
        observacaoAprovador: plano.observacao_aprovador ?? undefined,
        arquivoFormato: plano.arquivo_formato ?? undefined,
        termoFomento: plano.termo_fomento_id
            ? {
                id: toStringId(plano.termo_fomento_id),
                numero: plano.termo_numero ?? "",
                objeto: plano.termo_objeto ?? undefined,
                responsavelIndicacao: plano.termo_responsavel_indicacao ?? undefined
            }
            : undefined
    };
}
