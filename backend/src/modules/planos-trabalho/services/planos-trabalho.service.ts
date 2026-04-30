import { AppError } from "../../../shared/errors/app-error.js";
import { mapPlanoTrabalhoToResponse } from "../planos-trabalho.mapper.js";
import { planoTrabalhoInputSchema } from "../planos-trabalho.schema.js";
import type { PlanoTrabalhoInput } from "../planos-trabalho.types.js";
import { PlanosTrabalhoRepository } from "../repositories/planos-trabalho.repository.js";
import {
  garantirConformidadeParaEnvio,
  normalizarPlanoTrabalhoInput
} from "../planos-trabalho.utils.js";

export class PlanosTrabalhoService {
  private readonly repository = new PlanosTrabalhoRepository();

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) =>
      mapPlanoTrabalhoToResponse(
        item.plano,
        item.objetivosEspecificos,
        item.metas,
        item.etapas,
        item.aplicacaoRecursos,
        item.desembolso,
        item.checklistPrestacao
      )
    );
  }

  async obter(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapPlanoTrabalhoToResponse(
      registro.plano,
      registro.objetivosEspecificos,
      registro.metas,
      registro.etapas,
      registro.aplicacaoRecursos,
      registro.desembolso,
      registro.checklistPrestacao
    );
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = this.parseInput(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapPlanoTrabalhoToResponse(
      registro.plano,
      registro.objetivosEspecificos,
      registro.metas,
      registro.etapas,
      registro.aplicacaoRecursos,
      registro.desembolso,
      registro.checklistPrestacao
    );
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = this.parseInput(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapPlanoTrabalhoToResponse(
      registro.plano,
      registro.objetivosEspecificos,
      registro.metas,
      registro.etapas,
      registro.aplicacaoRecursos,
      registro.desembolso,
      registro.checklistPrestacao
    );
  }

  async remover(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.remover(id, tenantId);
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

  private parseInput(rawInput: unknown) {
    const input = planoTrabalhoInputSchema.parse(rawInput) as PlanoTrabalhoInput;
    const normalizado = normalizarPlanoTrabalhoInput(input);
    garantirConformidadeParaEnvio(normalizado);
    return normalizado;
  }
}
