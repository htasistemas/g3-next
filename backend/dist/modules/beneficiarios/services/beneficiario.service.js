import { AppError } from "../../../shared/errors/app-error.js";
import { beneficiarioFiltersSchema, beneficiarioInputSchema } from "../beneficiario.schema.js";
import { mapBeneficiarioToResponse } from "../beneficiario.mapper.js";
import { BeneficiarioRepository } from "../repositories/beneficiario.repository.js";
import { mapaCamposTextoBeneficiario, mapaDocumentoBeneficiario } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
export class BeneficiarioService {
    repository = new BeneficiarioRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome: "nomePessoa",
                status: "textoCurto"
            })
            : rawFilters;
        const filters = beneficiarioFiltersSchema.parse(filtersNormalizados);
        const beneficiarios = await this.repository.listar(filters);
        return beneficiarios.map(mapBeneficiarioToResponse);
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const beneficiario = await this.repository.buscarPorIdOuFalhar(id);
        return mapBeneficiarioToResponse(beneficiario);
    }
    async criar(rawInput) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = beneficiarioInputSchema.parse(inputNormalizado);
        const beneficiario = await this.repository.criar(input);
        return mapBeneficiarioToResponse(beneficiario);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = beneficiarioInputSchema.parse(inputNormalizado);
        const beneficiario = await this.repository.atualizar(id, input);
        return mapBeneficiarioToResponse(beneficiario);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async obterProximoCodigo() {
        const codigo = await this.repository.obterProximoCodigo();
        return { codigo };
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador de beneficiario invalido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        const inputBase = normalizarObjetoTexto(rawInput, mapaCamposTextoBeneficiario);
        if (Array.isArray(inputBase.documentos_obrigatorios)) {
            inputBase.documentos_obrigatorios = inputBase.documentos_obrigatorios.map((documento) => {
                if (!documento || typeof documento !== "object")
                    return documento;
                return normalizarObjetoTexto(documento, mapaDocumentoBeneficiario);
            });
        }
        return inputBase;
    }
}
