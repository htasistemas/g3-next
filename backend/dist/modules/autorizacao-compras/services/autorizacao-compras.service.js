import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoAutorizacaoCompras } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapAutorizacaoCompraCotacaoToResponse, mapAutorizacaoCompraToResponse, mapFornecedorByCnpj, mapReservaBancariaToResponse } from "../autorizacao-compras.mapper.js";
import { autorizacaoCompraCotacaoInputSchema, autorizacaoCompraInputSchema, autorizacaoPagamentoInputSchema, reservaBancariaInputSchema } from "../autorizacao-compras.schema.js";
import { AutorizacaoComprasRepository } from "../repositories/autorizacao-compras.repository.js";
export class AutorizacaoComprasService {
    repository = new AutorizacaoComprasRepository();
    async listar() {
        const rows = await this.repository.listar();
        return rows.map(mapAutorizacaoCompraToResponse);
    }
    async criar(rawInput) {
        const input = autorizacaoCompraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criar(input);
        return mapAutorizacaoCompraToResponse(row);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = autorizacaoCompraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizar(id, input);
        return mapAutorizacaoCompraToResponse(row);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async listarCotacoes(rawId) {
        const id = this.parseId(rawId);
        const rows = await this.repository.listarCotacoes(id);
        return rows.map(mapAutorizacaoCompraCotacaoToResponse);
    }
    async criarCotacao(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = autorizacaoCompraCotacaoInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarCotacao(id, input);
        return mapAutorizacaoCompraCotacaoToResponse(row);
    }
    async removerCotacao(rawId, rawCotacaoId) {
        const id = this.parseId(rawId);
        const cotacaoId = this.parseId(rawCotacaoId);
        await this.repository.removerCotacao(id, cotacaoId);
    }
    async buscarFornecedorPorCnpj(rawCnpj) {
        const cnpj = rawCnpj.replace(/\D/g, "");
        if (cnpj.length < 8) {
            throw new AppError("CNPJ invalido.", 400);
        }
        const row = await this.repository.buscarFornecedorPorCnpj(cnpj);
        return mapFornecedorByCnpj(row);
    }
    async registrarReservaBancaria(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = reservaBancariaInputSchema.parse(rawInput);
        const row = await this.repository.registrarReservaBancaria(id, input);
        return mapReservaBancariaToResponse(row);
    }
    async listarReservas(rawId) {
        const id = this.parseId(rawId);
        const rows = await this.repository.listarReservas(id);
        return rows.map(mapReservaBancariaToResponse);
    }
    async removerReservaBancaria(rawId, rawContaId) {
        const id = this.parseId(rawId);
        const contaId = this.parseId(rawContaId);
        await this.repository.removerReservaBancaria(id, contaId);
    }
    async gerarAutorizacaoPagamento(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = autorizacaoPagamentoInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.gerarAutorizacaoPagamento(id, input);
        return mapAutorizacaoCompraToResponse(row);
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
        return normalizarObjetoTexto(rawInput, mapaCamposTextoAutorizacaoCompras);
    }
}
