import { AppError } from "../../../shared/errors/app-error.js";
import { jobPayloadSchema, jobCandidatoInputSchema } from "../banco-empregos.schema.js";
import { mapJobCandidatoRowToResponse, mapJobRowToResponse } from "../banco-empregos.mapper.js";
import { BancoEmpregosRepository } from "../repositories/banco-empregos.repository.js";
export class BancoEmpregosService {
    repository = new BancoEmpregosRepository();
    async listar() {
        const rows = await this.repository.listar();
        return rows.map(mapJobRowToResponse);
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const row = await this.repository.obterOuFalhar(id);
        return mapJobRowToResponse(row);
    }
    async criar(rawInput) {
        const input = jobPayloadSchema.parse(rawInput);
        const row = await this.repository.criar(input);
        return mapJobRowToResponse(row);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = jobPayloadSchema.parse(rawInput);
        const row = await this.repository.atualizar(id, input);
        return mapJobRowToResponse(row);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async listarCandidatos(rawEmpregoId) {
        const empregoId = this.parseId(rawEmpregoId);
        const rows = await this.repository.listarCandidatos(empregoId);
        return rows.map(mapJobCandidatoRowToResponse);
    }
    async criarCandidato(rawEmpregoId, rawInput) {
        const empregoId = this.parseId(rawEmpregoId);
        const input = jobCandidatoInputSchema.parse(rawInput);
        const row = await this.repository.criarCandidato(empregoId, input);
        return mapJobCandidatoRowToResponse(row);
    }
    async removerCandidato(rawId) {
        const id = this.parseId(rawId);
        await this.repository.removerCandidato(id);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
}
