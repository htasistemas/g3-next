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
export function mapJobRowToResponse(row) {
    const dadosVaga = asRecord(row.dados_vaga);
    const empresaLocal = asRecord(row.empresa_local);
    const requisitos = asRecord(row.requisitos);
    const encaminhamentos = asArray(row.encaminhamentos).map((item, index) => ({
        id: String(item.id ?? `enc-${index + 1}`),
        beneficiarioId: String(item.beneficiarioId ?? ""),
        beneficiarioNome: String(item.beneficiarioNome ?? ""),
        data: String(item.data ?? ""),
        status: String(item.status ?? ""),
        observacoes: item.observacoes ? String(item.observacoes) : undefined
    }));
    return {
        id: String(row.id),
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString(),
        dadosVaga: {
            titulo: String(dadosVaga.titulo ?? ""),
            area: dadosVaga.area ? String(dadosVaga.area) : undefined,
            tipo: dadosVaga.tipo ? String(dadosVaga.tipo) : undefined,
            nivel: dadosVaga.nivel ? String(dadosVaga.nivel) : undefined,
            modelo: dadosVaga.modelo ? String(dadosVaga.modelo) : undefined,
            status: String(dadosVaga.status ?? "Aberta"),
            dataAbertura: dadosVaga.dataAbertura ? String(dadosVaga.dataAbertura) : undefined,
            dataEncerramento: dadosVaga.dataEncerramento ? String(dadosVaga.dataEncerramento) : undefined,
            tipoContrato: dadosVaga.tipoContrato ? String(dadosVaga.tipoContrato) : undefined,
            cargaHoraria: dadosVaga.cargaHoraria ? String(dadosVaga.cargaHoraria) : undefined,
            salario: dadosVaga.salario ? String(dadosVaga.salario) : undefined,
            beneficios: dadosVaga.beneficios ? String(dadosVaga.beneficios) : undefined
        },
        empresaLocal: Object.keys(empresaLocal).length
            ? {
                nomeEmpresa: String(empresaLocal.nomeEmpresa ?? ""),
                cnpj: empresaLocal.cnpj ? String(empresaLocal.cnpj) : undefined,
                responsavel: empresaLocal.responsavel ? String(empresaLocal.responsavel) : undefined,
                telefone: empresaLocal.telefone ? String(empresaLocal.telefone) : undefined,
                email: empresaLocal.email ? String(empresaLocal.email) : undefined,
                endereco: empresaLocal.endereco ? String(empresaLocal.endereco) : undefined,
                bairro: empresaLocal.bairro ? String(empresaLocal.bairro) : undefined,
                cidade: empresaLocal.cidade ? String(empresaLocal.cidade) : undefined,
                uf: empresaLocal.uf ? String(empresaLocal.uf) : undefined
            }
            : undefined,
        requisitos: Object.keys(requisitos).length
            ? {
                escolaridade: requisitos.escolaridade ? String(requisitos.escolaridade) : undefined,
                experiencia: requisitos.experiencia ? String(requisitos.experiencia) : undefined,
                habilidades: requisitos.habilidades ? String(requisitos.habilidades) : undefined,
                requisitos: requisitos.requisitos ? String(requisitos.requisitos) : undefined,
                descricao: requisitos.descricao ? String(requisitos.descricao) : undefined,
                observacoes: requisitos.observacoes ? String(requisitos.observacoes) : undefined
            }
            : undefined,
        encaminhamentos
    };
}
export function mapJobCandidatoRowToResponse(row) {
    return {
        id: String(row.id),
        empregoId: String(row.emprego_id),
        beneficiarioId: row.beneficiario_id,
        beneficiarioNome: row.beneficiario_nome,
        necessidadesProfissionais: row.necessidades_profissionais ?? undefined,
        status: row.status ?? undefined,
        curriculoNome: row.curriculo_nome ?? undefined,
        curriculoTipo: row.curriculo_tipo ?? undefined,
        curriculoConteudo: row.curriculo_conteudo ?? undefined,
        criadoEm: row.criado_em.toISOString()
    };
}
