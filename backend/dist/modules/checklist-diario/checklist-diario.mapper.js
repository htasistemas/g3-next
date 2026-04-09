import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function formatarHora(value) {
    if (!value)
        return undefined;
    if (value instanceof Date)
        return value.toISOString().slice(11, 16);
    const texto = String(value).trim();
    return texto ? texto.slice(0, 5) : undefined;
}
export function mapChecklistModeloItem(item) {
    return {
        id: toStringId(item.id),
        diaSemana: item.dia_semana,
        titulo: item.titulo,
        descricaoDetalhada: item.descricao_detalhada ?? undefined,
        horarioPrevisto: formatarHora(item.horario_previsto),
        prioridade: item.prioridade,
        alertaAtivo: item.alerta_ativo,
        horarioAlerta: formatarHora(item.horario_alerta),
        observacaoObrigatoria: item.observacao_obrigatoria,
        atividadeCritica: item.atividade_critica,
        ordem: item.ordem,
        ativo: item.ativo,
        criadoEm: item.criado_em.toISOString(),
        atualizadoEm: item.atualizado_em.toISOString()
    };
}
export function mapChecklistModelo(modelo, itens) {
    return {
        id: toStringId(modelo.id),
        codigo: modelo.codigo ?? undefined,
        nome: modelo.nome,
        descricao: modelo.descricao ?? undefined,
        tipo: modelo.tipo,
        usuarioId: modelo.usuario_id ? Number(modelo.usuario_id) : undefined,
        unidadeId: modelo.unidade_id ? Number(modelo.unidade_id) : undefined,
        unidadeNome: modelo.unidade_nome ?? undefined,
        setor: modelo.setor ?? undefined,
        cargo: modelo.cargo ?? undefined,
        ativo: modelo.ativo,
        criadoEm: modelo.criado_em.toISOString(),
        atualizadoEm: modelo.atualizado_em.toISOString(),
        itens: itens.map(mapChecklistModeloItem)
    };
}
export function mapChecklistExecucao(row) {
    return {
        id: toStringId(row.id),
        modeloId: row.modelo_id ? toStringId(row.modelo_id) : undefined,
        modeloItemId: row.modelo_item_id ? toStringId(row.modelo_item_id) : undefined,
        modeloNome: row.modelo_nome ?? undefined,
        modeloTipo: row.modelo_tipo ?? undefined,
        usuarioId: Number(row.usuario_id),
        usuarioNome: row.usuario_nome ?? undefined,
        unidadeId: row.unidade_id ? Number(row.unidade_id) : undefined,
        unidadeNome: row.unidade_nome ?? undefined,
        setor: row.setor ?? undefined,
        cargo: row.cargo ?? undefined,
        referenciaData: toIsoDate(row.referencia_data) ?? "",
        semanaInicio: toIsoDate(row.semana_inicio) ?? "",
        diaSemana: row.dia_semana,
        tituloAtividade: row.titulo_atividade,
        descricaoDetalhada: row.descricao_detalhada ?? undefined,
        horarioPrevisto: formatarHora(row.horario_previsto),
        prioridade: row.prioridade,
        alertaAtivo: row.alerta_ativo,
        horarioAlerta: formatarHora(row.horario_alerta),
        observacaoObrigatoria: row.observacao_obrigatoria,
        atividadeCritica: row.atividade_critica,
        status: row.status,
        observacaoUsuario: row.observacao_usuario ?? undefined,
        concluidoEm: row.concluido_em?.toISOString(),
        concluidoPorUsuarioId: row.concluido_por_usuario_id ? Number(row.concluido_por_usuario_id) : undefined,
        concluidoPorNome: row.concluido_por_nome ?? undefined,
        dispensadoEm: row.dispensado_em?.toISOString(),
        dispensadoPorUsuarioId: row.dispensado_por_usuario_id ? Number(row.dispensado_por_usuario_id) : undefined,
        dispensadoPorNome: row.dispensado_por_nome ?? undefined,
        motivoDispensa: row.motivo_dispensa ?? undefined,
        naoAplicavelMotivo: row.nao_aplicavel_motivo ?? undefined,
        ativo: row.ativo,
        geradoAutomaticamente: row.gerado_automaticamente,
        origem: row.origem,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapChecklistHistorico(row) {
    return {
        id: toStringId(row.id),
        referenciaTipo: row.referencia_tipo,
        execucaoId: row.execucao_id ? toStringId(row.execucao_id) : undefined,
        modeloId: row.modelo_id ? toStringId(row.modelo_id) : undefined,
        modeloItemId: row.modelo_item_id ? toStringId(row.modelo_item_id) : undefined,
        configuracaoId: row.configuracao_id ? toStringId(row.configuracao_id) : undefined,
        acao: row.acao,
        statusAnterior: row.status_anterior ?? undefined,
        statusNovo: row.status_novo ?? undefined,
        usuarioResponsavelId: row.usuario_responsavel_id ? Number(row.usuario_responsavel_id) : undefined,
        usuarioResponsavelNome: row.usuario_responsavel_nome ?? undefined,
        observacao: row.observacao ?? undefined,
        motivo: row.motivo ?? undefined,
        origem: row.origem ?? undefined,
        dados: row.dados_json ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
export function mapChecklistConfiguracao(row) {
    return {
        id: toStringId(row.id),
        sabadoAtivo: row.sabado_ativo,
        domingoAtivo: row.domingo_ativo,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapChecklistIndicadores(row) {
    const total = Number(row?.total ?? 0);
    const concluidas = Number(row?.concluidas ?? 0);
    return {
        total,
        concluidas,
        pendentes: Number(row?.pendentes ?? 0),
        atrasadas: Number(row?.atrasadas ?? 0),
        dispensadas: Number(row?.dispensadas ?? 0),
        naoAplicaveis: Number(row?.nao_aplicaveis ?? 0),
        criticasNaoConcluidas: Number(row?.criticas_nao_concluidas ?? 0),
        percentualConclusao: total > 0 ? Math.round((concluidas / total) * 100) : 0
    };
}
