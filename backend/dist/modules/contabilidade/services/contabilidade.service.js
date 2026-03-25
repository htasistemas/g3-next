import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContabilidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapCategoriaFinanceiraToResponse, mapCentroCustoToResponse, mapCompraIntegradaToResponse, mapConciliacaoToResponse, mapContaBancariaToResponse, mapEmendaToResponse, mapHistoricoContabilToResponse, mapLancamentoToResponse, mapMovimentacaoToResponse, mapTransferenciaToResponse } from "../contabilidade.mapper.js";
import { categoriaFinanceiraInputSchema, centroCustoInputSchema, conciliacaoFinanceiraInputSchema, contaBancariaInputSchema, emendaImpositivaInputSchema, lancamentoFinanceiroInputSchema, movimentacaoFinanceiraInputSchema, pagamentoInputSchema, situacaoConciliacaoInputSchema, statusInputSchema, statusLivreInputSchema, transferenciaFinanceiraInputSchema } from "../contabilidade.schema.js";
import { ContabilidadeRepository } from "../repositories/contabilidade.repository.js";
export class ContabilidadeService {
    repository = new ContabilidadeRepository();
    async listarContasBancarias() {
        const rows = await this.repository.listarContasBancarias();
        return rows.map(mapContaBancariaToResponse);
    }
    async criarContaBancaria(rawInput, ator) {
        const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarContaBancaria(input, ator);
        return mapContaBancariaToResponse(row);
    }
    async atualizarContaBancaria(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarContaBancaria(id, input, ator);
        return mapContaBancariaToResponse(row);
    }
    async removerContaBancaria(rawId, ator) {
        const id = this.parseId(rawId);
        await this.repository.removerContaBancaria(id, ator);
    }
    async listarCategorias() {
        const rows = await this.repository.listarCategorias();
        return rows.map(mapCategoriaFinanceiraToResponse);
    }
    async criarCategoria(rawInput, ator) {
        const input = categoriaFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarCategoria(input, ator);
        return mapCategoriaFinanceiraToResponse(row);
    }
    async atualizarCategoria(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = categoriaFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarCategoria(id, input, ator);
        return mapCategoriaFinanceiraToResponse(row);
    }
    async removerCategoria(rawId, ator) {
        const id = this.parseId(rawId);
        await this.repository.removerCategoria(id, ator);
    }
    async listarCentrosCusto() {
        const rows = await this.repository.listarCentrosCusto();
        return rows.map(mapCentroCustoToResponse);
    }
    async criarCentroCusto(rawInput, ator) {
        const input = centroCustoInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarCentroCusto(input, ator);
        return mapCentroCustoToResponse(row);
    }
    async atualizarCentroCusto(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = centroCustoInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarCentroCusto(id, input, ator);
        return mapCentroCustoToResponse(row);
    }
    async removerCentroCusto(rawId, ator) {
        const id = this.parseId(rawId);
        await this.repository.removerCentroCusto(id, ator);
    }
    async listarLancamentos() {
        const rows = await this.repository.listarLancamentos();
        return rows.map(mapLancamentoToResponse);
    }
    async criarLancamento(rawInput, ator) {
        const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarLancamento(input, ator);
        return mapLancamentoToResponse(row);
    }
    async atualizarLancamento(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarLancamento(id, input, ator);
        return mapLancamentoToResponse(row);
    }
    async atualizarSituacaoLancamento(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const { status } = statusInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarSituacaoLancamento(id, status, ator);
        return mapLancamentoToResponse(row);
    }
    async pagarLancamento(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = pagamentoInputSchema.parse(this.normalizarPayload(rawInput));
        return this.repository.pagarLancamento(id, input, ator);
    }
    async estornarLancamento(rawId, ator) {
        const id = this.parseId(rawId);
        const row = await this.repository.estornarLancamento(id, ator);
        return mapLancamentoToResponse(row);
    }
    async removerLancamento(rawId, ator) {
        const id = this.parseId(rawId);
        await this.repository.removerLancamento(id, ator);
    }
    async listarMovimentacoes() {
        const rows = await this.repository.listarMovimentacoes();
        return rows.map(mapMovimentacaoToResponse);
    }
    async criarMovimentacao(rawInput, ator) {
        const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        let row;
        try {
            row = await this.repository.criarMovimentacao(input, ator);
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const motivo = error instanceof Error && error.message.trim()
                ? error.message.trim()
                : "falha inesperada ao salvar a movimentação do fluxo de caixa";
            throw new AppError(`Nao foi possivel salvar a movimentacao do fluxo de caixa. ${motivo}.`, 500);
        }
        return mapMovimentacaoToResponse(row);
    }
    async atualizarMovimentacao(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        let row;
        try {
            row = await this.repository.atualizarMovimentacao(id, input, ator);
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const motivo = error instanceof Error && error.message.trim()
                ? error.message.trim()
                : "falha inesperada ao atualizar a movimentação do fluxo de caixa";
            throw new AppError(`Nao foi possivel atualizar a movimentacao do fluxo de caixa. ${motivo}.`, 500);
        }
        return mapMovimentacaoToResponse(row);
    }
    async removerMovimentacao(rawId, ator) {
        const id = this.parseId(rawId);
        await this.repository.removerMovimentacao(id, ator);
    }
    async listarTransferencias() {
        const rows = await this.repository.listarTransferencias();
        return rows.map(mapTransferenciaToResponse);
    }
    async criarTransferencia(rawInput, ator) {
        const input = transferenciaFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarTransferencia(input, ator);
        return mapTransferenciaToResponse(row);
    }
    async estornarTransferencia(rawId, ator) {
        const id = this.parseId(rawId);
        const row = await this.repository.estornarTransferencia(id, ator);
        return mapTransferenciaToResponse(row);
    }
    async listarConciliacoes() {
        const rows = await this.repository.listarConciliacoes();
        return rows.map(mapConciliacaoToResponse);
    }
    async criarConciliacao(rawInput, ator) {
        const input = conciliacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarConciliacao(input, ator);
        return mapConciliacaoToResponse(row);
    }
    async atualizarSituacaoConciliacao(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const { situacao } = situacaoConciliacaoInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarSituacaoConciliacao(id, situacao, ator);
        return mapConciliacaoToResponse(row);
    }
    async listarHistorico() {
        const rows = await this.repository.listarHistorico();
        return rows.map(mapHistoricoContabilToResponse);
    }
    async listarComprasIntegradas() {
        const rows = await this.repository.listarComprasIntegradas();
        return rows.map(mapCompraIntegradaToResponse);
    }
    async gerarObrigacaoFinanceiraPorCompra(rawCompraId, ator) {
        const compraId = this.parseId(rawCompraId);
        const row = await this.repository.gerarObrigacaoFinanceiraPorCompra(compraId, ator);
        return mapLancamentoToResponse(row);
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
        const { status } = statusLivreInputSchema.parse(this.normalizarPayload(rawInput));
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
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoContabilidade);
    }
}
