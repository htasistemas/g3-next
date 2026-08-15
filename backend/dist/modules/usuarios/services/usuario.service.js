import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoUsuario } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { parseBase64Payload } from "../../arquivos/services/storage-utils.js";
import { gerarAssinaturaFace } from "../../registro-ponto/services/registro-ponto-face.js";
import { atualizarStatusUsuarioSchema, atualizarUsuarioSchema, criarUsuarioSchema, resetarSenhaUsuarioSchema, usuarioFaceSchema, usuarioFiltersSchema } from "../usuario.schema.js";
import { mapPermissoesParaCatalogo } from "../usuario.mapper.js";
import { UsuarioRepository } from "../repositories/usuario.repository.js";
import { UsuarioAcessoRepository } from "../repositories/usuario-acesso.repository.js";
export class UsuarioService {
    repository = new UsuarioRepository();
    acessoRepository = new UsuarioAcessoRepository();
    async listarAcessos(rawId, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        return this.acessoRepository.listar(id.toString(), ator.instituicao_id);
    }
    async substituirAcessos(rawId, rawInput, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        const input = rawInput && typeof rawInput === "object" ? rawInput : {};
        if (!Array.isArray(input.acessos))
            throw new AppError("Informe a lista de escopos de acesso.", 422);
        return this.acessoRepository.substituir(id.toString(), ator.instituicao_id, input.acessos);
    }
    async listarCatalogoAcessos(atorRaw) {
        const ator = this.parseAtor(atorRaw);
        return this.acessoRepository.listarCatalogo(ator.instituicao_id);
    }
    async listar(rawFilters, atorRaw) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome: "nomePessoa",
                setor: "instituicao",
                unidade: "instituicao"
            })
            : rawFilters;
        const filters = usuarioFiltersSchema.parse(filtersNormalizados);
        const ator = this.parseAtor(atorRaw);
        return this.repository.listar(filters, ator.tenant_id);
    }
    async buscarPorId(rawId, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarPorId(id, ator.tenant_id);
    }
    async listarPermissoes() {
        const permissoes = await this.repository.listarPermissoes();
        return mapPermissoesParaCatalogo(permissoes);
    }
    async buscarFace(rawId, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarFacePorId(id, ator.tenant_id);
    }
    async salvarFace(rawId, rawInput, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        const input = usuarioFaceSchema.parse(rawInput ?? {});
        const { buffer } = parseBase64Payload(input.face_imagem, "image/jpeg");
        const faceHash = await gerarAssinaturaFace(buffer);
        const resultado = await storageService.salvarArquivo({
            scope: "colaborador_face",
            conteudo: input.face_imagem,
            nomeOriginal: `usuario-${id.toString()}-face.jpg`,
            mimeType: "image/jpeg",
            entidadeId: id,
            usuarioUploadId: ator.id,
            tenantId: ator.tenant_id,
            observacao: "Cadastro de face do usuario pela tela de usuarios"
        });
        try {
            const { status, caminhoAnterior } = await this.repository.salvarFacePorId(id, faceHash, resultado.caminhoArquivo, ator);
            await storageService.vincularEntidade(resultado.caminhoArquivo, id, ator.tenant_id);
            if (caminhoAnterior &&
                this.isManagedStoragePath(caminhoAnterior) &&
                caminhoAnterior !== resultado.caminhoArquivo) {
                await storageService.desativarPorCaminho(caminhoAnterior, ator.id, ator.tenant_id);
            }
            return {
                mensagem: "Biometria facial cadastrada com sucesso.",
                ...status
            };
        }
        catch (error) {
            await storageService.rollbackArquivos([resultado.caminhoArquivo], ator.tenant_id);
            throw error;
        }
    }
    async criar(rawInput, atorRaw) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = criarUsuarioSchema.parse(inputNormalizado);
        const ator = this.parseAtor(atorRaw);
        const senhaHash = await bcrypt.hash(input.senha, 10);
        return this.repository.criar(input, senhaHash, ator);
    }
    async atualizar(rawId, rawInput, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = atualizarUsuarioSchema.parse(inputNormalizado);
        return this.repository.atualizar(id, input, ator);
    }
    async atualizarStatus(rawId, rawInput, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        const input = atualizarStatusUsuarioSchema.parse(rawInput);
        return this.repository.atualizarStatus(id, input.status, ator);
    }
    async resetarSenha(rawId, rawInput, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        const input = resetarSenhaUsuarioSchema.parse(rawInput);
        const novaSenhaHash = await bcrypt.hash(input.nova_senha, 10);
        return this.repository.resetarSenha(id, novaSenhaHash, !!input.exigir_troca_senha, ator);
    }
    async remover(rawId, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        return this.repository.remover(id, ator);
    }
    async removerFace(rawId, atorRaw) {
        const id = this.parseId(rawId);
        const ator = this.parseAtor(atorRaw);
        await this.validarProtecaoAdmin(id, ator.tenant_id);
        const { status, caminhoAnterior } = await this.repository.removerFacePorId(id, ator);
        if (caminhoAnterior && this.isManagedStoragePath(caminhoAnterior)) {
            await storageService.desativarPorCaminho(caminhoAnterior, ator.id, ator.tenant_id);
        }
        return {
            mensagem: "Biometria facial removida com sucesso.",
            ...status
        };
    }
    async validarProtecaoAdmin(id, tenantId) {
        const resultado = await this.repository.buscarPorId(id, tenantId);
        const emailAdmin = "htasistemas@gmail.com";
        if (resultado.usuario.email?.toLowerCase() === emailAdmin) {
            throw new AppError("Este usuario possui acesso administrador restrito e nao pode ser alterado ou removido.", 403);
        }
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador de usuario invalido.", 400);
        }
        return BigInt(id);
    }
    parseAtor(atorRaw) {
        const nome_usuario = atorRaw.nomeUsuario?.trim() || "sistema";
        const idNumerico = Number(atorRaw.id);
        const id = Number.isInteger(idNumerico) && idNumerico > 0
            ? BigInt(idNumerico)
            : undefined;
        const tenant_id = atorRaw.tenant_id?.trim();
        const instituicao_id = atorRaw.instituicao_id?.trim();
        if (!tenant_id || !instituicao_id) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return {
            id,
            nome_usuario,
            tenant_id,
            instituicao_id
        };
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoUsuario);
    }
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
}
