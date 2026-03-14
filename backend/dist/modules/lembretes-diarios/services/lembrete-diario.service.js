import { AppError } from "../../../shared/errors/app-error.js";
import { mapLembreteDiarioToResponse } from "../lembrete-diario.mapper.js";
import { lembreteDiarioAdiarSchema, lembreteDiarioInputSchema } from "../lembrete-diario.schema.js";
import { LembreteDiarioRepository } from "../repositories/lembrete-diario.repository.js";
export class LembreteDiarioService {
    repository = new LembreteDiarioRepository();
    async listar(rawUsuarioId) {
        const usuarioId = typeof rawUsuarioId === "string" && rawUsuarioId.trim()
            ? Number(rawUsuarioId)
            : typeof rawUsuarioId === "number"
                ? rawUsuarioId
                : undefined;
        const registros = await this.repository.listar(Number.isInteger(usuarioId) && usuarioId > 0 ? usuarioId : undefined);
        return registros.map(mapLembreteDiarioToResponse);
    }
    async obterResumo(rawUsuarioId) {
        const usuarioId = typeof rawUsuarioId === "string" && rawUsuarioId.trim()
            ? Number(rawUsuarioId)
            : typeof rawUsuarioId === "number"
                ? rawUsuarioId
                : undefined;
        return this.repository.obterResumo(Number.isInteger(usuarioId) && usuarioId > 0 ? usuarioId : undefined);
    }
    async criar(rawInput) {
        const input = lembreteDiarioInputSchema.parse(rawInput);
        const registro = await this.repository.criar(input);
        return mapLembreteDiarioToResponse(registro);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = lembreteDiarioInputSchema.parse(rawInput);
        const registro = await this.repository.atualizar(id, input);
        return mapLembreteDiarioToResponse(registro);
    }
    async concluir(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.concluir(id);
        return mapLembreteDiarioToResponse(registro);
    }
    async adiar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = lembreteDiarioAdiarSchema.parse(rawInput);
        const registro = await this.repository.adiar(id, input);
        return mapLembreteDiarioToResponse(registro);
    }
    async excluir(rawId) {
        const id = this.parseId(rawId);
        await this.repository.excluir(id);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador inválido.", 400);
        }
        return BigInt(id);
    }
}
