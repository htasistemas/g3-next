function asRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    return value;
}
export function mapOcorrenciaCriancaRowToResponse(row) {
    const payload = asRecord(row.payload);
    return {
        ...payload,
        id: String(row.id),
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapOcorrenciaCriancaAnexoRowToResponse(row) {
    return {
        id: String(row.id),
        ocorrenciaId: String(row.ocorrencia_id),
        nomeArquivo: row.nome_arquivo,
        tipoMime: row.tipo_mime,
        conteudoBase64: row.conteudo_base64,
        ordem: row.ordem,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
