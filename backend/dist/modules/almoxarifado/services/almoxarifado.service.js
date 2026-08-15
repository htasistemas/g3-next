import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoAlmoxarifado } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapAlmoxarifadoItemToResponse, mapAlmoxarifadoKitComposicaoToResponse, mapAlmoxarifadoMovimentacaoToResponse } from "../almoxarifado.mapper.js";
import { almoxarifadoItemInputSchema, almoxarifadoKitComposicaoInputSchema, almoxarifadoMovimentacaoInputSchema } from "../almoxarifado.schema.js";
import { AlmoxarifadoRepository } from "../repositories/almoxarifado.repository.js";
export class AlmoxarifadoService {
    repository = new AlmoxarifadoRepository();
    async listarItens(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarItens(tenantId);
        return registros.map(mapAlmoxarifadoItemToResponse);
    }
    async obterProximoCodigo(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        return this.repository.obterProximoCodigo(tenantId);
    }
    async criarItem(rawInput, rawTenantId) {
        const input = almoxarifadoItemInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarItem(input, tenantId);
        return mapAlmoxarifadoItemToResponse(registro);
    }
    async atualizarItem(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = almoxarifadoItemInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizarItem(id, input, tenantId);
        return mapAlmoxarifadoItemToResponse(registro);
    }
    async removerItem(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.removerItem(id, tenantId);
    }
    async listarMovimentacoes(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarMovimentacoes(tenantId);
        return registros.map(mapAlmoxarifadoMovimentacaoToResponse);
    }
    async registrarMovimentacao(rawInput, rawTenantId) {
        const input = almoxarifadoMovimentacaoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const resultado = await this.repository.registrarMovimentacao(input, tenantId);
        return {
            movimentacao: mapAlmoxarifadoMovimentacaoToResponse(resultado.movimentacao),
            item: mapAlmoxarifadoItemToResponse(resultado.item)
        };
    }
    async listarComposicaoKit(rawProdutoKitId, rawTenantId) {
        const produtoKitId = this.parseId(rawProdutoKitId);
        const tenantId = this.parseTenant(rawTenantId);
        const itens = await this.repository.listarComposicaoKit(produtoKitId, tenantId);
        return itens.map(mapAlmoxarifadoKitComposicaoToResponse);
    }
    async atualizarComposicaoKit(rawProdutoKitId, rawItens, rawTenantId) {
        const produtoKitId = this.parseId(rawProdutoKitId);
        const itens = almoxarifadoKitComposicaoInputSchema.parse(rawItens);
        const tenantId = this.parseTenant(rawTenantId);
        const composicao = await this.repository.atualizarComposicaoKit(produtoKitId, itens, tenantId);
        return composicao.map(mapAlmoxarifadoKitComposicaoToResponse);
    }
    async listarVinculosKit(rawMovimentacaoId, rawTenantId) {
        const movimentacaoId = this.parseId(rawMovimentacaoId);
        const tenantId = this.parseTenant(rawTenantId);
        const vinculos = await this.repository.listarVinculosKit(movimentacaoId, tenantId);
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
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoAlmoxarifado);
    }
}
