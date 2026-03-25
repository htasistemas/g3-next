import { AppError } from "../../../shared/errors/app-error.js";
import { vendaFiltersSchema, vendaInputSchema } from "../venda.schema.js";
import { mapVendaToResponse } from "../venda.mapper.js";
import { VendaRepository } from "../repositories/venda.repository.js";
export class VendaService {
    repository = new VendaRepository();
    async listar(rawFilters) {
        const filters = vendaFiltersSchema.parse(rawFilters ?? {});
        const registros = await this.repository.listar(filters);
        return Promise.all(registros.map(async (registro) => {
            const itens = await this.repository.listarItensPorVendaId(registro.id);
            return mapVendaToResponse(registro, itens);
        }));
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const venda = await this.repository.buscarPorIdOuFalhar(id);
        const itens = await this.repository.listarItensPorVendaId(id);
        return mapVendaToResponse(venda, itens);
    }
    async criar(rawInput) {
        const input = vendaInputSchema.parse(rawInput);
        const venda = await this.repository.criar(input);
        const itens = await this.repository.listarItensPorVendaId(venda.id);
        return mapVendaToResponse(venda, itens);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador da venda invalido.", 400);
        }
        return BigInt(id);
    }
}
