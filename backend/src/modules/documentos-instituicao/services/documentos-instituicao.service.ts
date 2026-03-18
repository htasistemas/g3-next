import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDocumentosInstituicao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { EmailService } from "../../email/services/email.service.js";
import { UnidadeAssistencialRepository } from "../../unidades-assistenciais/repositories/unidade-assistencial.repository.js";
import {
  mapDocumentoInstituicaoAnexoToResponse,
  mapDocumentoInstituicaoHistoricoToResponse,
  mapDocumentoInstituicaoToResponse
} from "../documentos-instituicao.mapper.js";
import {
  criarReferenciaAlertaEmailDocumento,
  deveEnviarAlertaEmailDocumento,
  montarMensagemAlertaEmailDocumentos,
  montarObservacaoHistoricoAlertaEmailDocumento
} from "../documentos-instituicao.alertas.js";
import { normalizarTipoAnexoDocumento } from "../documentos-instituicao.utils.js";
import {
  documentoInstituicaoAnexoInputSchema,
  documentoInstituicaoHistoricoInputSchema,
  documentoInstituicaoInputSchema
} from "../documentos-instituicao.schema.js";
import { DocumentosInstituicaoRepository } from "../repositories/documentos-instituicao.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export class DocumentosInstituicaoService {
  private readonly repository = new DocumentosInstituicaoRepository();
  private readonly emailService = new EmailService();
  private readonly unidadeAssistencialRepository = new UnidadeAssistencialRepository();

  async listar() {
    const registros = await this.repository.listar();
    return registros.map(mapDocumentoInstituicaoToResponse);
  }

  async criar(rawInput: unknown) {
    const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criar(input);
    this.dispararProcessamentoAlertaEmail([registro.id]);
    return mapDocumentoInstituicaoToResponse(registro);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizar(id, input);
    this.dispararProcessamentoAlertaEmail([registro.id]);
    return mapDocumentoInstituicaoToResponse(registro);
  }

  async excluir(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.excluir(id);
  }

  async listarAnexos(rawDocumentoId: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const anexos = await this.repository.listarAnexos(documentoId);
    return anexos.map(mapDocumentoInstituicaoAnexoToResponse);
  }

  async adicionarAnexo(rawDocumentoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const input = documentoInstituicaoAnexoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseIdOpcional(rawUsuarioId);
    const tipoAnexo = normalizarTipoAnexoDocumento(input);
    const arquivo = await storageService.persistirCampo({
      scope: "instituicao_documento",
      valor: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: documentoId,
      usuarioUploadId: usuarioId,
      observacao: input.tipoMime ?? input.tipo ?? tipoAnexo
    });

    try {
      const anexo = await this.repository.adicionarAnexo(documentoId, {
        ...input,
        tipo: tipoAnexo,
        conteudoBase64: arquivo.caminhoArquivo ?? input.conteudoBase64,
        nomeArquivo: input.nomeArquivo || arquivo.registro?.nome_original || "anexo",
        tipoMime: input.tipoMime || arquivo.registro?.mime_type
      });
      await this.registrarHistoricoAutomatico(
        documentoId,
        input.usuario,
        "Anexo enviado",
        `Arquivo ${anexo.nome_arquivo} anexado ao documento.`
      );
      return mapDocumentoInstituicaoAnexoToResponse(anexo);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.registro ? arquivo.caminhoArquivo : undefined]);
      throw error;
    }
  }

  async substituirAnexo(
    rawDocumentoId: string,
    rawAnexoId: string,
    rawInput: unknown,
    rawUsuarioId?: string
  ) {
    const documentoId = this.parseId(rawDocumentoId);
    const anexoId = this.parseId(rawAnexoId);
    const input = documentoInstituicaoAnexoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseIdOpcional(rawUsuarioId);
    const anexoAnterior = await this.repository.buscarAnexoPorIdOuFalhar(documentoId, anexoId);
    const tipoAnexo = normalizarTipoAnexoDocumento(input);

    const arquivo = await storageService.persistirCampo({
      scope: "instituicao_documento",
      valor: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: documentoId,
      usuarioUploadId: usuarioId,
      observacao: input.tipoMime ?? input.tipo ?? tipoAnexo
    });

    try {
      const anexo = await this.repository.atualizarAnexo(documentoId, anexoId, {
        ...input,
        tipo: tipoAnexo,
        conteudoBase64: arquivo.caminhoArquivo ?? input.conteudoBase64,
        nomeArquivo: input.nomeArquivo || arquivo.registro?.nome_original || "anexo",
        tipoMime: input.tipoMime || arquivo.registro?.mime_type
      });

      if (anexoAnterior.caminho_arquivo && anexoAnterior.caminho_arquivo !== arquivo.caminhoArquivo) {
        await storageService.desativarPorCaminho(anexoAnterior.caminho_arquivo, usuarioId);
      }

      await this.registrarHistoricoAutomatico(
        documentoId,
        input.usuario,
        "Anexo substituido",
        `Arquivo ${anexoAnterior.nome_arquivo} substituido por ${anexo.nome_arquivo}.`
      );

      return mapDocumentoInstituicaoAnexoToResponse(anexo);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.registro ? arquivo.caminhoArquivo : undefined]);
      throw error;
    }
  }

  async excluirAnexo(rawDocumentoId: string, rawAnexoId: string, rawUsuarioId?: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const anexoId = this.parseId(rawAnexoId);
    const usuarioId = this.parseIdOpcional(rawUsuarioId);
    const anexo = await this.repository.excluirAnexo(documentoId, anexoId);

    if (this.isManagedStoragePath(anexo.caminho_arquivo)) {
      await storageService.desativarPorCaminho(anexo.caminho_arquivo, usuarioId);
    }

    await this.registrarHistoricoAutomatico(
      documentoId,
      "Sistema",
      "Anexo excluido",
      `Arquivo ${anexo.nome_arquivo} removido do documento.`
    );
  }

  async obterArquivoAnexo(rawDocumentoId: string, rawAnexoId: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const anexoId = this.parseId(rawAnexoId);
    const anexo = await this.repository.buscarAnexoPorIdOuFalhar(documentoId, anexoId);
    if (!anexo.caminho_arquivo) {
      throw new AppError("Anexo sem arquivo armazenado.", 404);
    }
    return anexo.caminho_arquivo;
  }

  async listarHistorico(rawDocumentoId: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const historico = await this.repository.listarHistorico(documentoId);
    return historico.map(mapDocumentoInstituicaoHistoricoToResponse);
  }

  async adicionarHistorico(rawDocumentoId: string, rawInput: unknown) {
    const documentoId = this.parseId(rawDocumentoId);
    const input = documentoInstituicaoHistoricoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const historico = await this.repository.adicionarHistorico(documentoId, input);
    return mapDocumentoInstituicaoHistoricoToResponse(historico);
  }

  async processarAlertasEmailPendentes(documentoIds?: bigint[]) {
    const unidade = await this.unidadeAssistencialRepository.buscarAtual();
    const destinatario = unidade?.email?.trim();
    if (!destinatario) {
      console.warn("[documentos-instituicao] unidade assistencial principal sem email para alertas.");
      return { emailsEnviados: 0, documentosNotificados: 0 };
    }

    const registros = documentoIds?.length
      ? (
          await Promise.all(documentoIds.map((id) => this.repository.buscarPorId(id)))
        ).filter(Boolean)
      : await this.repository.listar();

    const documentos = registros
      .map((registro) => mapDocumentoInstituicaoToResponse(registro))
      .filter(deveEnviarAlertaEmailDocumento)
      .sort((a, b) => {
        const pesoA = a.situacao === "vencido" ? 0 : 1;
        const pesoB = b.situacao === "vencido" ? 0 : 1;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return String(a.validade ?? "").localeCompare(String(b.validade ?? ""));
      });

    if (!documentos.length) {
      return { emailsEnviados: 0, documentosNotificados: 0 };
    }

    const referenciaIso = criarReferenciaAlertaEmailDocumento();
    const pendentes: Array<{
      documentoId: bigint;
      documento: ReturnType<typeof mapDocumentoInstituicaoToResponse>;
      observacaoHistorico: string;
    }> = [];

    for (const documento of documentos) {
      const documentoId = this.parseId(documento.id);
      const observacaoHistorico = montarObservacaoHistoricoAlertaEmailDocumento(
        documento,
        referenciaIso
      );
      const jaEnviado = await this.repository.existeHistoricoAlertaEmail(
        documentoId,
        observacaoHistorico
      );
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
      mensagem: montarMensagemAlertaEmailDocumentos(
        nomeUnidade,
        pendentes.map((item) => item.documento),
        referenciaIso
      )
    });

    for (const item of pendentes) {
      await this.registrarHistoricoAutomatico(
        item.documentoId,
        "Sistema",
        "Alerta por e-mail",
        item.observacaoHistorico
      );
    }

    return {
      emailsEnviados: 1,
      documentosNotificados: pendentes.length
    };
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private parseIdOpcional(rawId?: string) {
    if (!rawId) return undefined;
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoDocumentosInstituicao
    );
  }

  private async registrarHistoricoAutomatico(
    documentoId: bigint,
    usuario: string,
    tipoAlteracao: string,
    observacao: string
  ) {
    try {
      await this.repository.adicionarHistorico(documentoId, {
        usuario,
        tipoAlteracao,
        observacao,
        dataHora: new Date().toISOString()
      });
    } catch (error) {
      console.warn("[documentos-instituicao] falha ao registrar historico automatico", error);
    }
  }

  private dispararProcessamentoAlertaEmail(documentoIds: bigint[]) {
    void this.processarAlertasEmailPendentes(documentoIds).catch((error) => {
      console.warn("[documentos-instituicao] falha ao processar alerta automatico por email", error);
    });
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }
}
