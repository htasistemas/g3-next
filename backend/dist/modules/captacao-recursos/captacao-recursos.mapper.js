import { toStringId } from "../../utils/string-utils.js";
function toNumber(value) {
    if (value == null)
        return 0;
    if (typeof value === "number")
        return value;
    return Number(value);
}
function toOptionalString(value) {
    if (value == null)
        return undefined;
    const stringValue = String(value);
    return stringValue.length ? stringValue : undefined;
}
function toOptionalDateTime(value) {
    if (!value)
        return undefined;
    if (value instanceof Date)
        return value.toISOString();
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
function toOptionalDate(value) {
    if (!value)
        return undefined;
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    const text = String(value);
    const iso = text.match(/^(\d{4}-\d{2}-\d{2})/u);
    return iso ? iso[1] : text;
}
export function mapCaptacaoDoador(row) {
    return {
        id: toStringId(row.id),
        uuid: toOptionalString(row.uuid) ?? "",
        tipoDoador: toOptionalString(row.tipo_doador) ?? "pessoa_fisica",
        nome: toOptionalString(row.nome) ?? "",
        nomeFantasia: toOptionalString(row.nome_fantasia),
        cpfCnpj: toOptionalString(row.cpf_cnpj),
        dataNascimentoFundacao: toOptionalDate(row.data_nascimento_fundacao),
        emailPrincipal: toOptionalString(row.email_principal),
        emailSecundario: toOptionalString(row.email_secundario),
        telefone: toOptionalString(row.telefone),
        whatsapp: toOptionalString(row.whatsapp),
        enderecoCompleto: toOptionalString(row.endereco_completo),
        bairro: toOptionalString(row.bairro),
        cidade: toOptionalString(row.cidade),
        uf: toOptionalString(row.uf),
        cep: toOptionalString(row.cep),
        observacoes: toOptionalString(row.observacoes),
        origemCadastro: toOptionalString(row.origem_cadastro),
        status: toOptionalString(row.status) ?? "ativo",
        aceitouLgpd: Boolean(row.aceitou_lgpd),
        dataAceiteLgpd: toOptionalDate(row.data_aceite_lgpd),
        aceitaEmail: Boolean(row.aceita_email),
        aceitaWhatsapp: Boolean(row.aceita_whatsapp),
        aceitaReceberCampanhas: Boolean(row.aceita_receber_campanhas),
        categoriaDoador: toOptionalString(row.categoria_doador),
        segmentoRelacionamento: toOptionalString(row.segmento_relacionamento),
        statusRetencao: toOptionalString(row.status_retencao),
        motivoRisco: toOptionalString(row.motivo_risco),
        proximaAcaoSugerida: toOptionalString(row.proxima_acao_sugerida),
        scoreRelacionamento: toNumber(row.score_relacionamento),
        responsavelRelacionamento: toOptionalString(row.responsavel_relacionamento),
        observacoesInternas: toOptionalString(row.observacoes_internas),
        portalAtivo: Boolean(row.portal_ativo),
        anexoPrincipalCaminho: toOptionalString(row.anexo_principal_caminho),
        totalDoado: toNumber(row.total_doado),
        quantidadeDoacoes: toNumber(row.quantidade_doacoes),
        ticketMedio: toNumber(row.ticket_medio),
        ultimaDoacao: toOptionalDateTime(row.ultima_doacao),
        maiorDoacao: toNumber(row.maior_doacao),
        campanhasApoiadas: toNumber(row.campanhas_apoiadas),
        recorrenciaAtiva: Boolean(row.recorrencia_ativa),
        createdAt: toOptionalDateTime(row.created_at),
        updatedAt: toOptionalDateTime(row.updated_at)
    };
}
export function mapCaptacaoTarefaRelacionamento(row) {
    return {
        id: toStringId(row.id),
        uuid: toOptionalString(row.uuid) ?? "",
        doadorId: toOptionalString(row.doador_id) ?? "",
        titulo: toOptionalString(row.titulo) ?? "",
        descricao: toOptionalString(row.descricao),
        status: toOptionalString(row.status) ?? "pendente",
        prioridade: toOptionalString(row.prioridade) ?? "media",
        tipo: toOptionalString(row.tipo) ?? "follow_up",
        responsavel: toOptionalString(row.responsavel),
        dataPrevista: toOptionalDate(row.data_prevista),
        concluidaEm: toOptionalDateTime(row.concluida_em),
        origem: toOptionalString(row.origem) ?? "manual",
        createdAt: toOptionalDateTime(row.created_at),
        updatedAt: toOptionalDateTime(row.updated_at)
    };
}
export function mapCaptacaoCampanha(row) {
    const metaFinanceira = toNumber(row.meta_financeira);
    const totalArrecadado = toNumber(row.total_arrecadado || row.valor_arrecadado);
    const percentualAtingido = toNumber(row.percentual_atingido);
    const diasRestantes = row.data_final
        ? Math.ceil((new Date(String(row.data_final)).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
        : undefined;
    return {
        id: toStringId(row.id),
        uuid: toOptionalString(row.uuid) ?? "",
        nome: toOptionalString(row.nome) ?? "",
        descricaoCurta: toOptionalString(row.descricao_curta),
        descricaoCompleta: toOptionalString(row.descricao_completa),
        objetivo: toOptionalString(row.objetivo),
        metaFinanceira,
        valorArrecadado: totalArrecadado,
        percentualAtingido,
        valorFaltante: Math.max(0, metaFinanceira - totalArrecadado),
        dataInicial: toOptionalDate(row.data_inicial),
        dataFinal: toOptionalDate(row.data_final),
        status: toOptionalString(row.status) ?? "rascunho",
        imagemBanner: toOptionalString(row.imagem_banner),
        corDestaque: toOptionalString(row.cor_destaque) ?? "#0f766e",
        tipo: toOptionalString(row.tipo) ?? "institucional",
        responsavel: toOptionalString(row.responsavel),
        destaqueNoPortal: Boolean(row.destaque_no_portal),
        visivelAoPublico: Boolean(row.visivel_ao_publico),
        urlPublica: toOptionalString(row.url_publica),
        qrCodePublico: toOptionalString(row.qr_code_publico),
        mensagemAgradecimento: toOptionalString(row.mensagem_agradecimento),
        totalDoacoes: toNumber(row.total_doacoes),
        totalDoadores: toNumber(row.total_doadores),
        diasRestantes,
        metaAtingida: percentualAtingido >= 100,
        createdAt: toOptionalDateTime(row.created_at),
        updatedAt: toOptionalDateTime(row.updated_at)
    };
}
export function mapCaptacaoRecorrencia(row) {
    return {
        id: toStringId(row.id),
        uuid: toOptionalString(row.uuid) ?? "",
        doadorId: toOptionalString(row.doador_id),
        campanhaId: toOptionalString(row.campanha_id),
        campanhaNome: toOptionalString(row.campanha_nome),
        valorRecorrente: toNumber(row.valor_recorrente),
        periodicidade: toOptionalString(row.periodicidade) ?? "mensal",
        formaPagamento: toOptionalString(row.forma_pagamento) ?? "pix",
        dataProximaCobranca: toOptionalDate(row.data_proxima_cobranca),
        quantidadeCiclos: row.quantidade_ciclos == null ? undefined : toNumber(row.quantidade_ciclos),
        ciclosPagos: toNumber(row.ciclos_pagos),
        semPrevisaoTermino: Boolean(row.sem_previsao_termino),
        status: toOptionalString(row.status) ?? "ativa",
        referenciaExterna: toOptionalString(row.referencia_externa),
        createdAt: toOptionalDateTime(row.created_at),
        updatedAt: toOptionalDateTime(row.updated_at)
    };
}
export function mapCaptacaoDoacao(row) {
    return {
        id: toStringId(row.id),
        uuid: toOptionalString(row.uuid) ?? "",
        numeroDoacao: toOptionalString(row.numero_doacao) ?? "",
        dataHora: toOptionalDateTime(row.data_hora),
        doadorId: toOptionalString(row.doador_id),
        doadorNome: toOptionalString(row.doador_nome),
        campanhaId: toOptionalString(row.campanha_id),
        campanhaNome: toOptionalString(row.campanha_nome),
        recorrenciaId: toOptionalString(row.recorrencia_id),
        recorrenciaStatus: toOptionalString(row.recorrencia_status),
        valor: toNumber(row.valor),
        valorLiquido: toNumber(row.valor_liquido),
        valorTaxas: toNumber(row.valor_taxas),
        tipoDoacao: toOptionalString(row.tipo_doacao) ?? "unica",
        formaPagamento: toOptionalString(row.forma_pagamento) ?? "pix",
        situacao: toOptionalString(row.situacao) ?? "pendente",
        origem: toOptionalString(row.origem) ?? "administrativo",
        identificadorExterno: toOptionalString(row.identificador_externo),
        txid: toOptionalString(row.txid),
        linkPagamento: toOptionalString(row.link_pagamento),
        dataVencimento: toOptionalDate(row.data_vencimento),
        observacoesInternas: toOptionalString(row.observacoes_internas),
        usuarioResponsavel: toOptionalString(row.usuario_responsavel),
        comprovanteGerado: Boolean(row.comprovante_gerado),
        qrCodeSvg: toOptionalString(row.qr_code_svg),
        payloadPix: toOptionalString(row.payload_pix),
        linhaDigitavel: toOptionalString(row.linha_digitavel),
        codigoBarras: toOptionalString(row.codigo_barras),
        cartaoReferencia: toOptionalString(row.cartao_referencia),
        createdAt: toOptionalDateTime(row.created_at),
        updatedAt: toOptionalDateTime(row.updated_at)
    };
}
export function mapCaptacaoComprovante(row) {
    return {
        id: toStringId(row.id),
        uuid: toOptionalString(row.uuid) ?? "",
        doacaoId: toOptionalString(row.doacao_id),
        doadorId: toOptionalString(row.doador_id),
        campanhaId: toOptionalString(row.campanha_id),
        numeroComprovante: toOptionalString(row.numero_comprovante) ?? "",
        codigoValidacao: toOptionalString(row.codigo_validacao) ?? "",
        arquivoCaminho: toOptionalString(row.arquivo_caminho),
        enviadoEmail: Boolean(row.enviado_email),
        dataEnvioEmail: toOptionalDateTime(row.data_envio_email),
        mensagemAgradecimento: toOptionalString(row.mensagem_agradecimento),
        numeroDoacao: toOptionalString(row.numero_doacao),
        valorLiquido: toNumber(row.valor_liquido),
        formaPagamento: toOptionalString(row.forma_pagamento),
        dataHora: toOptionalDateTime(row.data_hora),
        doadorNome: toOptionalString(row.doador_nome),
        campanhaNome: toOptionalString(row.campanha_nome),
        createdAt: toOptionalDateTime(row.created_at),
        updatedAt: toOptionalDateTime(row.updated_at)
    };
}
export function mapCaptacaoConfiguracoes(row) {
    return {
        moduloHabilitado: Boolean(row?.modulo_habilitado ?? true),
        portalDoadorHabilitado: Boolean(row?.portal_doador_habilitado ?? true),
        campanhasPublicasHabilitadas: Boolean(row?.campanhas_publicas_habilitadas ?? true),
        doacoesRecorrentesHabilitadas: Boolean(row?.doacoes_recorrentes_habilitadas ?? true),
        envioAutomaticoComprovantes: Boolean(row?.envio_automatico_comprovantes ?? true),
        pixChave: toOptionalString(row?.pix_chave),
        pixRecebedor: toOptionalString(row?.pix_recebedor),
        pixCidade: toOptionalString(row?.pix_cidade),
        pixAmbiente: toOptionalString(row?.pix_ambiente) ?? "sandbox",
        pixWebhookUrl: toOptionalString(row?.pix_webhook_url),
        pixExpiracaoMinutos: toNumber(row?.pix_expiracao_minutos ?? 1440),
        pixProvider: toOptionalString(row?.pix_provider) ?? "mock-g3n",
        cartaoProvider: toOptionalString(row?.cartao_provider) ?? "mock-g3n",
        cartaoAmbiente: toOptionalString(row?.cartao_ambiente) ?? "sandbox",
        cartaoChavePublica: toOptionalString(row?.cartao_chave_publica),
        cartaoChavePrivadaRef: toOptionalString(row?.cartao_chave_privada_ref),
        cartaoTentativasFalha: toNumber(row?.cartao_tentativas_falha ?? 2),
        boletoProvider: toOptionalString(row?.boleto_provider) ?? "mock-g3n",
        boletoAmbiente: toOptionalString(row?.boleto_ambiente) ?? "sandbox",
        boletoPrazoVencimentoDias: toNumber(row?.boleto_prazo_vencimento_dias ?? 5),
        boletoInstrucao: toOptionalString(row?.boleto_instrucao),
        mensagemAgradecimento: toOptionalString(row?.mensagem_agradecimento),
        modeloComprovante: toOptionalString(row?.modelo_comprovante),
        modeloEmailCobranca: toOptionalString(row?.modelo_email_cobranca),
        modeloLembrete: toOptionalString(row?.modelo_lembrete),
        modeloCampanha: toOptionalString(row?.modelo_campanha),
        lgpdTermoConsentimento: toOptionalString(row?.lgpd_termo_consentimento),
        lgpdPoliticaPrivacidade: toOptionalString(row?.lgpd_politica_privacidade),
        lgpdBaseLegal: toOptionalString(row?.lgpd_base_legal)
    };
}
export function mapCaptacaoLog(row) {
    return {
        id: toStringId(row.id),
        entidadeTipo: toOptionalString(row.entidade_tipo) ?? "",
        entidadeId: toOptionalString(row.entidade_id),
        acao: toOptionalString(row.acao) ?? "",
        descricao: toOptionalString(row.descricao) ?? "",
        detalhesJson: row.detalhes_json ?? {},
        createdAt: toOptionalDateTime(row.created_at),
        createdBy: toOptionalString(row.created_by)
    };
}
