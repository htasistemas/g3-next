import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoTermoFomento } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTermoFomentoToResponse } from "../termos-fomento.mapper.js";
import { termoAditivoInputSchema, termoFomentoInputSchema } from "../termos-fomento.schema.js";
import { TermosFomentoRepository } from "../repositories/termos-fomento.repository.js";

export class TermosFomentoService {
  private readonly repository = new TermosFomentoRepository();

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) =>
      mapTermoFomentoToResponse(item.termo, item.aditivos, item.documentos)
    );
  }

  async obter(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = termoFomentoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = termoFomentoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  async remover(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.remover(id, tenantId);
  }

  async adicionarAditivo(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = termoAditivoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.adicionarAditivo(id, input, tenantId);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
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
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoTermoFomento
    );
  }
}
