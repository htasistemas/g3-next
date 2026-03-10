import { AppError } from "../../../shared/errors/app-error.js";
import { mapSenhaChamadaRowToResponse, mapSenhaFilaRowToResponse, mapSenhasConfigRowToResponse } from "../senhas.mapper.js";
import { senhaChamarInputSchema, senhaEmitirInputSchema, senhaFinalizarInputSchema, senhasConfigInputSchema } from "../senhas.schema.js";
import { SenhasRepository } from "../repositories/senhas.repository.js";
export class SenhasService {
    repository = new SenhasRepository();
    async listarAguardando(unidadeId) {
        const unidade = unidadeId ? Number(unidadeId) : undefined;
        const rows = await this.repository.listarAguardando(Number.isFinite(unidade) ? unidade : undefined);
        return rows.map(mapSenhaFilaRowToResponse);
    }
    async emitir(rawInput) {
        const input = senhaEmitirInputSchema.parse(rawInput);
        const row = await this.repository.emitir(input);
        return mapSenhaFilaRowToResponse(row);
    }
    async chamar(rawInput) {
        const input = senhaChamarInputSchema.parse(rawInput);
        const row = await this.repository.chamar(input);
        return mapSenhaChamadaRowToResponse(row);
    }
    async finalizar(rawInput) {
        const input = senhaFinalizarInputSchema.parse(rawInput);
        const chamadaId = Number(input.chamadaId);
        if (!Number.isInteger(chamadaId) || chamadaId <= 0) {
            throw new AppError("Identificador de chamada invalido.", 400);
        }
        await this.repository.finalizarChamada(BigInt(chamadaId));
    }
    async finalizarFila(rawFilaId) {
        const filaId = Number(rawFilaId);
        if (!Number.isInteger(filaId) || filaId <= 0) {
            throw new AppError("Identificador de fila invalido.", 400);
        }
        await this.repository.finalizarFila(BigInt(filaId));
    }
    async painel(unidadeId, limite) {
        const unidade = unidadeId ? Number(unidadeId) : undefined;
        const limiteNormalizado = limite ? Number(limite) : 10;
        const rows = await this.repository.painel(Number.isFinite(unidade) ? unidade : undefined, Number.isInteger(limiteNormalizado) && limiteNormalizado > 0 ? limiteNormalizado : 10);
        return rows.map(mapSenhaChamadaRowToResponse);
    }
    async atual(unidadeId) {
        const unidade = unidadeId ? Number(unidadeId) : undefined;
        const row = await this.repository.atual(Number.isFinite(unidade) ? unidade : undefined);
        return row ? mapSenhaChamadaRowToResponse(row) : null;
    }
    async obterConfig() {
        const row = await this.repository.obterConfig();
        return mapSenhasConfigRowToResponse(row);
    }
    async atualizarConfig(rawInput) {
        const input = senhasConfigInputSchema.parse(rawInput);
        const row = await this.repository.atualizarConfig(input);
        return mapSenhasConfigRowToResponse(row);
    }
}
