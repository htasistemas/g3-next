import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { AuthRepository } from "../../auth/repositories/auth.repository.js";
import { mapInformacaoAdministrativa, mapInformacaoAdministrativaCategoria } from "../informacoes-administrativas.mapper.js";
import { informacaoAdministrativaCategoriaComSenhaSchema, informacaoAdministrativaComSenhaSchema, senhaConfirmacaoSchema } from "../informacoes-administrativas.schema.js";
import { InformacoesAdministrativasRepository } from "../repositories/informacoes-administrativas.repository.js";
export class InformacoesAdministrativasService {
    repository = new InformacoesAdministrativasRepository();
    authRepository = new AuthRepository();
    async listar(rawInput, authUser) {
        await this.confirmarAcesso(rawInput, authUser);
        const rows = await this.repository.listar(this.obterTenantId(authUser));
        return { informacoes: rows.map(mapInformacaoAdministrativa) };
    }
    async listarCategorias(rawInput, authUser) {
        const usuarioId = await this.confirmarAcesso(rawInput, authUser);
        const rows = await this.repository.listarCategorias(this.obterTenantId(authUser), usuarioId);
        return { categorias: rows.map(mapInformacaoAdministrativaCategoria) };
    }
    async criarCategoria(rawInput, authUser) {
        const input = informacaoAdministrativaCategoriaComSenhaSchema.parse(rawInput);
        const usuarioId = await this.confirmarAcesso(input, authUser);
        const row = await this.repository.criarCategoria(input, this.obterTenantId(authUser), usuarioId);
        return { categoria: mapInformacaoAdministrativaCategoria(row) };
    }
    async atualizarCategoria(id, rawInput, authUser) {
        const input = informacaoAdministrativaCategoriaComSenhaSchema.parse(rawInput);
        const usuarioId = await this.confirmarAcesso(input, authUser);
        const row = await this.repository.atualizarCategoria(this.parseId(id), input, this.obterTenantId(authUser), usuarioId);
        return { categoria: mapInformacaoAdministrativaCategoria(row) };
    }
    async removerCategoria(id, rawInput, authUser) {
        const usuarioId = await this.confirmarAcesso(rawInput, authUser);
        await this.repository.removerCategoria(this.parseId(id), this.obterTenantId(authUser), usuarioId);
        return { removido: true };
    }
    async criar(rawInput, authUser) {
        const input = informacaoAdministrativaComSenhaSchema.parse(rawInput);
        const usuarioId = await this.confirmarAcesso(input, authUser);
        const row = await this.repository.criar(input, this.obterTenantId(authUser), usuarioId);
        return { informacao: mapInformacaoAdministrativa(row) };
    }
    async atualizar(id, rawInput, authUser) {
        const input = informacaoAdministrativaComSenhaSchema.parse(rawInput);
        const usuarioId = await this.confirmarAcesso(input, authUser);
        const row = await this.repository.atualizar(this.parseId(id), input, this.obterTenantId(authUser), usuarioId);
        return { informacao: mapInformacaoAdministrativa(row) };
    }
    async remover(id, rawInput, authUser) {
        const usuarioId = await this.confirmarAcesso(rawInput, authUser);
        await this.repository.remover(this.parseId(id), this.obterTenantId(authUser), usuarioId);
        return { removido: true };
    }
    async confirmarAcesso(rawInput, authUser) {
        const input = senhaConfirmacaoSchema.parse(rawInput);
        const usuarioId = this.parseId(authUser.id);
        const usuario = await this.authRepository.buscarUsuarioPorId(usuarioId);
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 401);
        }
        const senhaValida = await bcrypt.compare(input.senhaConfirmacao, usuario.senhaHash);
        if (!senhaValida) {
            throw new AppError("Senha de confirmacao invalida.", 401);
        }
        await this.repository.registrarAuditoria(this.obterTenantId(authUser), null, usuarioId, "CONFIRMACAO_ACESSO");
        return usuarioId;
    }
    obterTenantId(authUser) {
        if (!authUser.tenant_id) {
            throw new AppError("Acesso restrito a usuario vinculado a uma instituicao.", 403);
        }
        return authUser.tenant_id;
    }
    parseId(id) {
        const numericId = Number(id);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(numericId);
    }
}
