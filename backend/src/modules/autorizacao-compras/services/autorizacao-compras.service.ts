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

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listar(tenantId);
    return rows.map(mapAutorizacaoCompraResumoToResponse);
  }

  async listarIndicadores(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    return this.repository.listarIndicadores(tenantId);
  }

  async listarSetoresSolicitantes(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listarSetoresSolicitantes(tenantId);
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

  async buscarDetalhe(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const detalhe = await this.repository.buscarDetalhePorId(id, tenantId);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async criar(rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const input = autorizacaoCompraInputSchema.parse(
      this.normalizarSolicitacaoPayload(rawInput)
    );
    const detalhe = await this.repository.criar(input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async atualizar(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraInputSchema.parse(
      this.normalizarSolicitacaoPayload(rawInput)
    );
    const detalhe = await this.repository.atualizar(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async remover(rawId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    await this.repository.remover(id, tenantId, ator);
  }

  async enviarParaAprovacao(rawId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const detalhe = await this.repository.enviarParaAprovacao(id, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async registrarAprovacao(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraAprovacaoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const detalhe = await this.repository.registrarAprovacao(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async listarCotacoes(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listarCotacoes(id, tenantId);
    return rows.map((row) => mapAutorizacaoCompraCotacaoToResponse(row));
  }

  async criarCotacao(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraCotacaoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const rows = await this.repository.criarCotacao(id, input, tenantId, ator);
    return rows.map((row) => mapAutorizacaoCompraCotacaoToResponse(row));
  }

  async removerCotacao(rawId: string, rawCotacaoId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const cotacaoId = this.parseId(rawCotacaoId);
    await this.repository.removerCotacao(id, cotacaoId, tenantId, ator);
  }

  async definirFornecedor(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoCompraEscolhaFornecedorSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const detalhe = await this.repository.definirFornecedor(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  async buscarFornecedorPorCnpj(rawCnpj: string, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const cnpj = rawCnpj.replace(/\D/g, "");
    if (cnpj.length < 8) {
      throw new AppError("CNPJ inválido.", 400);
    }
    const row = await this.repository.buscarFornecedorPorCnpj(cnpj, tenantId);
    return mapFornecedorByCnpj(row);
  }

  async listarReservas(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const rows = await this.repository.listarReservas(id, tenantId);
    return rows.map(mapReservaBancariaToResponse);
  }

  async registrarReservaBancaria(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = reservaBancariaInputSchema.parse(rawInput);
    const rows = await this.repository.registrarReservaBancaria(id, input, tenantId, ator);
    return rows.map(mapReservaBancariaToResponse);
  }

  async removerReservaBancaria(rawId: string, rawReservaId: string, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const reservaId = this.parseId(rawReservaId);
    await this.repository.removerReservaBancaria(id, reservaId, tenantId, ator);
  }

  async gerarAutorizacaoPagamento(rawId: string, rawInput: unknown, ator: AutorizacaoCompraAtor) {
    const tenantId = this.parseTenant(ator.tenantId);
    const id = this.parseId(rawId);
    const input = autorizacaoPagamentoInputSchema.parse(this.normalizarPayload(rawInput));
    const detalhe = await this.repository.gerarAutorizacaoPagamento(id, input, tenantId, ator);
    return mapAutorizacaoCompraDetalheToResponse(detalhe);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(parsed);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
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
