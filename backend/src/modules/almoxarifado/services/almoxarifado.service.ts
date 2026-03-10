import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoAlmoxarifado } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapAlmoxarifadoItemToResponse,
  mapAlmoxarifadoKitComposicaoToResponse,
  mapAlmoxarifadoMovimentacaoToResponse
} from "../almoxarifado.mapper.js";
import {
  almoxarifadoItemInputSchema,
  almoxarifadoKitComposicaoInputSchema,
  almoxarifadoMovimentacaoInputSchema
} from "../almoxarifado.schema.js";
import { AlmoxarifadoRepository } from "../repositories/almoxarifado.repository.js";

export class AlmoxarifadoService {
  private readonly repository = new AlmoxarifadoRepository();

  async listarItens() {
    const registros = await this.repository.listarItens();
    return registros.map(mapAlmoxarifadoItemToResponse);
  }

  async obterProximoCodigo() {
    return this.repository.obterProximoCodigo();
  }

  async criarItem(rawInput: unknown) {
    const input = almoxarifadoItemInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criarItem(input);
    return mapAlmoxarifadoItemToResponse(registro);
  }

  async atualizarItem(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = almoxarifadoItemInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarItem(id, input);
    return mapAlmoxarifadoItemToResponse(registro);
  }

  async removerItem(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerItem(id);
  }

  async listarMovimentacoes() {
    const registros = await this.repository.listarMovimentacoes();
    return registros.map(mapAlmoxarifadoMovimentacaoToResponse);
  }

  async registrarMovimentacao(rawInput: unknown) {
    const input = almoxarifadoMovimentacaoInputSchema.parse(this.normalizarPayload(rawInput));
    const resultado = await this.repository.registrarMovimentacao(input);
    return {
      movimentacao: mapAlmoxarifadoMovimentacaoToResponse(resultado.movimentacao),
      item: mapAlmoxarifadoItemToResponse(resultado.item)
    };
  }

  async listarComposicaoKit(rawProdutoKitId: string) {
    const produtoKitId = this.parseId(rawProdutoKitId);
    const itens = await this.repository.listarComposicaoKit(produtoKitId);
    return itens.map(mapAlmoxarifadoKitComposicaoToResponse);
  }

  async atualizarComposicaoKit(rawProdutoKitId: string, rawItens: unknown) {
    const produtoKitId = this.parseId(rawProdutoKitId);
    const itens = almoxarifadoKitComposicaoInputSchema.parse(rawItens);
    const composicao = await this.repository.atualizarComposicaoKit(produtoKitId, itens);
    return composicao.map(mapAlmoxarifadoKitComposicaoToResponse);
  }

  async listarVinculosKit(rawMovimentacaoId: string) {
    const movimentacaoId = this.parseId(rawMovimentacaoId);
    const vinculos = await this.repository.listarVinculosKit(movimentacaoId);
    return vinculos.map((item) => ({
      movimentacao_id: Number(item.id),
      data_movimentacao: item.data_movimentacao.toISOString().slice(0, 10),
      tipo: item.tipo,
      item_codigo: item.codigo_item,
      item_descricao: item.descricao_item,
      quantidade: item.quantidade,
      saldo_apos: item.saldo_apos
    }));
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
      mapaCamposTextoAlmoxarifado
    );
  }
}
