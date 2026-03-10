import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDoacaoRealizada } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { toStringId } from "../../../utils/string-utils.js";
import { doacaoRealizadaFiltersSchema, doacaoRealizadaInputSchema } from "../doacao-realizada.schema.js";
import { mapDoacaoRealizadaToResponse } from "../doacao-realizada.mapper.js";
import { DoacaoRealizadaRepository } from "../repositories/doacao-realizada.repository.js";
export class DoacaoRealizadaService {
    repository = new DoacaoRealizadaRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                beneficiario_nome: "nomePessoa",
                tipo_doacao: "textoCurto",
                situacao: "textoCurto"
            })
            : rawFilters;
        const filters = doacaoRealizadaFiltersSchema.parse(filtersNormalizados);
        const registros = await this.repository.listar(filters);
        return registros.map((registro) => mapDoacaoRealizadaToResponse(registro, []));
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapDoacaoRealizadaToResponse(registro.registro, registro.itens);
    }
    async criar(rawInput) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = doacaoRealizadaInputSchema.parse(inputNormalizado);
        const registro = await this.repository.criar(input);
        return mapDoacaoRealizadaToResponse(registro.registro, registro.itens);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = doacaoRealizadaInputSchema.parse(inputNormalizado);
        const registro = await this.repository.atualizar(id, input);
        return mapDoacaoRealizadaToResponse(registro.registro, registro.itens);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async listarBeneficiarios(rawTermo) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const registros = await this.repository.listarBeneficiarios(termo);
        return registros.map((item) => ({
            id: toStringId(item.id),
            nome_completo: item.nome_completo,
            codigo: item.codigo ?? undefined,
            cpf: item.cpf ?? undefined
        }));
    }
    async listarFamilias(rawTermo) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const registros = await this.repository.listarFamilias(termo);
        return registros.map((item) => ({
            id: toStringId(item.id),
            nome_familia: item.nome_familia
        }));
    }
    async listarItensEstoque(rawTermo) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const registros = await this.repository.listarItensEstoque(termo);
        return registros.map((item) => ({
            id: toStringId(item.id),
            codigo: item.codigo,
            descricao: item.descricao,
            unidade: item.unidade,
            estoque_atual: item.estoque_atual
        }));
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoDoacaoRealizada);
    }
}
