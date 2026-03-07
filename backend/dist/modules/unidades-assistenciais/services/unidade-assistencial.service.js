import { AppError } from "../../../shared/errors/app-error.js";
import { unidadeAssistencialFiltersSchema, unidadeAssistencialInputSchema } from "../unidade-assistencial.schema.js";
import { mapUnidadeAssistencialToResponse } from "../unidade-assistencial.mapper.js";
import { UnidadeAssistencialRepository } from "../repositories/unidade-assistencial.repository.js";
import { mapaCamposTextoUnidadeAssistencial, mapaDiretoriaUnidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
export class UnidadeAssistencialService {
    repository = new UnidadeAssistencialRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome_fantasia: "instituicao",
                cidade: "endereco"
            })
            : rawFilters;
        const filters = unidadeAssistencialFiltersSchema.parse(filtersNormalizados);
        const unidades = await this.repository.listar(filters);
        return unidades.map(mapUnidadeAssistencialToResponse);
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const unidade = await this.repository.buscarPorIdOuFalhar(id);
        return mapUnidadeAssistencialToResponse(unidade);
    }
    async buscarAtual() {
        const unidade = await this.repository.buscarAtual();
        return unidade ? mapUnidadeAssistencialToResponse(unidade) : null;
    }
    async criar(rawInput) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
        const unidade = await this.repository.criar(input);
        return mapUnidadeAssistencialToResponse(unidade);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
        const unidade = await this.repository.atualizar(id, input);
        return mapUnidadeAssistencialToResponse(unidade);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador de unidade assistencial invalido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        const inputBase = normalizarObjetoTexto(rawInput, mapaCamposTextoUnidadeAssistencial);
        if (Array.isArray(inputBase.diretoria)) {
            inputBase.diretoria = inputBase.diretoria.map((membro) => {
                if (!membro || typeof membro !== "object")
                    return membro;
                return normalizarObjetoTexto(membro, mapaDiretoriaUnidade);
            });
        }
        return inputBase;
    }
}
