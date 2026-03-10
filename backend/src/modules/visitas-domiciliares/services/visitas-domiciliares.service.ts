import { AppError } from "../../../shared/errors/app-error.js";
import { mapVisitaRowToResponse } from "../visitas-domiciliares.mapper.js";
import { visitaDomiciliarInputSchema } from "../visitas-domiciliares.schema.js";
import { VisitasDomiciliaresRepository } from "../repositories/visitas-domiciliares.repository.js";

export class VisitasDomiciliaresService {
  private readonly repository = new VisitasDomiciliaresRepository();

  async listar() {
    const rows = await this.repository.listar();
    return rows.map(mapVisitaRowToResponse);
  }

  async criar(rawInput: unknown) {
    const input = visitaDomiciliarInputSchema.parse(rawInput);
    const row = await this.repository.criar(input);
    return mapVisitaRowToResponse(row);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = visitaDomiciliarInputSchema.parse(rawInput);
    const row = await this.repository.atualizar(id, input);
    return mapVisitaRowToResponse(row);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }
}
