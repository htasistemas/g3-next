import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContabilidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { AuthRepository } from "../../auth/repositories/auth.repository.js";
import {
  mapCategoriaFinanceiraToResponse,
  mapCentroCustoToResponse,
  mapCompraIntegradaToResponse,
  mapConciliacaoToResponse,
  mapContaBancariaToResponse,
  mapEmendaToResponse,
  mapFechamentoMensalToResponse,
  mapHistoricoContabilToResponse,
  mapLancamentoToResponse,
  mapMovimentacaoToResponse,
  mapTransferenciaToResponse
} from "../contabilidade.mapper.js";
import {
  categoriaFinanceiraInputSchema,
  centroCustoInputSchema,
  conciliacaoFinanceiraInputSchema,
  contaBancariaInputSchema,
  emendaImpositivaInputSchema,
  fechamentoMensalInputSchema,
  lancamentoFinanceiroInputSchema,
  movimentacaoFinanceiraInputSchema,
  pagamentoInputSchema,
  remocaoLancamentoInputSchema,
  situacaoConciliacaoInputSchema,
  statusInputSchema,
  statusLivreInputSchema,
  transferenciaFinanceiraInputSchema
} from "../contabilidade.schema.js";
import type { ContabilidadeAtor } from "../contabilidade.types.js";
import { ContabilidadeRepository } from "../repositories/contabilidade.repository.js";

export class ContabilidadeService {
  private readonly repository = new ContabilidadeRepository();
  private readonly authRepository = new AuthRepository();

  async listarContasBancarias(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarContasBancarias(ator);
    return rows.map(mapContaBancariaToResponse);
  }

  async criarContaBancaria(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarContaBancaria(input, ator);
    return mapContaBancariaToResponse(row);
  }

  async atualizarContaBancaria(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarContaBancaria(id, input, ator);
    return mapContaBancariaToResponse(row);
  }

  async removerContaBancaria(rawId: string, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    await this.repository.removerContaBancaria(id, ator);
  }

  async listarCategorias(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarCategorias(ator);
    return rows.map(mapCategoriaFinanceiraToResponse);
  }

  async criarCategoria(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = categoriaFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarCategoria(input, ator);
    return mapCategoriaFinanceiraToResponse(row);
  }

  async atualizarCategoria(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = categoriaFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarCategoria(id, input, ator);
    return mapCategoriaFinanceiraToResponse(row);
  }

  async removerCategoria(rawId: string, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    await this.repository.removerCategoria(id, ator);
  }

  async listarCentrosCusto(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarCentrosCusto(ator);
    return rows.map(mapCentroCustoToResponse);
  }

  async criarCentroCusto(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = centroCustoInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarCentroCusto(input, ator);
    return mapCentroCustoToResponse(row);
  }

  async atualizarCentroCusto(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = centroCustoInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarCentroCusto(id, input, ator);
    return mapCentroCustoToResponse(row);
  }

  async removerCentroCusto(rawId: string, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    await this.repository.removerCentroCusto(id, ator);
  }

  async listarLancamentos(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarLancamentos(ator);
    return rows.map(mapLancamentoToResponse);
  }

  async criarLancamento(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarLancamento(input, ator);
    return mapLancamentoToResponse(row);
  }

  async atualizarLancamento(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarLancamento(id, input, ator);
    return mapLancamentoToResponse(row);
  }

  async atualizarSituacaoLancamento(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const { status } = statusInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarSituacaoLancamento(id, status, ator);
    return mapLancamentoToResponse(row);
  }

  async pagarLancamento(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = pagamentoInputSchema.parse(this.normalizarPayload(rawInput));
    return this.repository.pagarLancamento(id, input, ator);
  }

  async estornarLancamento(rawId: string, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const row = await this.repository.estornarLancamento(id, ator);
    return mapLancamentoToResponse(row);
  }

  async removerLancamento(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = remocaoLancamentoInputSchema.parse(this.normalizarPayload(rawInput));
    await this.validarSenhaExclusaoLancamento(input.senha, ator);
    await this.repository.removerLancamento(id, {
      observacaoAuditoria: "Exclusão confirmada com senha do usuário autenticado.",
      ator
    });
  }

  async listarMovimentacoes(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarMovimentacoes(ator);
    return rows.map(mapMovimentacaoToResponse);
  }

  async criarMovimentacao(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    let row;
    try {
      row = await this.repository.criarMovimentacao(input, ator);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const motivo =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "falha inesperada ao salvar a movimentação do fluxo de caixa";

      throw new AppError(`Nao foi possivel salvar a movimentacao do fluxo de caixa. ${motivo}.`, 500);
    }
    return mapMovimentacaoToResponse(row);
  }

  async atualizarMovimentacao(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    let row;
    try {
      row = await this.repository.atualizarMovimentacao(id, input, ator);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const motivo =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "falha inesperada ao atualizar a movimentação do fluxo de caixa";

      throw new AppError(`Nao foi possivel atualizar a movimentacao do fluxo de caixa. ${motivo}.`, 500);
    }
    return mapMovimentacaoToResponse(row);
  }

  async removerMovimentacao(rawId: string, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    await this.repository.removerMovimentacao(id, ator);
  }

  async listarTransferencias(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarTransferencias(ator);
    return rows.map(mapTransferenciaToResponse);
  }

  async criarTransferencia(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = transferenciaFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarTransferencia(input, ator);
    return mapTransferenciaToResponse(row);
  }

  async estornarTransferencia(rawId: string, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const row = await this.repository.estornarTransferencia(id, ator);
    return mapTransferenciaToResponse(row);
  }

  async listarConciliacoes(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarConciliacoes(ator);
    return rows.map(mapConciliacaoToResponse);
  }

  async criarConciliacao(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = conciliacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarConciliacao(input, ator);
    return mapConciliacaoToResponse(row);
  }

  async atualizarSituacaoConciliacao(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const { situacao } = situacaoConciliacaoInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarSituacaoConciliacao(id, situacao, ator);
    return mapConciliacaoToResponse(row);
  }

  async listarHistorico(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarHistorico(ator);
    return rows.map(mapHistoricoContabilToResponse);
  }

  async listarFechamentosMensais(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarFechamentosMensais(ator);
    return rows.map(mapFechamentoMensalToResponse);
  }

  async fecharMes(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = fechamentoMensalInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.fecharMes(input, ator);
    return mapFechamentoMensalToResponse(row);
  }

  async listarComprasIntegradas(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarComprasIntegradas(ator);
    return rows.map(mapCompraIntegradaToResponse);
  }

  async gerarObrigacaoFinanceiraPorCompra(rawCompraId: string, ator?: ContabilidadeAtor) {
    const compraId = this.parseId(rawCompraId);
    const row = await this.repository.gerarObrigacaoFinanceiraPorCompra(compraId, ator);
    return mapLancamentoToResponse(row);
  }

  async listarEmendas(ator?: ContabilidadeAtor) {
    const rows = await this.repository.listarEmendas(ator);
    return rows.map(mapEmendaToResponse);
  }

  async criarEmenda(rawInput: unknown, ator?: ContabilidadeAtor) {
    const input = emendaImpositivaInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarEmenda(input, ator);
    return mapEmendaToResponse(row);
  }

  async atualizarStatusEmenda(rawId: string, rawInput: unknown, ator?: ContabilidadeAtor) {
    const id = this.parseId(rawId);
    const { status } = statusLivreInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarStatusEmenda(id, status, ator);
    return mapEmendaToResponse(row);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoContabilidade
    );
  }

  private async validarSenhaExclusaoLancamento(senha: string, ator?: ContabilidadeAtor) {
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
