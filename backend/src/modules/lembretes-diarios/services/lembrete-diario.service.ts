import { AppError } from "../../../shared/errors/app-error.js";
import { mapLembreteDiarioToResponse } from "../lembrete-diario.mapper.js";
import {
  lembreteDiarioAdiarSchema,
  lembreteDiarioInputSchema
} from "../lembrete-diario.schema.js";
import { LembreteDiarioRepository } from "../repositories/lembrete-diario.repository.js";

export class LembreteDiarioService {
  private readonly repository = new LembreteDiarioRepository();

  async listar(rawUsuarioId?: unknown, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const usuarioId =
      typeof rawUsuarioId === "string" && rawUsuarioId.trim()
        ? Number(rawUsuarioId)
        : typeof rawUsuarioId === "number"
          ? rawUsuarioId
          : undefined;

    const registros = await this.repository.listar(
      Number.isInteger(usuarioId) && (usuarioId as number) > 0 ? (usuarioId as number) : undefined,
      tenantId
    );
    return registros.map(mapLembreteDiarioToResponse);
  }

  async obterResumo(rawUsuarioId?: unknown, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const usuarioId =
      typeof rawUsuarioId === "string" && rawUsuarioId.trim()
        ? Number(rawUsuarioId)
        : typeof rawUsuarioId === "number"
          ? rawUsuarioId
          : undefined;

    return this.repository.obterResumo(
      Number.isInteger(usuarioId) && (usuarioId as number) > 0 ? (usuarioId as number) : undefined,
      tenantId
    );
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = lembreteDiarioInputSchema.parse(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapLembreteDiarioToResponse(registro);
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = lembreteDiarioInputSchema.parse(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapLembreteDiarioToResponse(registro);
  }

  async concluir(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.concluir(id, tenantId);
    return mapLembreteDiarioToResponse(registro);
  }

  async adiar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = lembreteDiarioAdiarSchema.parse(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.adiar(id, input, tenantId);
    return mapLembreteDiarioToResponse(registro);
  }

  async excluir(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.excluir(id, tenantId);
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(id);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }
}
