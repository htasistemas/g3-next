import { AppError } from "../../../shared/errors/app-error.js";
import { Readable } from "node:stream";
import { mapaCamposTextoDocumentosInstituicao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { EmailService } from "../../email/services/email.service.js";
import { UnidadeAssistencialRepository } from "../../unidades-assistenciais/repositories/unidade-assistencial.repository.js";
import { mapDocumentoInstituicaoAnexoToResponse, mapDocumentoInstituicaoHistoricoToResponse, mapDocumentoInstituicaoToResponse } from "../documentos-instituicao.mapper.js";
import { criarReferenciaAlertaEmailDocumento, deveEnviarAlertaEmailDocumento, montarMensagemAlertaEmailDocumentos, montarObservacaoHistoricoAlertaEmailDocumento } from "../documentos-instituicao.alertas.js";
import { normalizarTipoAnexoDocumento } from "../documentos-instituicao.utils.js";
import { documentoInstituicaoAnexoInputSchema, documentoInstituicaoHistoricoInputSchema, documentoInstituicaoInputSchema } from "../documentos-instituicao.schema.js";
import { DocumentosInstituicaoRepository } from "../repositories/documentos-instituicao.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { parseBase64Payload } from "../../arquivos/services/storage-utils.js";
export class DocumentosInstituicaoService {
    repository = new DocumentosInstituicaoRepository();
    emailService = new EmailService();
    unidadeAssistencialRepository = new UnidadeAssistencialRepository();
    async listar(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listar(tenantId);
        return registros.map(mapDocumentoInstituicaoToResponse);
    }
    async criar(rawInput, rawTenantId) {
        const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criar(input, tenantId);
        this.dispararProcessamentoAlertaEmail([registro.id], tenantId);
        return mapDocumentoInstituicaoToResponse(registro);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizar(id, input, tenantId);
        this.dispararProcessamentoAlertaEmail([registro.id], tenantId);
        return mapDocumentoInstituicaoToResponse(registro);
    }
    async excluir(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.excluir(id, tenantId);
    }
    async listarAnexos(rawDocumentoId, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const tenantId = this.parseTenant(rawTenantId);
        const anexos = await this.repository.listarAnexos(documentoId, tenantId);
        return anexos.map(mapDocumentoInstituicaoAnexoToResponse);
    }
    async adicionarAnexo(rawDocumentoId, rawInput, rawUsuarioId, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const input = documentoInstituicaoAnexoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseIdOpcional(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const tipoAnexo = normalizarTipoAnexoDocumento(input);
        const arquivo = await storageService.persistirCampo({
            scope: "instituicao_documento",
            valor: input.conteudoBase64,
            nomeOriginal: input.nomeArquivo,
            mimeType: input.tipoMime,
            entidadeId: documentoId,
            tenantId,
            usuarioUploadId: usuarioId,
            observacao: input.tipoMime ?? input.tipo ?? tipoAnexo
        });
        try {
            const anexo = await this.repository.adicionarAnexo(documentoId, {
                ...input,
                tipo: tipoAnexo,
                conteudoBase64: arquivo.caminhoArquivo ?? input.conteudoBase64,
                arquivoId: arquivo.registro?.id ?? null,
                nomeArquivo: input.nomeArquivo || arquivo.registro?.nome_original || "anexo",
                tipoMime: input.tipoMime || arquivo.registro?.mime_type
            }, tenantId);
            await this.registrarHistoricoAutomatico(documentoId, input.usuario, "Anexo enviado", `Arquivo ${anexo.nome_arquivo} anexado ao documento.`, tenantId);
            return mapDocumentoInstituicaoAnexoToResponse(anexo);
        }
        catch (error) {
            await storageService.rollbackArquivos([arquivo.registro ? arquivo.caminhoArquivo : undefined]);
            throw error;
        }
    }
    async substituirAnexo(rawDocumentoId, rawAnexoId, rawInput, rawUsuarioId, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const anexoId = this.parseId(rawAnexoId);
        const input = documentoInstituicaoAnexoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseIdOpcional(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const anexoAnterior = await this.repository.buscarAnexoPorIdOuFalhar(documentoId, anexoId, tenantId);
        const tipoAnexo = normalizarTipoAnexoDocumento(input);
        const arquivo = await storageService.persistirCampo({
            scope: "instituicao_documento",
            valor: input.conteudoBase64,
            nomeOriginal: input.nomeArquivo,
            mimeType: input.tipoMime,
            entidadeId: documentoId,
            tenantId,
            usuarioUploadId: usuarioId,
            observacao: input.tipoMime ?? input.tipo ?? tipoAnexo
        });
        try {
            const anexo = await this.repository.atualizarAnexo(documentoId, anexoId, {
                ...input,
                tipo: tipoAnexo,
                conteudoBase64: arquivo.caminhoArquivo ?? input.conteudoBase64,
                arquivoId: arquivo.registro?.id ?? null,
                nomeArquivo: input.nomeArquivo || arquivo.registro?.nome_original || "anexo",
                tipoMime: input.tipoMime || arquivo.registro?.mime_type
            }, tenantId);
            if (anexoAnterior.caminho_arquivo && anexoAnterior.caminho_arquivo !== arquivo.caminhoArquivo) {
                await storageService.desativarPorCaminho(anexoAnterior.caminho_arquivo, usuarioId);
            }
            await this.registrarHistoricoAutomatico(documentoId, input.usuario, "Anexo substituido", `Arquivo ${anexoAnterior.nome_arquivo} substituido por ${anexo.nome_arquivo}.`, tenantId);
            return mapDocumentoInstituicaoAnexoToResponse(anexo);
        }
        catch (error) {
            await storageService.rollbackArquivos([arquivo.registro ? arquivo.caminhoArquivo : undefined]);
            throw error;
        }
    }
    async excluirAnexo(rawDocumentoId, rawAnexoId, rawUsuarioId, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const anexoId = this.parseId(rawAnexoId);
        const usuarioId = this.parseIdOpcional(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const anexo = await this.repository.excluirAnexo(documentoId, anexoId, tenantId);
        if (this.isManagedStoragePath(anexo.caminho_arquivo)) {
            await storageService.desativarPorCaminho(anexo.caminho_arquivo, usuarioId);
        }
        await this.registrarHistoricoAutomatico(documentoId, "Sistema", "Anexo excluido", `Arquivo ${anexo.nome_arquivo} removido do documento.`, tenantId);
    }
    async obterArquivoAnexo(rawDocumentoId, rawAnexoId, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const anexoId = this.parseId(rawAnexoId);
        const tenantId = this.parseTenant(rawTenantId);
        const anexo = await this.repository.buscarAnexoPorIdOuFalhar(documentoId, anexoId, tenantId);
        if (!anexo.caminho_arquivo) {
            throw new AppError("Anexo sem arquivo armazenado.", 404);
        }
        const caminho = anexo.caminho_arquivo.trim();
        if (caminho.startsWith("data:")) {
            const { buffer, mimeType } = parseBase64Payload(caminho);
            return {
                mimeType: mimeType ?? "application/octet-stream",
                nomeArquivo: anexo.nome_arquivo,
                stream: Readable.from(buffer)
            };
        }
        return storageService.obterConteudoPorCaminhoBruto(caminho);
    }
    async listarHistorico(rawDocumentoId, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const tenantId = this.parseTenant(rawTenantId);
        const historico = await this.repository.listarHistorico(documentoId, tenantId);
        return historico.map(mapDocumentoInstituicaoHistoricoToResponse);
    }
    async adicionarHistorico(rawDocumentoId, rawInput, rawTenantId) {
        const documentoId = this.parseId(rawDocumentoId);
        const input = documentoInstituicaoHistoricoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const historico = await this.repository.adicionarHistorico(documentoId, input, tenantId);
        return mapDocumentoInstituicaoHistoricoToResponse(historico);
    }
    async processarAlertasEmailPendentes(documentoIds, tenantId) {
        const unidade = await this.unidadeAssistencialRepository.buscarAtual(tenantId);
        const destinatario = unidade?.email?.trim();
        if (!destinatario) {
            console.warn("[documentos-instituicao] unidade assistencial principal sem email para alertas.");
            return { emailsEnviados: 0, documentosNotificados: 0 };
        }
        const registros = documentoIds?.length
            ? (await Promise.all(documentoIds.map((id) => this.repository.buscarPorId(id, tenantId)))).filter(Boolean)
            : await this.repository.listar(tenantId);
        const documentos = registros
            .map((registro) => mapDocumentoInstituicaoToResponse(registro))
            .filter(deveEnviarAlertaEmailDocumento)
            .sort((a, b) => {
            const pesoA = a.situacao === "vencido" ? 0 : 1;
            const pesoB = b.situacao === "vencido" ? 0 : 1;
            if (pesoA !== pesoB)
                return pesoA - pesoB;
            return String(a.validade ?? "").localeCompare(String(b.validade ?? ""));
        });
        if (!documentos.length) {
            return { emailsEnviados: 0, documentosNotificados: 0 };
        }
        const referenciaIso = criarReferenciaAlertaEmailDocumento();
        const pendentes = [];
        for (const documento of documentos) {
            const documentoId = this.parseId(documento.id);
            const observacaoHistorico = montarObservacaoHistoricoAlertaEmailDocumento(documento, referenciaIso);
            const jaEnviado = await this.repository.existeHistoricoAlertaEmail(documentoId, observacaoHistorico, tenantId);
            if (!jaEnviado) {
                pendentes.push({ documentoId, documento, observacaoHistorico });
            }
        }
        if (!pendentes.length) {
            return { emailsEnviados: 0, documentosNotificados: 0 };
        }
        const nomeUnidade = unidade?.nomeFantasia?.trim() || unidade?.razaoSocial?.trim() || "principal";
        await this.emailService.enviarEmailSimples({
            destinatario,
            assunto: `Alerta de documentos institucionais - ${nomeUnidade}`,
            mensagem: montarMensagemAlertaEmailDocumentos(nomeUnidade, pendentes.map((item) => item.documento), referenciaIso)
        });
        for (const item of pendentes) {
            await this.registrarHistoricoAutomatico(item.documentoId, "Sistema", "Alerta por e-mail", item.observacaoHistorico, tenantId);
        }
        return {
            emailsEnviados: 1,
            documentosNotificados: pendentes.length
        };
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseIdOpcional(rawId) {
        if (!rawId)
            return undefined;
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
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
        return normalizarObjetoTexto(rawInput, mapaCamposTextoDocumentosInstituicao);
    }
    async registrarHistoricoAutomatico(documentoId, usuario, tipoAlteracao, observacao, tenantId) {
        try {
            await this.repository.adicionarHistorico(documentoId, {
                usuario,
                tipoAlteracao,
                observacao,
                dataHora: new Date().toISOString()
            }, tenantId);
        }
        catch (error) {
            console.warn("[documentos-instituicao] falha ao registrar historico automatico", error);
        }
    }
    dispararProcessamentoAlertaEmail(documentoIds, tenantId) {
        void this.processarAlertasEmailPendentes(documentoIds, tenantId).catch((error) => {
            console.warn("[documentos-instituicao] falha ao processar alerta automatico por email", error);
        });
    }
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
}
