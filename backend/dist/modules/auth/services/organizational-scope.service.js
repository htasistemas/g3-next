import { AppError } from "../../../shared/errors/app-error.js";
/**
 * Decide somente sobre autorização de escopo. Permissões de operação são
 * avaliadas separadamente por ensurePermissions.
 */
export function escopoPermite(acesso, contexto) {
    if (acesso.ativo === false)
        return false;
    if (!contexto.instituicao_id || acesso.instituicao_id !== contexto.instituicao_id)
        return false;
    if (acesso.escopo === "INSTITUICAO")
        return true;
    if (acesso.escopo === "ENTIDADE_JURIDICA") {
        return Boolean(contexto.entidade_juridica_id && acesso.entidade_juridica_id === contexto.entidade_juridica_id);
    }
    if (acesso.escopo === "UNIDADE") {
        return Boolean(contexto.unidade_id && acesso.unidade_id === contexto.unidade_id);
    }
    return Boolean(contexto.projeto_id && acesso.projeto_id === contexto.projeto_id);
}
export function exigirEscopo(acessos, contexto) {
    if (!acessos.some((acesso) => escopoPermite(acesso, contexto))) {
        throw new AppError("Usuário não possui autorização para este contexto organizacional.", 403);
    }
}
