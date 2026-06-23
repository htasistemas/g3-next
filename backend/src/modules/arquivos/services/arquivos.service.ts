import type { Request } from "express";
import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "./storage-instance.js";
import { storagePolicies, type StorageScopeKey } from "./storage-policy.js";

export class ArquivosService {
  async listar(rawQuery: Record<string, unknown>, tenantId?: string) {
    return storageService.listar({
      tenantId: this.requireTenantId(tenantId),
      entidadeTipo: this.toOptionalString(rawQuery.entidadeTipo),
      entidadeId: this.toOptionalString(rawQuery.entidadeId),
      categoria: this.toOptionalString(rawQuery.categoria),
      ativo: this.toOptionalString(rawQuery.ativo)
    });
  }

  async upload(request: Request & { authUser?: { id: string; tenant_id?: string }; file?: Express.Multer.File }) {
    if (!request.file) {
      throw new AppError("Arquivo nao informado para upload.", 400);
    }

    const body = request.body as Record<string, unknown>;
    const scope = this.parseScope(body.scope);
    return storageService.salvarUpload(request.file, {
      scope,
      entidadeTipo: this.toOptionalString(body.entidadeTipo),
      entidadeId: this.toOptionalBigInt(body.entidadeId),
      usuarioUploadId: this.toOptionalBigInt(request.authUser?.id),
      tenantId: this.requireTenantId(request.authUser?.tenant_id),
      observacao: this.toOptionalString(body.observacao)
    });
  }

  async obterPorId(rawId: string, tenantId?: string) {
    return storageService.obterPorId(rawId, this.requireTenantId(tenantId));
  }

  async obterConteudoPorId(rawId: string, usuarioId?: string, tenantId?: string, auditar = true) {
    return storageService.obterConteudoPorId(
      rawId,
      this.toOptionalBigInt(usuarioId),
      this.requireTenantId(tenantId),
      auditar
    );
  }

  async obterConteudoPorCaminho(rawPath: string, usuarioId?: string, tenantId?: string, auditar = true) {
    return storageService.obterConteudoPorCaminho(
      rawPath,
      this.toOptionalBigInt(usuarioId),
      this.requireTenantId(tenantId),
      auditar
    );
  }

  async excluir(rawId: string, usuarioId?: string, tenantId?: string) {
    await storageService.excluirLogico(
      rawId,
      this.toOptionalBigInt(usuarioId),
      this.requireTenantId(tenantId)
    );
  }

  private parseScope(rawScope: unknown) {
    if (typeof rawScope !== "string" || !rawScope.trim()) {
      throw new AppError("Escopo de storage nao informado.", 400);
    }
    const scope = rawScope.trim() as StorageScopeKey;
    if (!(scope in storagePolicies)) {
      throw new AppError("Escopo de storage invalido.", 400);
    }
    return scope;
  }

  private toOptionalString(rawValue: unknown) {
    return typeof rawValue === "string" && rawValue.trim() ? rawValue.trim() : undefined;
  }

  private requireTenantId(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private toOptionalBigInt(rawValue: unknown) {
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
