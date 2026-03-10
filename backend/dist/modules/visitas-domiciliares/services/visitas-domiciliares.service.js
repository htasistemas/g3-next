import { AppError } from "../../../shared/errors/app-error.js";
import { mapVisitaRowToResponse } from "../visitas-domiciliares.mapper.js";
import { visitaDomiciliarInputSchema } from "../visitas-domiciliares.schema.js";
import { VisitasDomiciliaresRepository } from "../repositories/visitas-domiciliares.repository.js";
export class VisitasDomiciliaresService {
    repository = new VisitasDomiciliaresRepository();
    async listar() {
        const rows = await this.repository.listar();
        return rows.map(mapVisitaRowToResponse);
    }
    async criar(rawInput) {
        const input = visitaDomiciliarInputSchema.parse(rawInput);
        const row = await this.repository.criar(input);
        return mapVisitaRowToResponse(row);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = visitaDomiciliarInputSchema.parse(rawInput);
        const row = await this.repository.atualizar(id, input);
        return mapVisitaRowToResponse(row);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
}
