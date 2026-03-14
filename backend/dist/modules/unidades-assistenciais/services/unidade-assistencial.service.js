import { AppError } from "../../../shared/errors/app-error.js";
import { unidadeAssistencialFiltersSchema, unidadeAssistencialInputSchema } from "../unidade-assistencial.schema.js";
import { mapUnidadeAssistencialToResponse } from "../unidade-assistencial.mapper.js";
import { UnidadeAssistencialRepository } from "../repositories/unidade-assistencial.repository.js";
import { mapaCamposTextoUnidadeAssistencial, mapaDiretoriaUnidade, mapaSalaUnidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
export class UnidadeAssistencialService {
    repository = new UnidadeAssistencialRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome_fantasia: "instituicao",
                cidade: "endereco"
            })
            : rawFilters;
        const filters = unidadeAssistencialFiltersSchema.parse(filtersNormalizados);
        const unidades = await this.repository.listar(filters);
        return unidades.map(mapUnidadeAssistencialToResponse);
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const unidade = await this.repository.buscarPorIdOuFalhar(id);
        return mapUnidadeAssistencialToResponse(unidade);
    }
    async buscarAtual() {
        const unidade = await this.repository.buscarAtual();
        return unidade ? mapUnidadeAssistencialToResponse(unidade) : null;
    }
    async criar(rawInput, rawUsuarioId) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const preparado = await this.prepararImagens(input, usuarioId);
        try {
            const unidade = await this.repository.criar(preparado.input);
            await this.vincularArquivos(preparado.novosCaminhos, unidade.id);
            return mapUnidadeAssistencialToResponse(unidade);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async atualizar(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const existente = await this.repository.buscarPorIdOuFalhar(id);
        const preparado = await this.prepararImagens(input, usuarioId, id);
        try {
            const unidade = await this.repository.atualizar(id, preparado.input);
            await this.vincularArquivos(preparado.novosCaminhos, id);
            await this.limparArquivosSubstituidos([existente.imagemUnidade?.logomarca, existente.imagemUnidade?.logomarcaRelatorio].filter((item) => this.isManagedStoragePath(item)), [unidade.imagemUnidade?.logomarca, unidade.imagemUnidade?.logomarcaRelatorio].filter((item) => this.isManagedStoragePath(item)), usuarioId);
            return mapUnidadeAssistencialToResponse(unidade);
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
        await this.limparArquivosSubstituidos([existente.imagemUnidade?.logomarca, existente.imagemUnidade?.logomarcaRelatorio].filter((item) => this.isManagedStoragePath(item)), [], usuarioId);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador de unidade assistencial invalido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        const inputBase = normalizarObjetoTexto(rawInput, mapaCamposTextoUnidadeAssistencial);
        if (Array.isArray(inputBase.diretoria)) {
            inputBase.diretoria = inputBase.diretoria.map((membro) => {
                if (!membro || typeof membro !== "object")
                    return membro;
                return normalizarObjetoTexto(membro, mapaDiretoriaUnidade);
            });
        }
        if (Array.isArray(inputBase.salas)) {
            inputBase.salas = inputBase.salas.map((sala) => {
                if (!sala || typeof sala !== "object")
                    return sala;
                return normalizarObjetoTexto(sala, mapaSalaUnidade);
            });
        }
        return inputBase;
    }
    async prepararImagens(input, usuarioId, entidadeId) {
        const novosCaminhos = [];
        const logomarca = await storageService.persistirCampo({
            scope: "instituicao_imagem",
            valor: input.logomarca,
            nomeOriginal: `${input.nome_fantasia.replace(/\s+/g, "-").toLowerCase()}-logomarca.jpg`,
            mimeType: "image/jpeg",
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: "Logomarca da instituicao"
        });
        if (logomarca.registro && logomarca.caminhoArquivo) {
            novosCaminhos.push(logomarca.caminhoArquivo);
        }
        const logomarcaRelatorio = await storageService.persistirCampo({
            scope: "instituicao_imagem",
            valor: input.logomarca_relatorio,
            nomeOriginal: `${input.nome_fantasia.replace(/\s+/g, "-").toLowerCase()}-logomarca-relatorio.jpg`,
            mimeType: "image/jpeg",
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: "Logomarca de relatorio da instituicao"
        });
        if (logomarcaRelatorio.registro && logomarcaRelatorio.caminhoArquivo) {
            novosCaminhos.push(logomarcaRelatorio.caminhoArquivo);
        }
        return {
            input: {
                ...input,
                logomarca: logomarca.caminhoArquivo,
                logomarca_relatorio: logomarcaRelatorio.caminhoArquivo
            },
            novosCaminhos
        };
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
}
