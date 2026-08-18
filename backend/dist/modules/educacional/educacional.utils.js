export function listarIncompatibilidadesEnturmacao({ matricula, turma }) {
    const incompatibilidades = [];
    if (turma.ano_letivo_id !== matricula.ano_letivo_id)
        incompatibilidades.push("ano letivo");
    if (turma.unidade_id !== null && turma.unidade_id !== matricula.unidade_id)
        incompatibilidades.push("unidade de ensino");
    if (turma.etapa_id !== matricula.etapa_id)
        incompatibilidades.push("etapa");
    if (turma.serie_id !== matricula.serie_id)
        incompatibilidades.push("série");
    return incompatibilidades;
}
