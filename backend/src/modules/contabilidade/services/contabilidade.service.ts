import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContabilidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapContaBancariaToResponse,
  mapEmendaToResponse,
  mapLancamentoToResponse,
  mapMovimentacaoToResponse
} from "../contabilidade.mapper.js";
import {
  contaBancariaInputSchema,
  emendaImpositivaInputSchema,
  lancamentoFinanceiroInputSchema,
  movimentacaoFinanceiraInputSchema,
  pagamentoInputSchema,
  statusInputSchema
} from "../contabilidade.schema.js";
import { ContabilidadeRepository } from "../repositories/contabilidade.repository.js";

export class ContabilidadeService {
  private readonly repository = new ContabilidadeRepository();

  async listarContasBancarias() {
    const rows = await this.repository.listarContasBancarias();
    return rows.map(mapContaBancariaToResponse);
  }

  async criarContaBancaria(rawInput: unknown) {
    const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarContaBancaria(input);
    return mapContaBancariaToResponse(row);
  }

  async atualizarContaBancaria(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = contaBancariaInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarContaBancaria(id, input);
    return mapContaBancariaToResponse(row);
  }

  async removerContaBancaria(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerContaBancaria(id);
  }

  async listarLancamentos() {
    const rows = await this.repository.listarLancamentos();
    return rows.map(mapLancamentoToResponse);
  }

  async criarLancamento(rawInput: unknown) {
    const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarLancamento(input);
    return mapLancamentoToResponse(row);
  }

  async atualizarLancamento(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = lancamentoFinanceiroInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarLancamento(id, input);
    return mapLancamentoToResponse(row);
  }

  async atualizarSituacaoLancamento(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const { status } = statusInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarSituacaoLancamento(id, status);
    return mapLancamentoToResponse(row);
  }

  async pagarLancamento(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = pagamentoInputSchema.parse(this.normalizarPayload(rawInput));
    const recibo = await this.repository.pagarLancamento(id, input.data);
    return {
      ...recibo,
      responsavel: input.responsavel ?? undefined
    };
  }

  async removerLancamento(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerLancamento(id);
  }

  async listarMovimentacoes() {
    const rows = await this.repository.listarMovimentacoes();
    return rows.map(mapMovimentacaoToResponse);
  }

  async criarMovimentacao(rawInput: unknown) {
    const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarMovimentacao(input);
    return mapMovimentacaoToResponse(row);
  }

  async atualizarMovimentacao(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = movimentacaoFinanceiraInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarMovimentacao(id, input);
    return mapMovimentacaoToResponse(row);
  }

  async removerMovimentacao(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerMovimentacao(id);
  }

  async listarEmendas() {
    const rows = await this.repository.listarEmendas();
    return rows.map(mapEmendaToResponse);
  }

  async criarEmenda(rawInput: unknown) {
    const input = emendaImpositivaInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.criarEmenda(input);
    return mapEmendaToResponse(row);
  }

  async atualizarStatusEmenda(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const { status } = statusInputSchema.parse(this.normalizarPayload(rawInput));
    const row = await this.repository.atualizarStatusEmenda(id, status);
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
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoContabilidade
    );
  }
}
