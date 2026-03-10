import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContabilidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapContaBancariaToResponse, mapEmendaToResponse, mapLancamentoToResponse, mapMovimentacaoToResponse } from "../contabilidade.mapper.js";
import { contaBancariaInputSchema, emendaImpositivaInputSchema, lancamentoFinanceiroInputSchema, movimentacaoFinanceiraInputSchema, pagamentoInputSchema, statusInputSchema } from "../contabilidade.schema.js";
import { ContabilidadeRepository } from "../repositories/contabilidade.repository.js";
export class ContabilidadeService {
    repository = new ContabilidadeRepository();
    async listarContasBancarias() {
        const rows = await this.repository.listarContasBancarias();
        return rows.map(mapContaBancariaToResponse);
    }
    async criarContaBancaria(rawInput) {
        const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarContaBancaria(input);
        return mapContaBancariaToResponse(row);
    }
    async atualizarContaBancaria(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarContaBancaria(id, input);
        return mapContaBancariaToResponse(row);
    }
    async removerContaBancaria(rawId) {
        const id = this.parseId(rawId);
        await this.repository.removerContaBancaria(id);
    }
    async listarLancamentos() {
        const rows = await this.repository.listarLancamentos();
        return rows.map(mapLancamentoToResponse);
    }
    async criarLancamento(rawInput) {
        const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarLancamento(input);
        return mapLancamentoToResponse(row);
    }
    async atualizarLancamento(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarLancamento(id, input);
        return mapLancamentoToResponse(row);
    }
    async atualizarSituacaoLancamento(rawId, rawInput) {
        const id = this.parseId(rawId);
        const { status } = statusInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarSituacaoLancamento(id, status);
        return mapLancamentoToResponse(row);
    }
    async pagarLancamento(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = pagamentoInputSchema.parse(this.normalizarPayload(rawInput));
        const recibo = await this.repository.pagarLancamento(id, input.data);
        return {
            ...recibo,
            responsavel: input.responsavel ?? undefined
        };
    }
    async removerLancamento(rawId) {
        const id = this.parseId(rawId);
        await this.repository.removerLancamento(id);
    }
    async listarMovimentacoes() {
        const rows = await this.repository.listarMovimentacoes();
        return rows.map(mapMovimentacaoToResponse);
    }
    async criarMovimentacao(rawInput) {
        const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarMovimentacao(input);
        return mapMovimentacaoToResponse(row);
    }
    async atualizarMovimentacao(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarMovimentacao(id, input);
        return mapMovimentacaoToResponse(row);
    }
    async removerMovimentacao(rawId) {
        const id = this.parseId(rawId);
        await this.repository.removerMovimentacao(id);
    }
    async listarEmendas() {
        const rows = await this.repository.listarEmendas();
        return rows.map(mapEmendaToResponse);
    }
    async criarEmenda(rawInput) {
        const input = emendaImpositivaInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarEmenda(input);
        return mapEmendaToResponse(row);
    }
    async atualizarStatusEmenda(rawId, rawInput) {
        const id = this.parseId(rawId);
        const { status } = statusInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarStatusEmenda(id, status);
        return mapEmendaToResponse(row);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoContabilidade);
    }
}
