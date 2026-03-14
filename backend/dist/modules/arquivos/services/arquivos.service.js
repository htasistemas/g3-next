import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "./storage-instance.js";
import { storagePolicies } from "./storage-policy.js";
export class ArquivosService {
    async listar(rawQuery) {
        return storageService.listar({
            entidadeTipo: this.toOptionalString(rawQuery.entidadeTipo),
            entidadeId: this.toOptionalString(rawQuery.entidadeId),
            categoria: this.toOptionalString(rawQuery.categoria),
            ativo: this.toOptionalString(rawQuery.ativo)
        });
    }
    async upload(request) {
        if (!request.file) {
            throw new AppError("Arquivo nao informado para upload.", 400);
        }
        const body = request.body;
        const scope = this.parseScope(body.scope);
        return storageService.salvarUpload(request.file, {
            scope,
            entidadeTipo: this.toOptionalString(body.entidadeTipo),
            entidadeId: this.toOptionalBigInt(body.entidadeId),
            usuarioUploadId: this.toOptionalBigInt(request.authUser?.id),
            observacao: this.toOptionalString(body.observacao)
        });
    }
    async obterPorId(rawId) {
        return storageService.obterPorId(rawId);
    }
    async obterConteudoPorId(rawId, usuarioId) {
        return storageService.obterConteudoPorId(rawId, this.toOptionalBigInt(usuarioId));
    }
    async obterConteudoPorCaminho(rawPath, usuarioId) {
        return storageService.obterConteudoPorCaminho(rawPath, this.toOptionalBigInt(usuarioId));
    }
    async excluir(rawId, usuarioId) {
        await storageService.excluirLogico(rawId, this.toOptionalBigInt(usuarioId));
    }
    parseScope(rawScope) {
        if (typeof rawScope !== "string" || !rawScope.trim()) {
            throw new AppError("Escopo de storage nao informado.", 400);
        }
        const scope = rawScope.trim();
        if (!(scope in storagePolicies)) {
            throw new AppError("Escopo de storage invalido.", 400);
        }
        return scope;
    }
    toOptionalString(rawValue) {
        return typeof rawValue === "string" && rawValue.trim() ? rawValue.trim() : undefined;
    }
    toOptionalBigInt(rawValue) {
        if (typeof rawValue !== "string" || !rawValue.trim()) {
            return undefined;
        }
        const parsed = Number(rawValue);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
        }
        return BigInt(parsed);
    }
}
