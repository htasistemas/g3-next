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
import { storageService } from "../../arquivos/services/storage-instance.js";

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

  async criar(rawInput: unknown, rawUsuarioId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = beneficiarioInputSchema.parse(inputNormalizado);
    await this.validarDuplicidadeCadastro(input);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const preparado = await this.prepararArquivosPayload(input, usuarioId);

    try {
      const beneficiario = await this.repository.criar(preparado.input);
      await this.vincularArquivos(preparado.novosCaminhos, beneficiario.id);
      return mapBeneficiarioToResponse(beneficiario);
    } catch (error) {
      await storageService.rollbackArquivos(preparado.novosCaminhos);
      throw error;
    }
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = beneficiarioInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id);
    const preparado = await this.prepararArquivosPayload(input, usuarioId, id);

    try {
      const beneficiario = await this.repository.atualizar(id, preparado.input);
      await this.vincularArquivos(preparado.novosCaminhos, id);
      await this.limparArquivosSubstituidos(
        this.coletarCaminhosRegistro(existente),
        this.coletarCaminhosRegistro(beneficiario),
        usuarioId
      );
      return mapBeneficiarioToResponse(beneficiario);
    } catch (error) {
      await storageService.rollbackArquivos(preparado.novosCaminhos);
      throw error;
    }
  }

  async remover(rawId: string, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id);
    await this.repository.remover(id);
    await this.limparArquivosSubstituidos(this.coletarCaminhosRegistro(existente), [], usuarioId);
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

  private async prepararArquivosPayload(
    input: BeneficiarioInput,
    usuarioId?: bigint,
    entidadeId?: bigint
  ) {
    const novosCaminhos: string[] = [];

    let foto;
    try {
      foto = await storageService.persistirCampo({
        scope: "beneficiario_foto",
        valor: input.foto_3x4,
        nomeOriginal: `beneficiario-${input.codigo ?? "sem-codigo"}-foto.jpg`,
        mimeType: "image/jpeg",
        entidadeId,
        usuarioUploadId: usuarioId,
        observacao: "Foto 3x4 do beneficiario"
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(`Nao foi possivel processar a foto 3x4: ${error.message}`, error.statusCode);
      }
      throw new AppError("Nao foi possivel processar a foto 3x4 do beneficiario.", 422);
    }

    if (foto.registro && foto.caminhoArquivo) {
      novosCaminhos.push(foto.caminhoArquivo);
    }

    const documentosObrigatorios = await Promise.all(
      (input.documentos_obrigatorios ?? []).map(async (documento) => {
        let arquivo;
        try {
          arquivo = await storageService.persistirCampo({
            scope: "beneficiario_documento",
            valor: documento.caminhoArquivo ?? documento.conteudo,
            nomeOriginal:
              documento.nomeArquivo ??
              `${documento.nome?.replace(/\s+/g, "-").toLowerCase() || "documento"}.pdf`,
            mimeType: documento.contentType,
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: documento.nome
          });
        } catch (error) {
          if (error instanceof AppError) {
            throw new AppError(
              `Nao foi possivel processar o documento ${documento.nome}: ${error.message}`,
              error.statusCode
            );
          }

          const motivo =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "erro desconhecido no processamento do arquivo";

          throw new AppError(
            `Nao foi possivel processar o documento ${documento.nome}: ${motivo}.`,
            422
          );
        }

        if (arquivo.registro && arquivo.caminhoArquivo) {
          novosCaminhos.push(arquivo.caminhoArquivo);
        }

        return {
          ...documento,
          caminhoArquivo: arquivo.caminhoArquivo,
          conteudo: undefined,
          contentType: documento.contentType ?? arquivo.registro?.mime_type,
          nomeArquivo: documento.nomeArquivo ?? arquivo.registro?.nome_original
        };
      })
    );

    return {
      input: {
        ...input,
        foto_3x4: foto.caminhoArquivo,
        documentos_obrigatorios: documentosObrigatorios
      },
      novosCaminhos
    };
  }

  private coletarCaminhosRegistro(registro: Awaited<ReturnType<BeneficiarioRepository["buscarPorIdOuFalhar"]>>) {
    const caminhos = new Set<string>();

    if (this.isManagedStoragePath(registro.foto3x4)) {
      caminhos.add(registro.foto3x4!);
    }

    for (const documento of registro.documentos) {
      if (this.isManagedStoragePath(documento.caminhoArquivo)) {
        caminhos.add(documento.caminhoArquivo!);
      }
    }

    return [...caminhos];
  }

  private async vincularArquivos(caminhos: string[], entidadeId: bigint) {
    for (const caminho of caminhos) {
      await storageService.vincularEntidade(caminho, entidadeId);
    }
  }

  private async limparArquivosSubstituidos(
    caminhosAntigos: string[],
    caminhosAtuais: string[],
    usuarioId?: bigint
  ) {
    const atuais = new Set(caminhosAtuais);
    for (const caminho of caminhosAntigos) {
      if (!atuais.has(caminho)) {
        await storageService.desativarPorCaminho(caminho, usuarioId);
      }
    }
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }

  private parseUsuarioId(rawUsuarioId?: string) {
    if (!rawUsuarioId) return undefined;
    const parsed = Number(rawUsuarioId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }
}
