import { AppError } from "../../../shared/errors/app-error.js";
import { EmailService } from "../../email/services/email.service.js";
import { beneficiarioAddressSuggestionSchema, beneficiarioFiltersSchema, beneficiarioInputSchema } from "../beneficiario.schema.js";
import { mapBeneficiarioToResponse } from "../beneficiario.mapper.js";
import { BeneficiarioRepository } from "../repositories/beneficiario.repository.js";
import { montarMensagemAlteracoesBeneficiario, montarResumoAlteracoesBeneficiario, obterDestinatariosAlteracaoBeneficiario } from "./beneficiario-email-notificacao.js";
import { mapaCamposTextoBeneficiario, mapaDocumentoBeneficiario } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
export class BeneficiarioService {
    repository = new BeneficiarioRepository();
    emailService = new EmailService();
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
    async criar(rawInput, rawUsuarioId) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = beneficiarioInputSchema.parse(inputNormalizado);
        await this.validarDuplicidadeCadastro(input);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const preparado = await this.prepararArquivosPayload(input, usuarioId);
        try {
            const beneficiario = await this.repository.criar(preparado.input);
            await this.vincularArquivos(preparado.novosCaminhos, beneficiario.id);
            return mapBeneficiarioToResponse(beneficiario);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async atualizar(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = beneficiarioInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const existente = await this.repository.buscarPorIdOuFalhar(id);
        const snapshotAnterior = mapBeneficiarioToResponse(existente);
        const preparado = await this.prepararArquivosPayload(input, usuarioId, id);
        try {
            let beneficiario;
            try {
                beneficiario = await this.repository.atualizar(id, preparado.input);
            }
            catch (error) {
                if (error instanceof AppError) {
                    throw error;
                }
                const motivo = error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : "falha inesperada ao atualizar os dados do beneficiario";
                throw new AppError(`Nao foi possivel atualizar o beneficiario. ${motivo}.`, 500);
            }
            try {
                await this.vincularArquivos(preparado.novosCaminhos, id);
            }
            catch (error) {
                if (error instanceof AppError) {
                    throw error;
                }
                const motivo = error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : "falha inesperada ao vincular os arquivos do beneficiario";
                throw new AppError(`Nao foi possivel vincular os arquivos do beneficiario. ${motivo}.`, 500);
            }
            try {
                await this.limparArquivosSubstituidos(this.coletarCaminhosRegistro(existente), this.coletarCaminhosRegistro(beneficiario), usuarioId);
            }
            catch (error) {
                console.warn("[beneficiario] falha ao limpar arquivos substituidos apos atualizar cadastro:", error);
            }
            const response = mapBeneficiarioToResponse(beneficiario);
            await this.enviarEmailAtualizacaoCadastro(snapshotAnterior, response);
            return response;
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async remover(rawId, rawUsuarioId) {
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
    async obterSugestaoEndereco(rawQuery) {
        const query = beneficiarioAddressSuggestionSchema.parse(rawQuery);
        return this.repository.buscarSugestaoEndereco(query);
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
    async validarDuplicidadeCadastro(input, idIgnorado) {
        const duplicidade = await this.repository.buscarDuplicidadeCadastro(input, idIgnorado);
        if (!duplicidade) {
            return;
        }
        const detalhes = [
            duplicidade.codigo ? `código ${duplicidade.codigo}` : null,
            duplicidade.cpf ? `CPF ${duplicidade.cpf}` : null
        ].filter(Boolean);
        const sufixo = detalhes.length ? ` (${detalhes.join(", ")})` : "";
        throw new AppError(`Já existe um beneficiário cadastrado com os mesmos dados${sufixo}.`, 409);
    }
    async prepararArquivosPayload(input, usuarioId, entidadeId) {
        const novosCaminhos = [];
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
        }
        catch (error) {
            if (error instanceof AppError) {
                throw new AppError(`Nao foi possivel processar a foto 3x4: ${error.message}`, error.statusCode);
            }
            throw new AppError("Nao foi possivel processar a foto 3x4 do beneficiario.", 422);
        }
        if (foto.registro && foto.caminhoArquivo) {
            novosCaminhos.push(foto.caminhoArquivo);
        }
        const documentosObrigatorios = await Promise.all((input.documentos_obrigatorios ?? []).map(async (documento) => {
            let arquivo;
            try {
                arquivo = await storageService.persistirCampo({
                    scope: "beneficiario_documento",
                    valor: documento.caminhoArquivo ?? documento.conteudo,
                    nomeOriginal: documento.nomeArquivo ??
                        `${documento.nome?.replace(/\s+/g, "-").toLowerCase() || "documento"}.pdf`,
                    mimeType: documento.contentType,
                    entidadeId,
                    usuarioUploadId: usuarioId,
                    observacao: documento.nome
                });
            }
            catch (error) {
                if (error instanceof AppError) {
                    throw new AppError(`Nao foi possivel processar o documento ${documento.nome}: ${error.message}`, error.statusCode);
                }
                const motivo = error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : "erro desconhecido no processamento do arquivo";
                throw new AppError(`Nao foi possivel processar o documento ${documento.nome}: ${motivo}.`, 422);
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
        }));
        return {
            input: {
                ...input,
                foto_3x4: foto.caminhoArquivo,
                documentos_obrigatorios: documentosObrigatorios
            },
            novosCaminhos
        };
    }
    coletarCaminhosRegistro(registro) {
        const caminhos = new Set();
        if (this.isManagedStoragePath(registro.foto3x4)) {
            caminhos.add(registro.foto3x4);
        }
        for (const documento of registro.documentos) {
            if (this.isManagedStoragePath(documento.caminhoArquivo)) {
                caminhos.add(documento.caminhoArquivo);
            }
        }
        return [...caminhos];
    }
    async vincularArquivos(caminhos, entidadeId) {
        for (const caminho of caminhos) {
            await storageService.vincularEntidade(caminho, entidadeId);
        }
    }
    async limparArquivosSubstituidos(caminhosAntigos, caminhosAtuais, usuarioId) {
        const atuais = new Set(caminhosAtuais);
        for (const caminho of caminhosAntigos) {
            if (!atuais.has(caminho)) {
                await storageService.desativarPorCaminho(caminho, usuarioId);
            }
        }
    }
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
    parseUsuarioId(rawUsuarioId) {
        if (!rawUsuarioId)
            return undefined;
        const parsed = Number(rawUsuarioId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
        }
        return BigInt(parsed);
    }
    async enviarEmailAtualizacaoCadastro(anterior, atual) {
        const alteracoes = montarResumoAlteracoesBeneficiario(anterior, atual);
        if (!alteracoes.length) {
            return;
        }
        const destinatarios = obterDestinatariosAlteracaoBeneficiario(anterior, atual);
        if (!destinatarios.length) {
            console.warn("[beneficiario] atualizacao sem destinatario para envio de email:", {
                codigo: atual.codigo,
                nome: atual.nome_completo
            });
            return;
        }
        const assunto = "Atualizacao cadastral do beneficiario - G3 Next";
        const mensagem = montarMensagemAlteracoesBeneficiario(atual, alteracoes);
        console.info("[beneficiario] preparando email automatico de atualizacao:", {
            codigo: atual.codigo,
            nome: atual.nome_completo,
            destinatarios,
            totalAlteracoes: alteracoes.length
        });
        for (const destinatario of destinatarios) {
            try {
                await this.emailService.enviarEmailSimples({
                    destinatario,
                    assunto,
                    mensagem
                });
                console.info("[beneficiario] email automatico de atualizacao enviado:", {
                    codigo: atual.codigo,
                    destinatario
                });
            }
            catch (error) {
                console.warn("[beneficiario] falha ao enviar email automatico de atualizacao:", {
                    codigo: atual.codigo,
                    destinatario,
                    error
                });
            }
        }
    }
}
