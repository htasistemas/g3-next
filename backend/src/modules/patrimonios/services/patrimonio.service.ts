import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPatrimonio } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapPatrimonioCategoriaToResponse, mapPatrimonioToResponse } from "../patrimonio.mapper.js";
import {
  patrimonioCategoriaInputSchema,
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

  async listarCategorias(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const categorias = await this.repository.listarCategorias(tenantId);
    return categorias.map(mapPatrimonioCategoriaToResponse);
  }

  async criarCategoria(rawInput: unknown, rawTenantId?: string) {
    const input = patrimonioCategoriaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const categoria = await this.repository.criarCategoria(input, tenantId);
    return mapPatrimonioCategoriaToResponse(categoria);
  }

  async atualizarCategoria(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = patrimonioCategoriaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const categoria = await this.repository.atualizarCategoria(id, input, tenantId);
    return mapPatrimonioCategoriaToResponse(categoria);
  }

  async removerCategoria(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.removerCategoria(id, tenantId);
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = patrimonioInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    this.validarUnidadeObrigatoria(input.unidadeId, input.unidade);
    const registro = await this.repository.criar(input, tenantId);
    return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = patrimonioInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    this.validarUnidadeObrigatoria(input.unidadeId, input.unidade);
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

  private validarUnidadeObrigatoria(unidadeId?: string, unidade?: string) {
    if (!unidadeId?.trim() && !unidade?.trim()) {
      throw new AppError("Selecione a unidade do patrimônio.", 400);
    }
  }
}
