import { toStringId } from "../../utils/string-utils.js";
export function mapInformacaoAdministrativa(row) {
    return {
        id: toStringId(row.id),
        categoria: row.categoria,
        titulo: row.titulo,
        descricao: row.descricao ?? "",
        usuarioAcesso: row.usuario_acesso ?? "",
        senhaAcesso: row.senha_acesso ?? "",
        link: row.link ?? "",
        observacoes: row.observacoes ?? "",
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
export function mapInformacaoAdministrativaCategoria(row) {
    return {
        id: row.id.toString(),
        nome: row.nome,
        ativo: row.ativo,
        criadoEm: row.criado_em.toISOString(),
        atualizadoEm: row.atualizado_em.toISOString()
    };
}
