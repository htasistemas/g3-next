import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPrestacaoContas } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTransparenciaToResponse } from "../transparencias.mapper.js";
import { transparenciaInputSchema } from "../transparencias.schema.js";
import { TransparenciasRepository } from "../repositories/transparencias.repository.js";

export class TransparenciasService {
  private readonly repository = new TransparenciasRepository();

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) =>
      mapTransparenciaToResponse(
        item.transparencia,
        item.recebimentos,
        item.destinacoes,
        item.comprovantes,
        item.timelines,
        item.checklist
      )
    );
  }

  async obter(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist
    );
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist
    );
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist
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

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoPrestacaoContas
    );
  }
}
