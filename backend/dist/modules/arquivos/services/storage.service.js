import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError } from "../../../shared/errors/app-error.js";
import { toStringId } from "../../../utils/string-utils.js";
import { ArquivosRepository } from "../repositories/arquivos.repository.js";
import { getStoragePolicy, storagePolicies } from "./storage-policy.js";
import { getStorageProvider } from "./storage-factory.js";
import { detectarMimeTypePorAssinatura, ehUrlExterna, ehValorInlineDeArquivo, extrairExtensao, extToMime, formatarTamanhoBytes, garantirExtensaoPermitida, garantirMimeTypePermitido, mimeToExt, normalizarCaminhoLogico, normalizarNomeArquivo, parseBase64Payload } from "./storage-utils.js";
const STORAGE_TENANTS_ROOT = "tenants";
const STORAGE_TENANT_FALLBACK = "sem-tenant";
function escaparExpressaoRegular(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export class StorageService {
    repository = new ArquivosRepository();
    provider = getStorageProvider();
    normalizarTenantRoot(tenantId) {
        return normalizarCaminhoLogico(`${STORAGE_TENANTS_ROOT}/${tenantId?.trim() || STORAGE_TENANT_FALLBACK}`);
    }
    construirDiretorioBase(policy, input, data) {
        const tenantRoot = this.normalizarTenantRoot(input.tenantId);
        const year = data.getFullYear();
        const month = String(data.getMonth() + 1).padStart(2, "0");
        if (policy.imageOnly) {
            const entitySegment = input.entidadeId ? toStringId(input.entidadeId) : "pendente";
            return `${tenantRoot}/${policy.subdirectory}/${entitySegment}/${year}/${month}`;
        }
        return `${tenantRoot}/${policy.subdirectory}/${year}/${month}`;
    }
    async listar(rawFilters) {
        const entidadeId = rawFilters.entidadeId ? BigInt(rawFilters.entidadeId) : undefined;
        const ativo = rawFilters.ativo === undefined ? undefined : ["true", "1", "yes"].includes(rawFilters.ativo);
        return this.repository.listar({
            tenantId: rawFilters.tenantId,
            entidadeTipo: rawFilters.entidadeTipo?.trim() || undefined,
            entidadeId,
            categoria: rawFilters.categoria?.trim() || undefined,
            ativo
        });
    }
    async obterPorId(rawId, tenantId) {
        return this.repository.buscarPorIdOuFalhar(this.parseId(rawId), tenantId);
    }
    async obterConteudoPorId(rawId, usuarioId, tenantId, auditar = true) {
        const arquivo = await this.repository.buscarPorIdOuFalhar(this.parseId(rawId), tenantId);
        return this.obterConteudoPorCaminhoInterno(arquivo.caminho_arquivo, arquivo, usuarioId, "VIEW", auditar);
    }
    async obterConteudoPorCaminho(rawPath, usuarioId, tenantId, auditar = true) {
        if (!rawPath?.trim()) {
            throw new AppError("Caminho do arquivo nao informado.", 400);
        }
        const caminhoArquivo = this.provider.normalizePath(rawPath);
        const tenantObrigatorio = this.requireTenantId(tenantId);
        if (!this.caminhoPertenceAoTenant(caminhoArquivo, tenantObrigatorio)) {
            throw new AppError("Arquivo nao encontrado ou sem permissao de acesso.", 404);
        }
        const arquivo = await this.repository.buscarAtivoPorCaminho(caminhoArquivo, tenantObrigatorio);
        if (!arquivo) {
            throw new AppError("Arquivo nao encontrado ou sem permissao de acesso.", 404);
        }
        return this.obterConteudoPorCaminhoInterno(caminhoArquivo, arquivo, usuarioId, "VIEW", auditar);
    }
    async obterConteudoPorCaminhoBruto(rawPath) {
        if (!rawPath?.trim()) {
            throw new AppError("Caminho do arquivo nao informado.", 400);
        }
        const caminhoArquivo = this.provider.normalizePath(rawPath);
        return this.obterConteudoPorCaminhoInterno(caminhoArquivo, undefined, undefined, "VIEW", false);
    }
    async excluirLogico(rawId, usuarioId, tenantId) {
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
    async vincularEntidade(caminhoArquivo, entidadeId, tenantId) {
        const caminhoNormalizado = this.provider.normalizePath(caminhoArquivo);
        const arquivo = await this.repository.buscarAtivoPorCaminho(caminhoNormalizado, tenantId);
        if (!arquivo) {
            await this.repository.vincularEntidadePorCaminho(caminhoNormalizado, entidadeId, tenantId);
            return;
        }
        const policy = this.obterPolicyDoArquivo(arquivo);
        const novoCaminhoArquivo = this.reescreverCaminhoImagem(caminhoNormalizado, policy, entidadeId, false);
        const novoThumbnailCaminho = arquivo.thumbnail_caminho
            ? this.reescreverCaminhoImagem(arquivo.thumbnail_caminho, policy, entidadeId, true)
            : undefined;
        if (novoCaminhoArquivo !== caminhoNormalizado) {
            await this.provider.mover(caminhoNormalizado, novoCaminhoArquivo);
            if (arquivo.thumbnail_caminho && novoThumbnailCaminho && novoThumbnailCaminho !== arquivo.thumbnail_caminho) {
                await this.provider.mover(arquivo.thumbnail_caminho, novoThumbnailCaminho);
            }
        }
        await this.repository.vincularEntidadePorCaminho(caminhoNormalizado, entidadeId, tenantId, novoCaminhoArquivo !== caminhoNormalizado ? novoCaminhoArquivo : undefined, novoThumbnailCaminho && arquivo.thumbnail_caminho !== novoThumbnailCaminho
            ? novoThumbnailCaminho
            : undefined);
    }
    async desativarPorCaminho(caminhoArquivo, usuarioId, tenantId) {
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
    async rollbackArquivos(caminhosArquivos, tenantId) {
        for (const caminhoArquivo of caminhosArquivos) {
            if (!caminhoArquivo)
                continue;
            await this.desativarPorCaminho(caminhoArquivo, undefined, tenantId);
        }
    }
    async persistirCampo(input) {
        const valor = input.valor?.trim();
        if (!valor) {
            return { caminhoArquivo: undefined, registro: undefined };
        }
        if (ehUrlExterna(valor)) {
            return { caminhoArquivo: valor, registro: undefined };
        }
        if (!ehValorInlineDeArquivo(valor)) {
            return {
                caminhoArquivo: this.provider.normalizePath(valor),
                registro: undefined
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
    async salvarUpload(file, input) {
        return this.persistirBuffer({
            ...input,
            buffer: file.buffer,
            nomeOriginal: file.originalname,
            mimeType: file.mimetype,
            tamanhoBytes: file.size
        });
    }
    async salvarArquivo(input) {
        const parsed = parseBase64Payload(input.conteudo, input.mimeType);
        return this.persistirBuffer({
            ...input,
            buffer: parsed.buffer,
            mimeType: parsed.mimeType ?? input.mimeType,
            tamanhoBytes: input.tamanhoBytes ?? parsed.buffer.length
        });
    }
    async persistirBuffer(input) {
        const policy = getStoragePolicy(input.scope);
        const mimeAssinado = detectarMimeTypePorAssinatura(input.buffer);
        const nomeOriginal = normalizarNomeArquivo(input.nomeOriginal);
        const extensaoInferida = mimeToExt(mimeAssinado) ??
            mimeToExt(input.mimeType) ??
            extrairExtensao(nomeOriginal) ??
            "bin";
        const mimeType = mimeAssinado ?? input.mimeType ?? extToMime(extensaoInferida) ?? "application/octet-stream";
        garantirExtensaoPermitida(extensaoInferida, policy.allowedExtensions);
        garantirMimeTypePermitido(mimeType, policy.allowedMimeTypes);
        if (input.buffer.length > policy.maxSizeBytes) {
            throw new AppError(`O arquivo excede o tamanho maximo permitido de ${formatarTamanhoBytes(policy.maxSizeBytes)}.`, 400);
        }
        let principalBuffer = input.buffer;
        let thumbnailBuffer;
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
                        .toFormat(mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpeg", {
                        quality: 82
                    })
                        .toBuffer();
                }
            }
            catch {
                throw new AppError("Nao foi possivel processar a imagem enviada. Gere uma nova captura ou envie o arquivo pela galeria.", 400);
            }
        }
        const data = new Date();
        const baseName = nomeOriginal.replace(/\.[^.]+$/, "") || "arquivo";
        const uniqueName = `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}${String(data.getDate()).padStart(2, "0")}-${randomUUID()}-${baseName}`.slice(0, 120);
        const fileName = `${uniqueName}.${extensaoInferida}`;
        const relativeDir = this.construirDiretorioBase(policy, input, data);
        const caminhoArquivo = normalizarCaminhoLogico(`${relativeDir}/${fileName}`);
        const thumbnailCaminho = thumbnailBuffer
            ? normalizarCaminhoLogico(policy.imageOnly
                ? `${this.normalizarTenantRoot(input.tenantId)}/${policy.subdirectory}/thumbs/${input.entidadeId ? toStringId(input.entidadeId) : "pendente"}/${data.getFullYear()}/${String(data.getMonth() + 1).padStart(2, "0")}/${fileName}`
                : `${this.normalizarTenantRoot(input.tenantId)}/${policy.subdirectory}/thumbs/${data.getFullYear()}/${String(data.getMonth() + 1).padStart(2, "0")}/${fileName}`)
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
        }
        catch (error) {
            await this.provider.remover(caminhoArquivo);
            if (thumbnailCaminho) {
                await this.provider.remover(thumbnailCaminho);
            }
            throw error;
        }
    }
    async obterConteudoPorCaminhoInterno(caminhoArquivo, arquivo, usuarioId, acao = "VIEW", auditar = true) {
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
            mimeType: arquivo?.mime_type ?? extToMime(extrairExtensao(normalizedPath)) ?? "application/octet-stream",
            nomeArquivo: arquivo?.nome_original ?? normalizedPath.split("/").pop() ?? "arquivo",
            stream: this.provider.criarLeitura(normalizedPath)
        };
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador de arquivo invalido.", 400);
        }
        return BigInt(parsed);
    }
    requireTenantId(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId)
            throw new AppError("Tenant da sessao nao identificado.", 401);
        return tenantId;
    }
    caminhoPertenceAoTenant(caminho, tenantId) {
        const prefixo = `${STORAGE_TENANTS_ROOT}/${normalizarCaminhoLogico(tenantId)}/`;
        return caminho.startsWith(prefixo);
    }
    obterPolicyDoArquivo(arquivo) {
        const policy = Object.values(storagePolicies).find((item) => item.entidadeTipo === arquivo.entidade_tipo && item.categoria === arquivo.categoria);
        if (!policy) {
            throw new AppError("Politica de storage do arquivo nao encontrada.", 400);
        }
        return policy;
    }
    reescreverCaminhoImagem(caminhoArquivo, policy, entidadeId, thumb = false) {
        if (!policy.imageOnly)
            return caminhoArquivo;
        const entitySegment = toStringId(entidadeId);
        const subdirectoryRegex = escaparExpressaoRegular(policy.subdirectory);
        const tenantPattern = new RegExp(`^${STORAGE_TENANTS_ROOT}/([^/]+)/${subdirectoryRegex}/${thumb ? "thumbs/" : ""}pendente/`);
        const tenantMatch = caminhoArquivo.match(tenantPattern);
        if (tenantMatch?.[1]) {
            const tenantSegment = tenantMatch[1];
            return caminhoArquivo.replace(tenantPattern, `${STORAGE_TENANTS_ROOT}/${tenantSegment}/${policy.subdirectory}/${thumb ? "thumbs/" : ""}${entitySegment}/`);
        }
        const legacyPrefix = thumb
            ? `${policy.subdirectory}/thumbs/pendente/`
            : `${policy.subdirectory}/pendente/`;
        if (caminhoArquivo.startsWith(legacyPrefix)) {
            return caminhoArquivo.replace(legacyPrefix, `${STORAGE_TENANTS_ROOT}/${STORAGE_TENANT_FALLBACK}/${policy.subdirectory}/${thumb ? "thumbs/" : ""}${entitySegment}/`);
        }
        return caminhoArquivo;
    }
}
