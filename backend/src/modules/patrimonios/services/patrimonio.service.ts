import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPatrimonio } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapPatrimonioToResponse } from "../patrimonio.mapper.js";
import {
  patrimonioInputSchema,
  patrimonioMovimentoInputSchema
} from "../patrimonio.schema.js";
import { PatrimonioRepository } from "../repositories/patrimonio.repository.js";

export class PatrimonioService {
  private readonly repository = new PatrimonioRepository();

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) => mapPatrimonioToResponse(item.patrimonio, item.movimentos));
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = patrimonioInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = patrimonioInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
  }

  async registrarMovimento(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = patrimonioMovimentoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.registrarMovimento(id, input, tenantId);
    return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
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

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(rawInput as Record<string, unknown>, mapaCamposTextoPatrimonio);
  }
}
