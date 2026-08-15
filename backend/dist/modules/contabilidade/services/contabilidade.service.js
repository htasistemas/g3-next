import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContabilidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { AuthRepository } from "../../auth/repositories/auth.repository.js";
import { mapCategoriaFinanceiraToResponse, mapCentroCustoToResponse, mapCompraIntegradaToResponse, mapConciliacaoToResponse, mapContaBancariaToResponse, mapEmendaToResponse, mapFechamentoMensalToResponse, mapHistoricoContabilToResponse, mapLancamentoToResponse, mapMovimentacaoToResponse, mapTransferenciaToResponse } from "../contabilidade.mapper.js";
import { categoriaFinanceiraInputSchema, centroCustoInputSchema, conciliacaoFinanceiraInputSchema, contaBancariaInputSchema, emendaImpositivaInputSchema, fechamentoMensalInputSchema, lancamentoFinanceiroInputSchema, movimentacaoFinanceiraInputSchema, pagamentoInputSchema, remocaoLancamentoInputSchema, situacaoConciliacaoInputSchema, statusInputSchema, statusLivreInputSchema, transferenciaFinanceiraInputSchema } from "../contabilidade.schema.js";
import { ContabilidadeRepository } from "../repositories/contabilidade.repository.js";
function tratarErroPersistenciaLancamentoFinanceiro(error, acao) {
    if (error instanceof AppError) {
        throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const rawCode = typeof error.meta?.code === "string" ? error.meta.code : undefined;
        const contexto = `${error.message} ${typeof error.meta?.message === "string" ? error.meta.message : ""}`.toLowerCase();
        if (error.code === "P2002" || (error.code === "P2010" && rawCode === "23505")) {
            if (contexto.includes("compra_id")) {
                throw new AppError("Já existe um lançamento financeiro vinculado a esta compra.", 409);
            }
            throw new AppError("Já existe um lançamento com dados que exigem valor único.", 409);
        }
        if (error.code === "P2003" || (error.code === "P2010" && rawCode === "23503")) {
            throw new AppError("Uma das referências informadas não existe ou não pertence à instituição autenticada.", 400);
        }
        if (error.code === "P2025") {
            throw new AppError("Lançamento financeiro não encontrado.", 404);
        }
        if (error.code === "P2000" ||
            (error.code === "P2010" && ["22001", "22003", "22007", "22P02"].includes(rawCode ?? ""))) {
            throw new AppError("Um dos campos do lançamento possui valor inválido ou excede o limite permitido.", 400);
        }
    }
    if (error instanceof Error && error.message.trim()) {
        throw new AppError(`Não foi possível ${acao}. ${error.message.trim()}`, 500);
    }
    throw new AppError(`Não foi possível ${acao}.`, 500);
}
export class ContabilidadeService {
    repository = new ContabilidadeRepository();
    authRepository = new AuthRepository();
    async listarContasBancarias(ator) {
        const rows = await this.repository.listarContasBancarias(ator);
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
    async listarCategorias(ator) {
        const rows = await this.repository.listarCategorias(ator);
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
    async listarCentrosCusto(ator) {
        const rows = await this.repository.listarCentrosCusto(ator);
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
    async listarLancamentos(ator) {
        const rows = await this.repository.listarLancamentos(ator);
        return rows.map(mapLancamentoToResponse);
    }
    async criarLancamento(rawInput, ator) {
        const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
        try {
            const row = await this.repository.criarLancamento(input, ator);
            return mapLancamentoToResponse(row);
        }
        catch (error) {
            tratarErroPersistenciaLancamentoFinanceiro(error, "salvar o lançamento financeiro");
        }
    }
    async atualizarLancamento(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
        try {
            const row = await this.repository.atualizarLancamento(id, input, ator);
            return mapLancamentoToResponse(row);
        }
        catch (error) {
            tratarErroPersistenciaLancamentoFinanceiro(error, "atualizar o lançamento financeiro");
        }
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
    async removerLancamento(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const input = remocaoLancamentoInputSchema.parse(this.normalizarPayload(rawInput));
        await this.validarSenhaExclusaoLancamento(input.senha, ator);
        await this.repository.removerLancamento(id, {
            observacaoAuditoria: "Exclusão confirmada com senha do usuário autenticado.",
            ator
        });
    }
    async listarMovimentacoes(ator) {
        const rows = await this.repository.listarMovimentacoes(ator);
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
    async listarTransferencias(ator) {
        const rows = await this.repository.listarTransferencias(ator);
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
    async listarConciliacoes(ator) {
        const rows = await this.repository.listarConciliacoes(ator);
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
    async listarHistorico(ator) {
        const rows = await this.repository.listarHistorico(ator);
        return rows.map(mapHistoricoContabilToResponse);
    }
    async listarFechamentosMensais(ator) {
        const rows = await this.repository.listarFechamentosMensais(ator);
        return rows.map(mapFechamentoMensalToResponse);
    }
    async fecharMes(rawInput, ator) {
        const input = fechamentoMensalInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.fecharMes(input, ator);
        return mapFechamentoMensalToResponse(row);
    }
    async listarComprasIntegradas(ator) {
        const rows = await this.repository.listarComprasIntegradas(ator);
        return rows.map(mapCompraIntegradaToResponse);
    }
    async gerarObrigacaoFinanceiraPorCompra(rawCompraId, ator) {
        const compraId = this.parseId(rawCompraId);
        const row = await this.repository.gerarObrigacaoFinanceiraPorCompra(compraId, ator);
        return mapLancamentoToResponse(row);
    }
    async listarEmendas(ator) {
        const rows = await this.repository.listarEmendas(ator);
        return rows.map(mapEmendaToResponse);
    }
    async criarEmenda(rawInput, ator) {
        const input = emendaImpositivaInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.criarEmenda(input, ator);
        return mapEmendaToResponse(row);
    }
    async atualizarStatusEmenda(rawId, rawInput, ator) {
        const id = this.parseId(rawId);
        const { status } = statusLivreInputSchema.parse(this.normalizarPayload(rawInput));
        const row = await this.repository.atualizarStatusEmenda(id, status, ator);
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
    async validarSenhaExclusaoLancamento(senha, ator) {
        if (!ator?.usuarioId) {
            throw new AppError("Usuário autenticado inválido para confirmar a exclusão.", 401);
        }
        const usuario = await this.authRepository.buscarUsuarioPorId(ator.usuarioId);
        if (!usuario?.senhaHash) {
            throw new AppError("Usuário autenticado não encontrado para confirmar a exclusão.", 404);
        }
        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) {
            throw new AppError("Senha inválida para excluir o lançamento.", 401);
        }
    }
}
