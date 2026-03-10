import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoFotosEventos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapFotoEventoItemToResponse, mapFotoEventoToResponse } from "../fotos-eventos.mapper.js";
import { fotoEventoFotoAtualizacaoSchema, fotoEventoFotoInputSchema, fotoEventoInputSchema } from "../fotos-eventos.schema.js";
import { FotosEventosRepository } from "../repositories/fotos-eventos.repository.js";
export class FotosEventosService {
    repository = new FotosEventosRepository();
    async listar(rawQuery) {
        const filtros = (rawQuery ?? {});
        const resultado = await this.repository.listar({
            busca: typeof filtros.busca === "string" ? filtros.busca : undefined,
            dataInicio: typeof filtros.dataInicio === "string" ? filtros.dataInicio : undefined,
            dataFim: typeof filtros.dataFim === "string" ? filtros.dataFim : undefined,
            unidadeId: typeof filtros.unidadeId === "string" ? filtros.unidadeId : undefined,
            status: typeof filtros.status === "string" ? filtros.status : undefined,
            tags: filtros.tags,
            ordenacao: typeof filtros.ordenacao === "string" ? filtros.ordenacao : undefined,
            pagina: typeof filtros.pagina === "string" ? filtros.pagina : undefined,
            tamanho: typeof filtros.tamanho === "string" ? filtros.tamanho : undefined
        });
        return {
            eventos: resultado.eventos.map((item) => mapFotoEventoToResponse(item, Number(item.total_fotos), item.foto_principal_url)),
            pagina: resultado.pagina,
            tamanho: resultado.tamanho,
            total: resultado.total,
            totalPaginas: Math.max(1, Math.ceil(resultado.total / resultado.tamanho))
        };
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        const fotoPrincipal = registro.fotos.find((item) => registro.evento.foto_principal_id && item.id === registro.evento.foto_principal_id);
        return {
            evento: mapFotoEventoToResponse(registro.evento, registro.fotos.length, fotoPrincipal?.arquivo ?? null),
            fotos: registro.fotos.map(mapFotoEventoItemToResponse)
        };
    }
    async criar(rawInput) {
        const input = fotoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        const fotoPrincipal = registro.fotos.find((item) => registro.evento.foto_principal_id && item.id === registro.evento.foto_principal_id);
        return mapFotoEventoToResponse(registro.evento, registro.fotos.length, fotoPrincipal?.arquivo);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = fotoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        const fotoPrincipal = registro.fotos.find((item) => registro.evento.foto_principal_id && item.id === registro.evento.foto_principal_id);
        return mapFotoEventoToResponse(registro.evento, registro.fotos.length, fotoPrincipal?.arquivo);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async adicionarFoto(rawEventoId, rawInput) {
        const eventoId = this.parseId(rawEventoId);
        const input = fotoEventoFotoInputSchema.parse(this.normalizarPayload(rawInput));
        const foto = await this.repository.adicionarFoto(eventoId, input);
        return mapFotoEventoItemToResponse(foto);
    }
    async atualizarFoto(rawEventoId, rawFotoId, rawInput) {
        const eventoId = this.parseId(rawEventoId);
        const fotoId = this.parseId(rawFotoId);
        const input = fotoEventoFotoAtualizacaoSchema.parse(this.normalizarPayload(rawInput));
        const foto = await this.repository.atualizarFoto(eventoId, fotoId, input);
        return mapFotoEventoItemToResponse(foto);
    }
    async removerFoto(rawEventoId, rawFotoId) {
        const eventoId = this.parseId(rawEventoId);
        const fotoId = this.parseId(rawFotoId);
        await this.repository.removerFoto(eventoId, fotoId);
    }
    async obterArquivoFoto(rawEventoId, rawFotoId) {
        const eventoId = this.parseId(rawEventoId);
        const fotoId = this.parseId(rawFotoId);
        const foto = await this.repository.buscarFotoPorIdOuFalhar(eventoId, fotoId);
        return foto.arquivo;
    }
    async obterFotoPrincipal(rawEventoId) {
        const eventoId = this.parseId(rawEventoId);
        const registro = await this.repository.buscarPorIdOuFalhar(eventoId);
        if (!registro.evento.foto_principal_id) {
            throw new AppError("Evento nao possui foto principal.", 404);
        }
        const foto = registro.fotos.find((item) => item.id === registro.evento.foto_principal_id);
        if (!foto) {
            throw new AppError("Foto principal nao encontrada.", 404);
        }
        return foto.arquivo;
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
        return normalizarObjetoTexto(rawInput, mapaCamposTextoFotosEventos);
    }
}
