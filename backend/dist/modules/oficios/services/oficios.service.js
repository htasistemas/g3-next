import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoOficios } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapOficioImagemToResponse, mapOficioToResponse } from "../oficios.mapper.js";
import { oficioImagemInputSchema, oficioInputSchema, oficioPdfAssinadoInputSchema } from "../oficios.schema.js";
import { OficiosRepository } from "../repositories/oficios.repository.js";
export class OficiosService {
    repository = new OficiosRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapOficioToResponse(item.oficio, item.tramites));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async criar(rawInput) {
        const input = oficioInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = oficioInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async salvarPdfAssinado(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = oficioPdfAssinadoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.salvarPdfAssinado(id, input);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async obterPdfAssinado(rawId) {
        const id = this.parseId(rawId);
        const pdf = await this.repository.obterPdfAssinado(id);
        if (!pdf.nome || !pdf.tipo || !pdf.conteudo) {
            throw new AppError("Oficio nao possui PDF assinado.", 404);
        }
        return pdf;
    }
    async removerPdfAssinado(rawId) {
        const id = this.parseId(rawId);
        await this.repository.removerPdfAssinado(id);
    }
    async listarImagens(rawId) {
        const id = this.parseId(rawId);
        const imagens = await this.repository.listarImagens(id);
        return imagens.map(mapOficioImagemToResponse);
    }
    async adicionarImagem(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = oficioImagemInputSchema.parse(this.normalizarPayload(rawInput));
        const imagem = await this.repository.adicionarImagem(id, input);
        return mapOficioImagemToResponse(imagem);
    }
    async removerImagem(rawId, rawImagemId) {
        const id = this.parseId(rawId);
        const imagemId = this.parseId(rawImagemId);
        await this.repository.removerImagem(id, imagemId);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoOficios);
    }
}
