export function mapLivroRowToResponse(row) {
    return {
        id: String(row.id),
        codigo: row.codigo,
        titulo: row.titulo,
        autor: row.autor,
        isbn: row.isbn ?? undefined,
        editora: row.editora ?? undefined,
        anoPublicacao: row.ano_publicacao ?? undefined,
        categoria: row.categoria ?? undefined,
        quantidadeTotal: Number(row.quantidade_total),
        quantidadeDisponivel: Number(row.quantidade_disponivel),
        localizacao: row.localizacao ?? undefined,
        status: row.status,
        estadoLivro: row.estado_livro ?? undefined,
        observacoes: row.observacoes ?? undefined,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapEmprestimoRowToResponse(row) {
    return {
        id: String(row.id),
        livroId: String(row.livro_id),
        livroTitulo: row.livro_titulo,
        livroCodigo: row.livro_codigo,
        beneficiarioId: row.beneficiario_id ?? undefined,
        beneficiarioNome: row.beneficiario_nome ?? undefined,
        responsavelId: row.responsavel_id ?? undefined,
        responsavelNome: row.responsavel_nome ?? undefined,
        dataEmprestimo: row.data_emprestimo.toISOString().slice(0, 10),
        dataDevolucaoPrevista: row.data_devolucao_prevista.toISOString().slice(0, 10),
        dataDevolucaoReal: row.data_devolucao_real ? row.data_devolucao_real.toISOString().slice(0, 10) : undefined,
        status: row.status,
        observacoes: row.observacoes ?? undefined
    };
}
