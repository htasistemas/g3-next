function asObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    return value;
}
function asArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => item && typeof item === "object");
}
export function mapVisitaRowToResponse(row) {
    return {
        id: Number(row.id),
        beneficiarioId: Number(row.beneficiario_id),
        beneficiarioNome: row.beneficiario_nome,
        unidade: row.unidade,
        responsavel: row.responsavel,
        dataVisita: row.data_visita.toISOString().slice(0, 10),
        horarioInicial: row.horario_inicial,
        horarioFinal: row.horario_final ?? undefined,
        tipoVisita: row.tipo_visita ?? undefined,
        situacao: row.situacao,
        usarEnderecoBeneficiario: row.usar_endereco_beneficiario,
        endereco: asObject(row.endereco),
        observacoesIniciais: row.observacoes_iniciais ?? undefined,
        condicoes: asObject(row.condicoes),
        situacaoSocial: asObject(row.situacao_social),
        registro: asObject(row.registro),
        anexos: asArray(row.anexos),
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
