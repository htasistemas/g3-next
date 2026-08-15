import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContratacao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapArquivo, mapAuditoria, mapCandidatoDetalhe, mapCartaBanco, mapDocumento, mapEntrevista, mapFicha, mapPpd, mapProcesso, mapResumoCandidato, mapTermo } from "../rh-contratacao.mapper.js";
import { rhArquivoInputSchema, rhCandidatoInputSchema, rhCartaBancoInputSchema, rhDocumentoInputSchema, rhEntrevistaInputSchema, rhFichaInputSchema, rhPpdInputSchema, rhStatusProcessoInputSchema, rhTermoInputSchema } from "../rh-contratacao.schema.js";
import { RhContratacaoRepository } from "../repositories/rh-contratacao.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
export class RhContratacaoService {
    repository = new RhContratacaoRepository();
    async listarCandidatos(termo, rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const rows = await this.repository.listarCandidatos(termo, tenantId);
        return rows.map(mapResumoCandidato);
    }
    async buscarCandidato(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const candidato = await this.repository.buscarCandidatoOuFalhar(id, this.parseTenant(rawTenantId));
        return mapCandidatoDetalhe(candidato);
    }
    async criarCandidato(rawInput, rawUsuarioId, rawTenantId) {
        const input = rhCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const processo = await this.repository.criarCandidato(input, usuarioId, this.parseTenant(rawTenantId));
        if (!processo)
            throw new AppError("Nao foi possivel criar processo de contratacao.", 500);
        return mapProcesso(processo);
    }
    async atualizarCandidato(rawId, rawInput, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const input = rhCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const processo = await this.repository.atualizarCandidato(id, input, usuarioId, this.parseTenant(rawTenantId));
        if (!processo)
            throw new AppError("Processo nao encontrado para o candidato.", 404);
        return mapProcesso(processo);
    }
    async inativarCandidato(rawId, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        await this.repository.inativarCandidato(id, usuarioId, this.parseTenant(rawTenantId));
    }
    async buscarProcessoPorCandidato(rawCandidatoId, rawTenantId) {
        const candidatoId = this.parseId(rawCandidatoId);
        const processo = await this.repository.buscarProcessoPorCandidato(candidatoId, this.parseTenant(rawTenantId));
        if (!processo)
            throw new AppError("Processo de contratacao nao encontrado.", 404);
        return mapProcesso(processo);
    }
    async atualizarStatus(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const { status } = rhStatusProcessoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const processo = await this.repository.atualizarStatusProcesso(processoId, status, usuarioId, this.parseTenant(rawTenantId));
        return mapProcesso(processo);
    }
    async listarEntrevistas(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const rows = await this.repository.listarEntrevistas(processoId, this.parseTenant(rawTenantId));
        return rows.map(mapEntrevista);
    }
    async salvarEntrevista(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const input = rhEntrevistaInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const row = await this.repository.salvarEntrevista(processoId, input, usuarioId, this.parseTenant(rawTenantId));
        return mapEntrevista(row);
    }
    async buscarFicha(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const row = await this.repository.buscarFicha(processoId, this.parseTenant(rawTenantId));
        return mapFicha(row);
    }
    async salvarFicha(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const input = rhFichaInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const row = await this.repository.salvarFicha(processoId, input, usuarioId, this.parseTenant(rawTenantId));
        return mapFicha(row);
    }
    async listarDocumentos(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const rows = await this.repository.listarDocumentos(processoId, this.parseTenant(rawTenantId));
        return rows.map(mapDocumento);
    }
    async atualizarDocumento(rawId, rawInput, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const input = rhDocumentoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const row = await this.repository.atualizarDocumento(id, input, usuarioId, this.parseTenant(rawTenantId));
        if (!row)
            throw new AppError("Documento de contratacao nao encontrado.", 404);
        return mapDocumento(row);
    }
    async listarArquivos(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const rows = await this.repository.listarArquivos(processoId, this.parseTenant(rawTenantId));
        return rows.map(mapArquivo);
    }
    async adicionarArquivo(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const input = rhArquivoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        if (input.conteudoBase64) {
            const arquivo = await storageService.salvarArquivo({
                scope: "colaborador_documento",
                conteudo: input.conteudoBase64,
                nomeOriginal: input.nomeArquivo,
                mimeType: input.mimeType,
                entidadeId: processoId,
                entidadeTipo: "colaborador",
                usuarioUploadId: usuarioId ?? undefined,
                observacao: input.categoria
            });
            try {
                const row = await this.repository.adicionarArquivo(processoId, {
                    ...input,
                    caminhoArquivo: arquivo.caminhoArquivo,
                    conteudoBase64: null,
                    mimeType: arquivo.registro.mime_type,
                    tamanhoBytes: Number(arquivo.registro.tamanho_bytes)
                }, usuarioId, tenantId);
                await storageService.vincularEntidade(arquivo.caminhoArquivo, processoId);
                return mapArquivo(row);
            }
            catch (error) {
                await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
                throw error;
            }
        }
        const row = await this.repository.adicionarArquivo(processoId, input, usuarioId, tenantId);
        return mapArquivo(row);
    }
    async listarTermos(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const rows = await this.repository.listarTermos(processoId, this.parseTenant(rawTenantId));
        return rows.map(mapTermo);
    }
    async salvarTermo(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const input = rhTermoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const row = await this.repository.salvarTermo(processoId, input, usuarioId, this.parseTenant(rawTenantId));
        return mapTermo(row);
    }
    async buscarPpd(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const row = await this.repository.buscarPpd(processoId, this.parseTenant(rawTenantId));
        return mapPpd(row);
    }
    async salvarPpd(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const input = rhPpdInputSchema.parse(rawInput);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const row = await this.repository.salvarPpd(processoId, input, usuarioId, this.parseTenant(rawTenantId));
        return mapPpd(row);
    }
    async buscarCartaBanco(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const row = await this.repository.buscarCartaBanco(processoId, this.parseTenant(rawTenantId));
        return mapCartaBanco(row);
    }
    async salvarCartaBanco(rawProcessoId, rawInput, rawUsuarioId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const input = rhCartaBancoInputSchema.parse(rawInput);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const row = await this.repository.salvarCartaBanco(processoId, input, usuarioId, this.parseTenant(rawTenantId));
        return mapCartaBanco(row);
    }
    async listarAuditoria(rawProcessoId, rawTenantId) {
        const processoId = this.parseId(rawProcessoId);
        const rows = await this.repository.listarAuditoria(processoId, this.parseTenant(rawTenantId));
        return rows.map(mapAuditoria);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseOptionalId(rawId) {
        if (!rawId)
            return null;
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0)
            return null;
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
        return normalizarObjetoTexto(rawInput, mapaCamposTextoContratacao);
    }
}
