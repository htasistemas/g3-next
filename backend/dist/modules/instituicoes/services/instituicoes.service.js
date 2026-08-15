import { normalizeDigits, trimOrUndefined } from "../../../utils/string-utils.js";
import { instituicaoCreateSchema, instituicaoResetAdminSchema, instituicaoUpdateSchema } from "../instituicoes.schema.js";
import { InstituicoesRepository } from "../repositories/instituicoes.repository.js";
import { atualizarUsuarioSchema, criarUsuarioSchema, resetarSenhaUsuarioSchema } from "../../usuarios/usuario.schema.js";
function slugify(valor) {
    return valor
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
export class InstituicoesService {
    repository = new InstituicoesRepository();
    async listar() {
        return this.repository.listar();
    }
    async listarUsuarios(id) {
        return this.repository.listarUsuarios(id);
    }
    async criar(rawInput) {
        const input = instituicaoCreateSchema.parse(rawInput);
        return this.repository.criar({
            ...input,
            cnpj: normalizeDigits(input.cnpj) ?? input.cnpj,
            slug: slugify(input.slug || input.nome_fantasia || input.razao_social),
            codigo: trimOrUndefined(input.codigo)?.toUpperCase()
        });
    }
    async atualizar(id, rawInput) {
        const input = instituicaoUpdateSchema.parse(rawInput);
        return this.repository.atualizar(id, {
            ...input,
            cnpj: input.cnpj ? normalizeDigits(input.cnpj) ?? input.cnpj : undefined,
            slug: input.slug ? slugify(input.slug) : undefined,
            codigo: trimOrUndefined(input.codigo)?.toUpperCase()
        });
    }
    async resetarAdmin(id, rawInput) {
        const input = instituicaoResetAdminSchema.parse(rawInput);
        return this.repository.resetarSenhaAdmin(id, input.email, input.nova_senha);
    }
    async criarUsuario(id, rawInput, nomeUsuarioAtor, idAtor) {
        const input = criarUsuarioSchema.parse(rawInput);
        return this.repository.criarUsuario(id, input, nomeUsuarioAtor, idAtor);
    }
    async atualizarUsuario(id, usuarioId, rawInput, nomeUsuarioAtor, idAtor) {
        const input = atualizarUsuarioSchema.parse(rawInput);
        return this.repository.atualizarUsuario(id, usuarioId, input, nomeUsuarioAtor, idAtor);
    }
    async resetarSenhaUsuario(id, usuarioId, rawInput, nomeUsuarioAtor, idAtor) {
        const input = resetarSenhaUsuarioSchema.parse(rawInput);
        return this.repository.resetarSenhaUsuario(id, usuarioId, input, nomeUsuarioAtor, idAtor);
    }
    async desbloquearAcesso(id) {
        return this.repository.desbloquearAcesso(id);
    }
}
