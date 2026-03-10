import { AppError } from "../../../shared/errors/app-error.js";
import {
  beneficiarioAddressSuggestionSchema,
  beneficiarioFiltersSchema,
  beneficiarioInputSchema
} from "../beneficiario.schema.js";
import { mapBeneficiarioToResponse } from "../beneficiario.mapper.js";
import { BeneficiarioRepository } from "../repositories/beneficiario.repository.js";
import {
  mapaCamposTextoBeneficiario,
  mapaDocumentoBeneficiario
} from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import type { BeneficiarioInput } from "../beneficiario.types.js";

export class BeneficiarioService {
  private readonly repository = new BeneficiarioRepository();

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome: "nomePessoa",
              status: "textoCurto"
            }
          )
        : rawFilters;

    const filters = beneficiarioFiltersSchema.parse(filtersNormalizados);
    const beneficiarios = await this.repository.listar(filters);
    return beneficiarios.map(mapBeneficiarioToResponse);
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const beneficiario = await this.repository.buscarPorIdOuFalhar(id);
    return mapBeneficiarioToResponse(beneficiario);
  }

  async criar(rawInput: unknown) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = beneficiarioInputSchema.parse(inputNormalizado);
    await this.validarDuplicidadeCadastro(input);
    const beneficiario = await this.repository.criar(input);
    return mapBeneficiarioToResponse(beneficiario);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = beneficiarioInputSchema.parse(inputNormalizado);
    await this.validarDuplicidadeCadastro(input, id);
    const beneficiario = await this.repository.atualizar(id, input);
    return mapBeneficiarioToResponse(beneficiario);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  async obterProximoCodigo() {
    const codigo = await this.repository.obterProximoCodigo();
    return { codigo };
  }

  async obterSugestaoEndereco(rawQuery: unknown) {
    const query = beneficiarioAddressSuggestionSchema.parse(rawQuery);
    return this.repository.buscarSugestaoEndereco(query);
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador de beneficiario invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    const inputBase = normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoBeneficiario
    );

    if (Array.isArray(inputBase.documentos_obrigatorios)) {
      inputBase.documentos_obrigatorios = inputBase.documentos_obrigatorios.map((documento) => {
        if (!documento || typeof documento !== "object") return documento;
        return normalizarObjetoTexto(documento as Record<string, unknown>, mapaDocumentoBeneficiario);
      });
    }

    return inputBase;
  }

  private async validarDuplicidadeCadastro(input: BeneficiarioInput, idIgnorado?: bigint) {
    const duplicidade = await this.repository.buscarDuplicidadeCadastro(input, idIgnorado);
    if (!duplicidade) {
      return;
    }

    const detalhes = [
      duplicidade.codigo ? `código ${duplicidade.codigo}` : null,
      duplicidade.cpf ? `CPF ${duplicidade.cpf}` : null
    ].filter(Boolean);

    const sufixo = detalhes.length ? ` (${detalhes.join(", ")})` : "";
    throw new AppError(
      `Já existe um beneficiário cadastrado com os mesmos dados${sufixo}.`,
      409
    );
  }
}
