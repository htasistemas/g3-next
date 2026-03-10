export function mapSenhaFilaRowToResponse(row) {
    return {
        id: Number(row.id),
        beneficiarioId: Number(row.beneficiario_id),
        nomeBeneficiario: row.nome_beneficiario,
        status: row.status,
        prioridade: Number(row.prioridade),
        dataHoraEntrada: row.data_hora_entrada.toISOString(),
        unidadeId: row.unidade_id ? Number(row.unidade_id) : undefined,
        salaAtendimento: row.sala_atendimento ?? undefined
    };
}
export function mapSenhaChamadaRowToResponse(row) {
    return {
        id: String(row.id),
        filaId: Number(row.fila_id),
        beneficiarioId: Number(row.beneficiario_id),
        nomeBeneficiario: row.nome_beneficiario,
        localAtendimento: row.local_atendimento,
        status: row.status,
        dataHoraChamada: row.data_hora_chamada.toISOString(),
        unidadeId: row.unidade_id ? Number(row.unidade_id) : undefined,
        chamadoPor: row.chamado_por
    };
}
export function mapSenhasConfigRowToResponse(row) {
    return {
        fraseFala: row.frase_fala,
        rssUrl: row.rss_url,
        velocidadeTicker: Number(row.velocidade_ticker),
        modoNoticias: row.modo_noticias,
        noticiasManuais: row.noticias_manuais,
        quantidadeUltimasChamadas: Number(row.quantidade_ultimas_chamadas),
        unidadePainelId: row.unidade_painel_id ? Number(row.unidade_painel_id) : null,
        tituloTela: row.titulo_tela,
        descricaoTela: row.descricao_tela
    };
}
