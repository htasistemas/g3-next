import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError } from "../../../shared/errors/app-error.js";
import { toStringId } from "../../../utils/string-utils.js";
import type { ArquivoMetadataRow } from "../arquivos.types.js";
import { ArquivosRepository } from "../repositories/arquivos.repository.js";
import type { StorageScopeKey } from "./storage-policy.js";
import { getStoragePolicy, storagePolicies } from "./storage-policy.js";
import { getStorageProvider } from "./storage-factory.js";
import {
  detectarMimeTypePorAssinatura,
  ehUrlExterna,
  ehValorInlineDeArquivo,
  extrairExtensao,
  extToMime,
  formatarTamanhoBytes,
  garantirExtensaoPermitida,
  garantirMimeTypePermitido,
  mimeToExt,
  normalizarCaminhoLogico,
  normalizarNomeArquivo,
  parseBase64Payload
} from "./storage-utils.js";

type StoredFileResult = {
  registro: ArquivoMetadataRow;
  caminhoArquivo: string;
  thumbnailCaminho?: string;
};

type PersistirCampoInput = {
  scope: StorageScopeKey;
  valor?: string | null;
  nomeOriginal?: string | null;
  mimeType?: string | null;
  tamanhoBytes?: number | null;
  entidadeId?: bigint | null;
  entidadeTipo?: string;
  usuarioUploadId?: bigint | null;
  tenantId?: string | null;
  observacao?: string | null;
  metadadosJson?: Record<string, unknown> | null;
};

type SalvarArquivoInput = Omit<PersistirCampoInput, "valor"> & {
  conteudo: string;
};

type PersistirBufferInput = Omit<PersistirCampoInput, "valor"> & {
  buffer: Buffer;
};

const STORAGE_TENANTS_ROOT = "tenants";
const STORAGE_TENANT_FALLBACK = "sem-tenant";

function escaparExpressaoRegular(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class StorageService {
  private readonly repository = new ArquivosRepository();
  private readonly provider = getStorageProvider();

  private normalizarTenantRoot(tenantId?: string | null) {
    return normalizarCaminhoLogico(
      `${STORAGE_TENANTS_ROOT}/${tenantId?.trim() || STORAGE_TENANT_FALLBACK}`
    );
  }

  private construirDiretorioBase(policy: { subdirectory: string; imageOnly?: boolean }, input: PersistirBufferInput, data: Date) {
    const tenantRoot = this.normalizarTenantRoot(input.tenantId);
    const year = data.getFullYear();
    const month = String(data.getMonth() + 1).padStart(2, "0");

    if (policy.imageOnly) {
      const entitySegment = input.entidadeId ? toStringId(input.entidadeId) : "pendente";
      return `${tenantRoot}/${policy.subdirectory}/${entitySegment}/${year}/${month}`;
    }

    return `${tenantRoot}/${policy.subdirectory}/${year}/${month}`;
  }

  async listar(rawFilters: {
    tenantId?: string;
    entidadeTipo?: string;
    entidadeId?: string;
    categoria?: string;
    ativo?: string;
  }) {
    const entidadeId = rawFilters.entidadeId ? BigInt(rawFilters.entidadeId) : undefined;
    const ativo =
      rawFilters.ativo === undefined ? undefined : ["true", "1", "yes"].includes(rawFilters.ativo);

    return this.repository.listar({
      tenantId: rawFilters.tenantId,
      entidadeTipo: rawFilters.entidadeTipo?.trim() || undefined,
      entidadeId,
      categoria: rawFilters.categoria?.trim() || undefined,
      ativo
    });
  }

  async obterPorId(rawId: string, tenantId?: string) {
    return this.repository.buscarPorIdOuFalhar(this.parseId(rawId), tenantId);
  }

  async obterConteudoPorId(rawId: string, usuarioId?: bigint, tenantId?: string, auditar = true) {
    const arquivo = await this.repository.buscarPorIdOuFalhar(this.parseId(rawId), tenantId);
    return this.obterConteudoPorCaminhoInterno(arquivo.caminho_arquivo, arquivo, usuarioId, "VIEW", auditar);
  }

  async obterConteudoPorCaminho(rawPath: string, usuarioId?: bigint, tenantId?: string, auditar = true) {
    if (!rawPath?.trim()) {
      throw new AppError("Caminho do arquivo nao informado.", 400);
    }

    const caminhoArquivo = this.provider.normalizePath(rawPath);
    const arquivo = await this.repository.buscarAtivoPorCaminho(caminhoArquivo, tenantId);
    if (!arquivo) {
      throw new AppError("Arquivo nao encontrado ou sem permissao de acesso.", 404);
    }
    return this.obterConteudoPorCaminhoInterno(caminhoArquivo, arquivo, usuarioId, "VIEW", auditar);
  }

  async obterConteudoPorCaminhoBruto(rawPath: string) {
    if (!rawPath?.trim()) {
      throw new AppError("Caminho do arquivo nao informado.", 400);
    }

    const caminhoArquivo = this.provider.normalizePath(rawPath);
    return this.obterConteudoPorCaminhoInterno(caminhoArquivo, undefined, undefined, "VIEW", false);
  }

  async excluirLogico(rawId: string, usuarioId?: bigint, tenantId?: string) {
    const id = this.parseId(rawId);
    const arquivo = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    await this.repository.desativarPorId(id);
    await this.provider.remover(arquivo.caminho_arquivo);
    if (arquivo.thumbnail_caminho) {
      await this.provider.remover(arquivo.thumbnail_caminho);
    }
    await this.repository.registrarAuditoria({
      atorId: usuarioId,
      acao: "DELETE",
      entidadeId: toStringId(id),
      dados: {
        caminhoArquivo: arquivo.caminho_arquivo,
        nomeArquivo: arquivo.nome_arquivo
      }
    });
  }

  async vincularEntidade(caminhoArquivo: string, entidadeId: bigint, tenantId?: string) {
    const caminhoNormalizado = this.provider.normalizePath(caminhoArquivo);
    const arquivo = await this.repository.buscarAtivoPorCaminho(caminhoNormalizado, tenantId);
    if (!arquivo) {
      await this.repository.vincularEntidadePorCaminho(caminhoNormalizado, entidadeId, tenantId);
      return;
    }

    const policy = this.obterPolicyDoArquivo(arquivo);
    const novoCaminhoArquivo = this.reescreverCaminhoImagem(
      caminhoNormalizado,
      policy,
      entidadeId,
      false
    );
    const novoThumbnailCaminho = arquivo.thumbnail_caminho
      ? this.reescreverCaminhoImagem(arquivo.thumbnail_caminho, policy, entidadeId, true)
      : undefined;

    if (novoCaminhoArquivo !== caminhoNormalizado) {
      await this.provider.mover(caminhoNormalizado, novoCaminhoArquivo);
      if (arquivo.thumbnail_caminho && novoThumbnailCaminho && novoThumbnailCaminho !== arquivo.thumbnail_caminho) {
        await this.provider.mover(arquivo.thumbnail_caminho, novoThumbnailCaminho);
      }
    }

    await this.repository.vincularEntidadePorCaminho(
      caminhoNormalizado,
      entidadeId,
      tenantId,
      novoCaminhoArquivo !== caminhoNormalizado ? novoCaminhoArquivo : undefined,
      novoThumbnailCaminho && arquivo.thumbnail_caminho !== novoThumbnailCaminho
        ? novoThumbnailCaminho
        : undefined
    );
  }

  async desativarPorCaminho(caminhoArquivo?: string | null, usuarioId?: bigint, tenantId?: string) {
    if (!caminhoArquivo?.trim()) {
      return;
    }

    const caminhoLogico = this.provider.normalizePath(caminhoArquivo);
    const arquivo = await this.repository.buscarAtivoPorCaminho(caminhoLogico, tenantId);
    await this.repository.desativarPorCaminho(caminhoLogico);
    await this.provider.remover(caminhoLogico);

    if (arquivo?.thumbnail_caminho) {
      await this.provider.remover(arquivo.thumbnail_caminho);
    }

    await this.repository.registrarAuditoria({
      atorId: usuarioId,
      acao: "DELETE",
      entidadeId: arquivo ? toStringId(arquivo.id) : caminhoLogico,
      dados: {
        caminhoArquivo: caminhoLogico
      }
    });
  }

  async rollbackArquivos(caminhosArquivos: Array<string | undefined>, tenantId?: string) {
    for (const caminhoArquivo of caminhosArquivos) {
      if (!caminhoArquivo) continue;
      await this.desativarPorCaminho(caminhoArquivo, undefined, tenantId);
    }
  }

  async persistirCampo(input: PersistirCampoInput) {
    const valor = input.valor?.trim();
    if (!valor) {
      return { caminhoArquivo: undefined, registro: undefined as ArquivoMetadataRow | undefined };
    }

    if (ehUrlExterna(valor)) {
      return { caminhoArquivo: valor, registro: undefined as ArquivoMetadataRow | undefined };
    }

    if (!ehValorInlineDeArquivo(valor)) {
      return {
        caminhoArquivo: this.provider.normalizePath(valor),
        registro: undefined as ArquivoMetadataRow | undefined
      };
    }

    const resultado = await this.salvarArquivo({
      ...input,
      conteudo: valor
    });

    return {
      caminhoArquivo: resultado.caminhoArquivo,
      registro: resultado.registro
    };
  }

  async salvarUpload(
    file: Express.Multer.File,
    input: Omit<SalvarArquivoInput, "conteudo" | "nomeOriginal" | "mimeType" | "tamanhoBytes">
  ) {
    return this.persistirBuffer({
      ...input,
      buffer: file.buffer,
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanhoBytes: file.size
    });
  }

  async salvarArquivo(input: SalvarArquivoInput): Promise<StoredFileResult> {
    const parsed = parseBase64Payload(input.conteudo, input.mimeType);
    return this.persistirBuffer({
      ...input,
      buffer: parsed.buffer,
      mimeType: parsed.mimeType ?? input.mimeType,
      tamanhoBytes: input.tamanhoBytes ?? parsed.buffer.length
    });
  }

  private async persistirBuffer(input: PersistirBufferInput): Promise<StoredFileResult> {
    const policy = getStoragePolicy(input.scope);
    const mimeAssinado = detectarMimeTypePorAssinatura(input.buffer);
    const nomeOriginal = normalizarNomeArquivo(input.nomeOriginal);
    const extensaoInferida =
      mimeToExt(mimeAssinado) ??
      mimeToExt(input.mimeType) ??
      extrairExtensao(nomeOriginal) ??
      "bin";
    const mimeType =
      mimeAssinado ?? input.mimeType ?? extToMime(extensaoInferida) ?? "application/octet-stream";

    garantirExtensaoPermitida(extensaoInferida, policy.allowedExtensions);
    garantirMimeTypePermitido(mimeType, policy.allowedMimeTypes);

    if (input.buffer.length > policy.maxSizeBytes) {
      throw new AppError(
        `O arquivo excede o tamanho maximo permitido de ${formatarTamanhoBytes(policy.maxSizeBytes)}.`,
        400
      );
    }

    let principalBuffer = input.buffer;
    let thumbnailBuffer: Buffer | undefined;
    const processarImagem = mimeType.startsWith("image/");
    const preservarImagemOriginal = mimeType === "image/svg+xml";
    const processarImagemBinaria = processarImagem && !preservarImagemOriginal;

    if (policy.imageOnly && !processarImagem) {
      throw new AppError("Esta categoria aceita apenas imagens.", 400);
    }

    if (processarImagemBinaria) {
      try {
        principalBuffer = await sharp(input.buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .toFormat(mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpeg", {
            quality: 88
          })
          .toBuffer();

        if (policy.generateThumbnail) {
          thumbnailBuffer = await sharp(principalBuffer)
            .rotate()
            .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
            .toFormat(
              mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpeg",
              {
                quality: 82
              }
            )
            .toBuffer();
        }
      } catch {
        throw new AppError(
          "Nao foi possivel processar a imagem enviada. Gere uma nova captura ou envie o arquivo pela galeria.",
          400
        );
      }
    }

    const data = new Date();
    const baseName = nomeOriginal.replace(/\.[^.]+$/, "") || "arquivo";
    const uniqueName = `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}${String(data.getDate()).padStart(2, "0")}-${randomUUID()}-${baseName}`.slice(
      0,
      120
    );
    const fileName = `${uniqueName}.${extensaoInferida}`;
    const relativeDir = this.construirDiretorioBase(policy, input, data);
    const caminhoArquivo = normalizarCaminhoLogico(`${relativeDir}/${fileName}`);
    const thumbnailCaminho = thumbnailBuffer
      ? normalizarCaminhoLogico(
          policy.imageOnly
            ? `${this.normalizarTenantRoot(input.tenantId)}/${policy.subdirectory}/thumbs/${
                input.entidadeId ? toStringId(input.entidadeId) : "pendente"
              }/${data.getFullYear()}/${String(data.getMonth() + 1).padStart(2, "0")}/${fileName}`
            : `${this.normalizarTenantRoot(input.tenantId)}/${policy.subdirectory}/thumbs/${data.getFullYear()}/${String(
                data.getMonth() + 1
              ).padStart(2, "0")}/${fileName}`
        )
      : undefined;

    await this.provider.salvar(caminhoArquivo, principalBuffer, mimeType);
    if (thumbnailBuffer && thumbnailCaminho) {
      await this.provider.salvar(thumbnailCaminho, thumbnailBuffer, mimeType);
    }

    try {
      const registro = await this.repository.criar({
        entidadeTipo: input.entidadeTipo ?? policy.entidadeTipo,
        tenantId: input.tenantId ?? null,
        entidadeId: input.entidadeId ?? null,
        categoria: policy.categoria,
        nomeOriginal: input.nomeOriginal?.trim() || fileName,
        nomeArquivo: fileName,
        caminhoArquivo,
        thumbnailCaminho,
        mimeType,
        extensao: extensaoInferida,
        tamanhoBytes: principalBuffer.length,
        usuarioUploadId: input.usuarioUploadId ?? null,
        observacao: input.observacao ?? null,
        metadadosJson: input.metadadosJson ?? null
      });

      await this.repository.registrarAuditoria({
        atorId: input.usuarioUploadId ?? undefined,
        acao: "UPLOAD",
        entidadeId: toStringId(registro.id),
        dados: {
          entidadeTipo: registro.entidade_tipo,
          entidadeId: registro.entidade_id ? toStringId(registro.entidade_id) : null,
          categoria: registro.categoria,
          caminhoArquivo: registro.caminho_arquivo
        }
      });

      return {
        registro,
        caminhoArquivo,
        thumbnailCaminho
      };
    } catch (error) {
      await this.provider.remover(caminhoArquivo);
      if (thumbnailCaminho) {
        await this.provider.remover(thumbnailCaminho);
      }
      throw error;
    }
  }

  private async obterConteudoPorCaminhoInterno(
    caminhoArquivo: string,
    arquivo?: ArquivoMetadataRow,
    usuarioId?: bigint,
    acao: "VIEW" | "UPLOAD" | "UPDATE" | "DELETE" = "VIEW",
    auditar = true
  ) {
    const normalizedPath = this.provider.normalizePath(caminhoArquivo);
    const exists = await this.provider.existe(normalizedPath);
    if (!exists) {
      throw new AppError("Arquivo fisico nao encontrado.", 404);
    }

    if (arquivo && auditar) {
      await this.repository.registrarAuditoria({
        atorId: usuarioId,
        acao,
        entidadeId: toStringId(arquivo.id),
        dados: {
          caminhoArquivo: arquivo.caminho_arquivo,
          nomeArquivo: arquivo.nome_arquivo
        }
      });
    }

    return {
      caminhoArquivo: normalizedPath,
      mimeType:
        arquivo?.mime_type ?? extToMime(extrairExtensao(normalizedPath)) ?? "application/octet-stream",
      nomeArquivo: arquivo?.nome_original ?? normalizedPath.split("/").pop() ?? "arquivo",
      stream: this.provider.criarLeitura(normalizedPath)
    };
  }

  private parseId(rawId: string) {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador de arquivo invalido.", 400);
    }
    return BigInt(parsed);
  }

  private obterPolicyDoArquivo(arquivo: ArquivoMetadataRow) {
    const policy = Object.values(storagePolicies).find(
      (item) => item.entidadeTipo === arquivo.entidade_tipo && item.categoria === arquivo.categoria
    );
    if (!policy) {
      throw new AppError("Politica de storage do arquivo nao encontrada.", 400);
    }
    return policy;
  }

  private reescreverCaminhoImagem(
    caminhoArquivo: string,
    policy: { subdirectory: string; imageOnly?: boolean },
    entidadeId: bigint,
    thumb = false
  ) {
    if (!policy.imageOnly) return caminhoArquivo;

    const entitySegment = toStringId(entidadeId);
    const subdirectoryRegex = escaparExpressaoRegular(policy.subdirectory);
    const tenantPattern = new RegExp(
      `^${STORAGE_TENANTS_ROOT}/([^/]+)/${subdirectoryRegex}/${thumb ? "thumbs/" : ""}pendente/`
    );
    const tenantMatch = caminhoArquivo.match(tenantPattern);
    if (tenantMatch?.[1]) {
      const tenantSegment = tenantMatch[1];
      return caminhoArquivo.replace(
        tenantPattern,
        `${STORAGE_TENANTS_ROOT}/${tenantSegment}/${policy.subdirectory}/${thumb ? "thumbs/" : ""}${entitySegment}/`
      );
    }

    const legacyPrefix = thumb
      ? `${policy.subdirectory}/thumbs/pendente/`
      : `${policy.subdirectory}/pendente/`;
    if (caminhoArquivo.startsWith(legacyPrefix)) {
      return caminhoArquivo.replace(
        legacyPrefix,
        `${STORAGE_TENANTS_ROOT}/${STORAGE_TENANT_FALLBACK}/${policy.subdirectory}/${thumb ? "thumbs/" : ""}${entitySegment}/`
      );
    }

    return caminhoArquivo;
  }
}
