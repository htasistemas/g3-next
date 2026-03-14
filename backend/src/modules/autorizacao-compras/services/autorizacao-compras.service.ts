import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoAutorizacaoCompras } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapAutorizacaoCompraCotacaoToResponse,
  mapAutorizacaoCompraDetalheToResponse,
  mapAutorizacaoCompraResumoToResponse,
  mapFornecedorByCnpj,
  mapReservaBancariaToResponse
} from "../autorizacao-compras.mapper.js";
import {
  autorizacaoCompraAprovacaoInputSchema,
  autorizacaoCompraCotacaoInputSchema,
  autorizacaoCompraEscolhaFornecedorSchema,
  autorizacaoCompraInputSchema,
  autorizacaoPagamentoInputSchema,
  reservaBancariaInputSchema
} from "../autorizacao-compras.schema.js";
import type { AutorizacaoCompraAtor } from "../autorizacao-compras.types.js";
import { normalizarTipoCompra } from "../autorizacao-compras.workflow.js";
import { AutorizacaoComprasRepository } from "../repositories/autorizacao-compras.repository.js";

export class AutorizacaoComprasService {
  private readonly repository = new AutorizacaoComprasRepository();

  async listar() {
    const rows = await this.repository.listar();
    return rows.map(mapAutorizacaoCompraResumoToResponse);
  }

  async listarIndicadores() {
    return this.repository.listarIndicadores();
  }

  async listarSetoresSolicitantes() {
    const rows = await this.repository.listarSetoresSolicitantes();
    return rows.map((row) => {
      const nome = row.nome.trim();
      const unidadeNome = row.unidade_nome?.trim() || undefined;
      const label = unidadeNome ? `${nome} - ${unidadeNome}` : nome;
      return {
        valor: label,
        label,
        nome,
        unidadeNome
      };
    });
  }

  async buscarDetalhe(rawId: string) {
    const id = this.parseId(rawId);
    const detalhe = await this.repository.buscarDetalhePorId(id);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async criar(rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const input = autorizacaoCompraInputSchema.parse(
      this.normalizarSolicitacaoPayload(rawInput)
    );
    const detalhe = await this.repository.criar(input, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async atualizar(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const input = autorizacaoCompraInputSchema.parse(
      this.normalizarSolicitacaoPayload(rawInput)
    );
    const detalhe = await this.repository.atualizar(id, input, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async remover(rawId: string, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    await this.repository.remover(id, ator);
  }

  async enviarParaAprovacao(rawId: string, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const detalhe = await this.repository.enviarParaAprovacao(id, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async registrarAprovacao(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const input = autorizacaoCompraAprovacaoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const detalhe = await this.repository.registrarAprovacao(id, input, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async listarCotacoes(rawId: string) {
    const id = this.parseId(rawId);
    const rows = await this.repository.listarCotacoes(id);
    return rows.map((row) => mapAutorizacaoCompraCotacaoToResponse(row));
  }

  async criarCotacao(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const input = autorizacaoCompraCotacaoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const rows = await this.repository.criarCotacao(id, input, ator);
    return rows.map((row) => mapAutorizacaoCompraCotacaoToResponse(row));
  }

  async removerCotacao(rawId: string, rawCotacaoId: string, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const cotacaoId = this.parseId(rawCotacaoId);
    await this.repository.removerCotacao(id, cotacaoId, ator);
  }

  async definirFornecedor(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const input = autorizacaoCompraEscolhaFornecedorSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const detalhe = await this.repository.definirFornecedor(id, input, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async buscarFornecedorPorCnpj(rawCnpj: string) {
    const cnpj = rawCnpj.replace(/\D/g, "");
    if (cnpj.length < 8) {
      throw new AppError("CNPJ inválido.", 400);
    }
    const row = await this.repository.buscarFornecedorPorCnpj(cnpj);
    return mapFornecedorByCnpj(row);
  }

  async listarReservas(rawId: string) {
    const id = this.parseId(rawId);
    const rows = await this.repository.listarReservas(id);
    return rows.map(mapReservaBancariaToResponse);
  }

  async registrarReservaBancaria(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const input = reservaBancariaInputSchema.parse(rawInput);
    const rows = await this.repository.registrarReservaBancaria(id, input, ator);
    return rows.map(mapReservaBancariaToResponse);
  }

  async removerReservaBancaria(rawId: string, rawReservaId: string, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const reservaId = this.parseId(rawReservaId);
    await this.repository.removerReservaBancaria(id, reservaId, ator);
  }

  async gerarAutorizacaoPagamento(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const id = this.parseId(rawId);
    const input = autorizacaoPagamentoInputSchema.parse(this.normalizarPayload(rawInput));
    const detalhe = await this.repository.gerarAutorizacaoPagamento(id, input, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoAutorizacaoCompras
    );
  }

  private normalizarSolicitacaoPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    const payload = this.normalizarPayload(rawInput) as Record<string, unknown>;

    payload.numeroSolicitacao = undefined;

    if (typeof payload.tipoCompra === "string") {
      payload.tipoCompra = normalizarTipoCompra(payload.tipoCompra);
    }

    if (Array.isArray(payload.itens)) {
      payload.itens = payload.itens.map((item) =>
        normalizarObjetoTexto(item as Record<string, unknown>, {
          descricao: "textoCurto",
          categoria: "textoCurto",
          unidade: "textoCurto"
        })
      );
    }

    return payload;
  }
}
