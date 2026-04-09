import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoFotosEventos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapFotoEventoItemToResponse, mapFotoEventoToResponse } from "../fotos-eventos.mapper.js";
import { fotoEventoFotoAtualizacaoSchema, fotoEventoFotoInputSchema, fotoEventoFotosLoteInputSchema, fotoEventoInputSchema } from "../fotos-eventos.schema.js";
import { fotoEventoReordenacaoSchema } from "../fotos-eventos.schema.js";
import { FotosEventosRepository } from "../repositories/fotos-eventos.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
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
    async criar(rawInput, rawUsuarioId) {
        const input = fotoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const preparado = await this.prepararFotoPrincipal(input, usuarioId);
        try {
            const registro = await this.repository.criar(preparado.input);
            await this.vincularFotos(registro.evento.id, preparado.novosCaminhos);
            const fotoPrincipal = registro.fotos.find((item) => registro.evento.foto_principal_id && item.id === registro.evento.foto_principal_id);
            return mapFotoEventoToResponse(registro.evento, registro.fotos.length, fotoPrincipal?.arquivo);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async atualizar(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const input = fotoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const preparado = await this.prepararFotoPrincipal(input, usuarioId, id);
        try {
            const registro = await this.repository.atualizar(id, preparado.input);
            await this.vincularFotos(id, preparado.novosCaminhos);
            const fotoPrincipal = registro.fotos.find((item) => registro.evento.foto_principal_id && item.id === registro.evento.foto_principal_id);
            return mapFotoEventoToResponse(registro.evento, registro.fotos.length, fotoPrincipal?.arquivo);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async remover(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        await this.repository.remover(id);
        await this.removerCaminhos(registro.fotos.map((item) => item.arquivo).filter((item) => this.isManagedStoragePath(item)), usuarioId);
    }
    async adicionarFoto(rawEventoId, rawInput, rawUsuarioId) {
        const eventoId = this.parseId(rawEventoId);
        const input = fotoEventoFotoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const preparado = await this.prepararFotoItem(input, usuarioId, eventoId);
        try {
            const foto = await this.repository.adicionarFoto(eventoId, preparado.input);
            await this.vincularFotos(eventoId, preparado.novosCaminhos);
            return mapFotoEventoItemToResponse(foto);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async adicionarFotosLote(rawEventoId, rawInput, rawUsuarioId) {
        const eventoId = this.parseId(rawEventoId);
        const input = fotoEventoFotosLoteInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const preparados = [];
        const novosCaminhos = [];
        for (const fotoInput of input.fotos) {
            const preparado = await this.prepararFotoItem(fotoInput, usuarioId, eventoId);
            preparados.push(preparado.input);
            novosCaminhos.push(...preparado.novosCaminhos);
        }
        try {
            const fotos = await this.repository.adicionarFotosLote(eventoId, {
                fotos: preparados,
                fotoPrincipalIndex: typeof input.fotoPrincipalIndex === "number" ? input.fotoPrincipalIndex : null
            });
            await this.vincularFotos(eventoId, novosCaminhos);
            return fotos.map(mapFotoEventoItemToResponse);
        }
        catch (error) {
            await storageService.rollbackArquivos(novosCaminhos);
            throw error;
        }
    }
    async definirFotoPrincipal(rawEventoId, rawFotoId) {
        const eventoId = this.parseId(rawEventoId);
        const fotoId = this.parseId(rawFotoId);
        const foto = await this.repository.definirFotoPrincipalPorId(eventoId, fotoId);
        return mapFotoEventoItemToResponse(foto);
    }
    async atualizarFoto(rawEventoId, rawFotoId, rawInput) {
        const eventoId = this.parseId(rawEventoId);
        const fotoId = this.parseId(rawFotoId);
        const input = fotoEventoFotoAtualizacaoSchema.parse(this.normalizarPayload(rawInput));
        const foto = await this.repository.atualizarFoto(eventoId, fotoId, input);
        return mapFotoEventoItemToResponse(foto);
    }
    async reordenarFotos(rawEventoId, rawInput) {
        const eventoId = this.parseId(rawEventoId);
        const input = fotoEventoReordenacaoSchema.parse(this.normalizarPayload(rawInput));
        const fotos = await this.repository.reordenarFotos(eventoId, input.fotoIds);
        return fotos.map(mapFotoEventoItemToResponse);
    }
    async removerFoto(rawEventoId, rawFotoId, rawUsuarioId) {
        const eventoId = this.parseId(rawEventoId);
        const fotoId = this.parseId(rawFotoId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const foto = await this.repository.buscarFotoPorIdOuFalhar(eventoId, fotoId);
        await this.repository.removerFoto(eventoId, fotoId);
        if (this.isManagedStoragePath(foto.arquivo)) {
            await storageService.desativarPorCaminho(foto.arquivo, usuarioId);
        }
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
    async prepararFotoPrincipal(input, usuarioId, entidadeId) {
        if (!input.fotoPrincipalUpload) {
            return { input, novosCaminhos: [] };
        }
        const arquivo = await storageService.salvarArquivo({
            scope: "evento_foto",
            conteudo: input.fotoPrincipalUpload.conteudo,
            nomeOriginal: input.fotoPrincipalUpload.nomeArquivo,
            mimeType: input.fotoPrincipalUpload.contentType,
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: "Foto principal do evento"
        });
        return {
            input: {
                ...input,
                fotoPrincipalUpload: {
                    ...input.fotoPrincipalUpload,
                    conteudo: arquivo.caminhoArquivo,
                    contentType: arquivo.registro.mime_type,
                    tamanhoBytes: Number(arquivo.registro.tamanho_bytes)
                }
            },
            novosCaminhos: [arquivo.caminhoArquivo]
        };
    }
    async prepararFotoItem(input, usuarioId, entidadeId) {
        const arquivo = await storageService.salvarArquivo({
            scope: "evento_foto",
            conteudo: input.arquivo.conteudo,
            nomeOriginal: input.arquivo.nomeArquivo,
            mimeType: input.arquivo.contentType,
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: input.legenda ?? "Foto do evento"
        });
        return {
            input: {
                ...input,
                arquivo: {
                    ...input.arquivo,
                    conteudo: arquivo.caminhoArquivo,
                    contentType: arquivo.registro.mime_type,
                    tamanhoBytes: Number(arquivo.registro.tamanho_bytes)
                }
            },
            novosCaminhos: [arquivo.caminhoArquivo]
        };
    }
    async vincularFotos(eventoId, caminhos) {
        for (const caminho of caminhos) {
            await storageService.vincularEntidade(caminho, eventoId);
        }
    }
    async removerCaminhos(caminhos, usuarioId) {
        for (const caminho of caminhos) {
            await storageService.desativarPorCaminho(caminho, usuarioId);
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
}
