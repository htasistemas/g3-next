import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function parseJson(value) {
    if (!value)
        return undefined;
    try {
        return JSON.parse(value);
    }
    catch {
        return undefined;
    }
}
export function mapResumoCandidato(row) {
    return {
        candidatoId: Number(row.candidato_id),
        nomeCompleto: row.nome_completo,
        cpf: row.cpf ?? undefined,
        telefone: row.telefone ?? undefined,
        vagaPretendida: row.vaga_pretendida ?? undefined,
        ativo: !!row.ativo,
        processoId: row.processo_id ? Number(row.processo_id) : undefined,
        status: row.processo_status ?? undefined,
        atualizadoEm: row.processo_atualizado_em?.toISOString?.() ?? undefined
    };
}
export function mapCandidatoDetalhe(row) {
    return {
        id: Number(row.id),
        nomeCompleto: row.nome_completo,
        cpf: row.cpf ?? undefined,
        rg: row.rg ?? undefined,
        pis: row.pis ?? undefined,
        dataNascimento: toIsoDate(row.data_nascimento),
        naturalidade: row.naturalidade ?? undefined,
        estadoCivil: row.estado_civil ?? undefined,
        nomeMae: row.nome_mae ?? undefined,
        nomeConjuge: row.nome_conjuge ?? undefined,
        vagaPretendida: row.vaga_pretendida ?? undefined,
        dataPreenchimento: toIsoDate(row.data_preenchimento),
        filhosPossui: !!row.filhos_possui,
        filhos: parseJson(row.filhos_json),
        deficienciaPossui: !!row.deficiencia_possui,
        deficienciaTipo: row.deficiencia_tipo ?? undefined,
        deficienciaDescricao: row.deficiencia_descricao ?? undefined,
        endereco: parseJson(row.endereco_json),
        telefone: row.telefone ?? undefined,
        whatsapp: row.whatsapp ?? undefined,
        anexos: parseJson(row.anexos_json),
        ativo: !!row.ativo,
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.()
    };
}
export function mapProcesso(row) {
    return {
        id: Number(row.id),
        candidatoId: Number(row.candidato_id),
        status: row.status,
        responsavelId: row.responsavel_id ? Number(row.responsavel_id) : undefined,
        gestorId: row.gestor_id ? Number(row.gestor_id) : undefined,
        ultimaMovimentacaoEm: row.ultima_movimentacao_em?.toISOString?.() ?? undefined,
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.(),
        nomeCompleto: row.nome_completo ?? undefined,
        cpf: row.cpf ?? undefined,
        telefone: row.telefone ?? undefined,
        vagaPretendida: row.vaga_pretendida ?? undefined,
        ativo: row.ativo == null ? undefined : !!row.ativo
    };
}
export function mapEntrevista(row) {
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        tipoRoteiro: row.tipo_roteiro,
        perguntas: parseJson(row.perguntas_json),
        respostas: parseJson(row.respostas_json),
        parecer: row.parecer ?? undefined,
        observacoes: row.observacoes ?? undefined,
        dataEntrevista: row.data_entrevista ? row.data_entrevista.toISOString() : undefined,
        criadoPor: row.criado_por ? Number(row.criado_por) : undefined,
        criadoEm: row.criado_em?.toISOString?.()
    };
}
export function mapFicha(row) {
    if (!row)
        return null;
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        dadosPessoais: parseJson(row.dados_pessoais_json),
        dependentes: parseJson(row.dependentes_json),
        dadosInternos: parseJson(row.dados_internos_json),
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.()
    };
}
export function mapDocumento(row) {
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        tipoDocumento: row.tipo_documento,
        obrigatorio: !!row.obrigatorio,
        status: row.status,
        observacao: row.observacao ?? undefined,
        atualizadoPor: row.atualizado_por ? Number(row.atualizado_por) : undefined,
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.()
    };
}
export function mapArquivo(row) {
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        categoria: row.categoria,
        tipoDocumento: row.tipo_documento ?? undefined,
        nomeArquivo: row.nome_arquivo,
        mimeType: row.mime_type,
        tamanhoBytes: row.tamanho_bytes ? Number(row.tamanho_bytes) : 0,
        caminhoArquivo: row.caminho_arquivo ?? undefined,
        versao: row.versao,
        criadoPor: row.criado_por ? Number(row.criado_por) : undefined,
        criadoEm: row.criado_em?.toISOString?.()
    };
}
export function mapTermo(row) {
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        tipo: row.tipo,
        dados: parseJson(row.dados_json),
        statusAssinatura: row.status_assinatura ?? undefined,
        dataAssinatura: toIsoDate(row.data_assinatura),
        responsavel: row.responsavel ?? undefined,
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.()
    };
}
export function mapPpd(row) {
    if (!row)
        return null;
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        cabecalho: parseJson(row.cabecalho_json),
        ladoA: parseJson(row.lado_a_json),
        ladoB: parseJson(row.lado_b_json),
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.()
    };
}
export function mapCartaBanco(row) {
    if (!row)
        return null;
    return {
        id: Number(row.id),
        processoId: Number(row.processo_id),
        dados: parseJson(row.dados_json),
        criadoEm: row.criado_em?.toISOString?.(),
        atualizadoEm: row.atualizado_em?.toISOString?.()
    };
}
export function mapAuditoria(row) {
    return {
        id: toStringId(row.id),
        processoId: Number(row.processo_id),
        atorId: row.ator_id ? Number(row.ator_id) : undefined,
        atorNome: row.ator_nome ?? undefined,
        acao: row.acao,
        detalhes: row.detalhes ?? undefined,
        criadoEm: row.criado_em?.toISOString?.()
    };
}
