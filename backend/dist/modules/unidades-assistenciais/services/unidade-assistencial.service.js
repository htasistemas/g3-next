import { AppError } from "../../../shared/errors/app-error.js";
import { unidadeAssistencialFiltersSchema, unidadeAssistencialInputSchema } from "../unidade-assistencial.schema.js";
import { mapUnidadeAssistencialToResponse } from "../unidade-assistencial.mapper.js";
import { UnidadeAssistencialRepository } from "../repositories/unidade-assistencial.repository.js";
import { mapaCamposTextoUnidadeAssistencial, mapaDiretoriaUnidade, mapaSalaUnidade } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
export class UnidadeAssistencialService {
    repository = new UnidadeAssistencialRepository();
    async listar(rawFilters, tenantId, contexto) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome_fantasia: "instituicao",
                cidade: "endereco"
            })
            : rawFilters;
        const filters = unidadeAssistencialFiltersSchema.parse(filtersNormalizados);
        const unidades = await this.repository.listar(filters, tenantId?.trim(), contexto);
        return unidades.map(mapUnidadeAssistencialToResponse);
    }
    async buscarPorId(rawId, tenantId, contexto) {
        const id = this.parseId(rawId);
        const unidade = await this.repository.buscarPorIdOuFalhar(id, tenantId?.trim(), contexto);
        return mapUnidadeAssistencialToResponse(unidade);
    }
    async buscarAtual(tenantId, contexto) {
        const unidade = await this.repository.buscarAtual(tenantId?.trim(), contexto);
        return unidade ? mapUnidadeAssistencialToResponse(unidade) : null;
    }
    async criar(rawInput, rawUsuarioId, tenantId) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const tenantIdNormalizado = tenantId?.trim();
        const preparado = await this.prepararImagens(input, usuarioId, undefined, tenantIdNormalizado);
        try {
            const unidade = await this.repository.criar(preparado.input, tenantIdNormalizado);
            if (!unidade) {
                throw new AppError("Unidade assistencial nao encontrada apos o salvamento.", 500);
            }
            await this.vincularArquivos(preparado.novosCaminhos, unidade.id, tenantIdNormalizado);
            return mapUnidadeAssistencialToResponse(unidade);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos, tenantIdNormalizado);
            throw error;
        }
    }
    async atualizar(rawId, rawInput, rawUsuarioId, tenantId, contexto) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const tenantIdNormalizado = tenantId?.trim();
        const existente = await this.repository.buscarPorIdOuFalhar(id, tenantIdNormalizado, contexto);
        const preparado = await this.prepararImagens(input, usuarioId, id, tenantIdNormalizado);
        try {
            const unidade = await this.repository.atualizar(id, preparado.input, tenantIdNormalizado);
            if (!unidade) {
                throw new AppError("Unidade assistencial nao encontrada apos a atualizacao.", 500);
            }
            await this.vincularArquivos(preparado.novosCaminhos, id, tenantIdNormalizado);
            await this.limparArquivosSubstituidos([existente.imagemUnidade?.logomarca, existente.imagemUnidade?.logomarcaRelatorio].filter((item) => this.isManagedStoragePath(item)), [unidade.imagemUnidade?.logomarca, unidade.imagemUnidade?.logomarcaRelatorio].filter((item) => this.isManagedStoragePath(item)), usuarioId, tenantIdNormalizado);
            return mapUnidadeAssistencialToResponse(unidade);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos, tenantIdNormalizado);
            throw error;
        }
    }
    async remover(rawId, rawUsuarioId, tenantId, contexto) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const tenantIdNormalizado = tenantId?.trim();
        const existente = await this.repository.buscarPorIdOuFalhar(id, tenantIdNormalizado, contexto);
        await this.repository.remover(id, tenantIdNormalizado);
        await this.limparArquivosSubstituidos([existente.imagemUnidade?.logomarca, existente.imagemUnidade?.logomarcaRelatorio].filter((item) => this.isManagedStoragePath(item)), [], usuarioId, tenantIdNormalizado);
    }
    async verificarVinculosSala(rawSalaId, tenantId) {
        const salaId = this.parseId(rawSalaId);
        return this.repository.verificarVinculosSala(salaId, tenantId?.trim());
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
    async prepararImagens(input, usuarioId, entidadeId, tenantId) {
        const novosCaminhos = [];
        const logomarca = await storageService.persistirCampo({
            scope: "instituicao_imagem",
            valor: input.logomarca,
            nomeOriginal: `${input.nome_fantasia.replace(/\s+/g, "-").toLowerCase()}-logomarca.jpg`,
            mimeType: "image/jpeg",
            entidadeId,
            tenantId,
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
            tenantId,
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
    async vincularArquivos(caminhos, entidadeId, tenantId) {
        for (const caminho of caminhos) {
            await storageService.vincularEntidade(caminho, entidadeId, tenantId);
        }
    }
    async limparArquivosSubstituidos(caminhosAntigos, caminhosAtuais, usuarioId, tenantId) {
        const atuais = new Set(caminhosAtuais);
        for (const caminho of caminhosAntigos) {
            if (!atuais.has(caminho)) {
                await storageService.desativarPorCaminho(caminho, usuarioId, tenantId);
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
