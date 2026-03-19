function asRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    return value;
}
function asArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => item && typeof item === "object");
}
function toIsoDate(value) {
    return value ? value.toISOString().slice(0, 10) : undefined;
}
function toIsoDateTime(value) {
    return value ? value.toISOString() : undefined;
}
function toCount(value) {
    if (typeof value === "bigint")
        return Number(value);
    if (typeof value === "number")
        return value;
    return 0;
}
export function mapBancoEmpregosCandidato(row) {
    return {
        id: row.id.toString(),
        beneficiarioId: row.beneficiario_id?.toString(),
        nomeCompleto: row.nome_completo,
        cpf: row.cpf ?? undefined,
        rg: row.rg ?? undefined,
        dataNascimento: toIsoDate(row.data_nascimento),
        sexo: row.sexo ?? undefined,
        estadoCivil: row.estado_civil ?? undefined,
        telefone: row.telefone ?? undefined,
        whatsapp: row.whatsapp ?? undefined,
        email: row.email ?? undefined,
        cep: row.cep ?? undefined,
        endereco: row.endereco ?? undefined,
        bairro: row.bairro ?? undefined,
        cidade: row.cidade ?? undefined,
        uf: row.uf ?? undefined,
        escolaridade: row.escolaridade ?? undefined,
        cursos: row.cursos ?? undefined,
        formacaoComplementar: row.formacao_complementar ?? undefined,
        areaInteresse: row.area_interesse ?? undefined,
        cargoPretendido: row.cargo_pretendido ?? undefined,
        pretensaoSalarial: row.pretensao_salarial ?? undefined,
        disponibilidade: row.disponibilidade ?? undefined,
        possuiExperiencia: row.possui_experiencia,
        ultimaEmpresa: row.ultima_empresa ?? undefined,
        funcaoExercida: row.funcao_exercida ?? undefined,
        tempoExperiencia: row.tempo_experiencia ?? undefined,
        resumoProfissional: row.resumo_profissional ?? undefined,
        observacoes: row.observacoes ?? undefined,
        situacao: row.situacao,
        ativo: row.ativo,
        idade: row.idade ?? undefined,
        experiencias: asArray(row.experiencias_json).map((item) => ({
            empresa: item.empresa ? String(item.empresa) : undefined,
            cargo: item.cargo ? String(item.cargo) : undefined,
            dataInicio: item.dataInicio ? String(item.dataInicio) : undefined,
            dataFim: item.dataFim ? String(item.dataFim) : undefined,
            atividades: item.atividades ? String(item.atividades) : undefined,
            motivoSaida: item.motivoSaida ? String(item.motivoSaida) : undefined
        })),
        formacoes: asArray(row.formacoes_json).map((item) => ({
            curso: item.curso ? String(item.curso) : undefined,
            instituicao: item.instituicao ? String(item.instituicao) : undefined,
            situacao: item.situacao ? String(item.situacao) : undefined,
            anoConclusao: item.anoConclusao ? String(item.anoConclusao) : undefined
        })),
        habilidades: asArray(row.habilidades_json).map((item) => ({
            categoria: item.categoria ? String(item.categoria) : undefined,
            descricao: item.descricao ? String(item.descricao) : undefined,
            nivel: item.nivel ? String(item.nivel) : undefined
        })),
        curriculoExtraido: asRecord(row.curriculo_extraido_json),
        curriculoVersao: row.curriculo_versao,
        dataEnvioCurriculo: toIsoDateTime(row.data_envio_curriculo),
        totalDocumentos: toCount(row.total_documentos),
        totalCurriculos: toCount(row.total_curriculos),
        totalCertificados: toCount(row.total_certificados),
        criadoEm: toIsoDateTime(row.criado_em),
        atualizadoEm: toIsoDateTime(row.atualizado_em)
    };
}
export function mapBancoEmpregosVaga(row) {
    return {
        id: row.id.toString(),
        titulo: row.titulo,
        empresaNome: row.empresa_nome,
        area: row.area ?? undefined,
        quantidadeVagas: row.quantidade_vagas,
        requisitos: row.requisitos ?? undefined,
        escolaridadeMinima: row.escolaridade_minima ?? undefined,
        experienciaMinima: row.experiencia_minima ?? undefined,
        bairro: row.bairro ?? undefined,
        cidade: row.cidade ?? undefined,
        tipoContratacao: row.tipo_contratacao ?? undefined,
        jornada: row.jornada ?? undefined,
        faixaSalarial: row.faixa_salarial ?? undefined,
        beneficios: row.beneficios ?? undefined,
        observacoes: row.observacoes ?? undefined,
        dataAbertura: toIsoDate(row.data_abertura),
        dataLimite: toIsoDate(row.data_limite),
        situacao: row.situacao,
        projetoServico: row.projeto_servico ?? undefined,
        unidadeReferencia: row.unidade_referencia ?? undefined,
        criterios: asArray(row.criterios_json).map((item) => ({
            criterio: String(item.criterio ?? ""),
            peso: item.peso != null ? Number(item.peso) : undefined,
            nota: item.nota != null ? Number(item.nota) : undefined,
            observacao: item.observacao ? String(item.observacao) : undefined
        })),
        ativo: row.ativo,
        totalProcessos: toCount(row.total_processos),
        totalSelecionados: toCount(row.total_selecionados),
        totalContratados: toCount(row.total_contratados),
        criadoEm: toIsoDateTime(row.criado_em),
        atualizadoEm: toIsoDateTime(row.atualizado_em)
    };
}
export function mapBancoEmpregosAvaliacao(row) {
    if (!row)
        return null;
    return {
        id: row.id.toString(),
        processoId: row.processo_id.toString(),
        criterios: asArray(row.criterios_json).map((item) => ({
            criterio: String(item.criterio ?? ""),
            peso: item.peso != null ? Number(item.peso) : undefined,
            nota: item.nota != null ? Number(item.nota) : undefined,
            observacao: item.observacao ? String(item.observacao) : undefined
        })),
        notaFinal: row.nota_final,
        aderenciaPercentual: row.aderencia_percentual,
        observacaoGeral: row.observacao_geral ?? undefined,
        atualizadoPorId: row.atualizado_por_id?.toString(),
        atualizadoPorNome: row.atualizado_por_nome ?? undefined,
        criadoEm: toIsoDateTime(row.criado_em),
        atualizadoEm: toIsoDateTime(row.atualizado_em)
    };
}
export function mapBancoEmpregosProcesso(row, avaliacao) {
    return {
        id: row.id.toString(),
        vagaId: row.vaga_id.toString(),
        candidatoId: row.candidato_id.toString(),
        vagaTitulo: row.vaga_titulo ?? undefined,
        empresaNome: row.empresa_nome ?? undefined,
        candidatoNome: row.candidato_nome ?? undefined,
        candidatoBairro: row.candidato_bairro ?? undefined,
        candidatoCidade: row.candidato_cidade ?? undefined,
        candidatoSituacao: row.candidato_situacao ?? undefined,
        etapa: row.etapa,
        status: row.status,
        observacoes: row.observacoes ?? undefined,
        responsavelId: row.responsavel_id?.toString(),
        responsavelNome: row.responsavel_nome ?? undefined,
        dataMovimentacao: toIsoDateTime(row.data_movimentacao),
        dataEntrevista: toIsoDate(row.data_entrevista),
        dataEncaminhamento: toIsoDate(row.data_encaminhamento),
        selecionado: row.selecionado,
        contratado: row.contratado,
        ativo: row.ativo,
        notaFinal: avaliacao?.nota_final ?? row.nota_final ?? undefined,
        aderenciaPercentual: avaliacao?.aderencia_percentual ?? row.aderencia_percentual ?? undefined,
        avaliacaoObservacao: avaliacao?.observacao_geral ?? row.avaliacao_observacao ?? undefined,
        avaliacao: mapBancoEmpregosAvaliacao(avaliacao),
        criadoEm: toIsoDateTime(row.criado_em),
        atualizadoEm: toIsoDateTime(row.atualizado_em)
    };
}
export function mapBancoEmpregosDocumento(row) {
    return {
        id: row.id.toString(),
        candidatoId: row.candidato_id.toString(),
        arquivoId: row.arquivo_id.toString(),
        categoria: row.categoria,
        descricao: row.descricao ?? undefined,
        versao: row.versao,
        principal: row.principal,
        extraido: asRecord(row.extraido_json),
        ativo: row.ativo,
        nomeOriginal: row.nome_original,
        nomeArquivo: row.nome_arquivo,
        caminhoArquivo: row.caminho_arquivo,
        mimeType: row.mime_type,
        tamanhoBytes: Number(row.tamanho_bytes),
        dataUpload: toIsoDateTime(row.data_upload),
        criadoEm: toIsoDateTime(row.criado_em),
        atualizadoEm: toIsoDateTime(row.atualizado_em)
    };
}
export function mapBancoEmpregosHistorico(row) {
    return {
        id: row.id.toString(),
        entidadeTipo: row.entidade_tipo,
        entidadeId: row.entidade_id.toString(),
        candidatoId: row.candidato_id?.toString(),
        vagaId: row.vaga_id?.toString(),
        processoId: row.processo_id?.toString(),
        usuarioId: row.usuario_id?.toString(),
        usuarioNome: row.usuario_nome ?? undefined,
        acao: row.acao,
        observacao: row.observacao ?? undefined,
        criadoEm: toIsoDateTime(row.criado_em)
    };
}
