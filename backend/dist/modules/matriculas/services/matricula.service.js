import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoMatricula } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { toIsoDate, toStringId } from "../../../utils/string-utils.js";
import { mapBeneficiarioCatalogoToResponse, mapCursoToResponse, mapProfissionalCatalogoToResponse, mapSalaCatalogoToResponse } from "../matricula.mapper.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { matriculaFiltersSchema, matriculaInputSchema, matriculaPresencaDataCreateSchema, matriculaPresencaDataUpdateSchema, matriculaPresencaSalvarSchema } from "../matricula.schema.js";
import { MatriculaRepository } from "../repositories/matricula.repository.js";
export class MatriculaService {
    repository = new MatriculaRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome: "instituicao",
                tipo: "textoCurto",
                status: "textoCurto",
                profissional: "nomePessoa",
                beneficiario: "nomePessoa"
            })
            : rawFilters;
        const filters = matriculaFiltersSchema.parse(filtersNormalizados);
        const registros = await this.repository.listar(filters);
        return registros.map((curso) => mapCursoToResponse(curso, [], []));
    }
    async obterResumoCatalogo() {
        return this.repository.obterResumoCatalogo();
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapCursoToResponse(registro.curso, registro.matriculas, registro.filaEspera);
    }
    async criar(rawInput, rawUsuarioId) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = matriculaInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const imagem = await this.prepararImagem(input.imagem, input.nome, usuarioId);
        try {
            const registro = await this.repository.criar({ ...input, imagem: imagem.caminhoArquivo });
            if (imagem.novoCaminho) {
                await storageService.vincularEntidade(imagem.novoCaminho, registro.curso.id);
            }
            return mapCursoToResponse(registro.curso, registro.matriculas, registro.filaEspera);
        }
        catch (error) {
            await storageService.rollbackArquivos([imagem.novoCaminho]);
            throw error;
        }
    }
    async atualizar(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = matriculaInputSchema.parse(inputNormalizado);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const existente = await this.repository.buscarPorIdOuFalhar(id);
        const imagem = await this.prepararImagem(input.imagem, input.nome, usuarioId, id);
        try {
            const registro = await this.repository.atualizar(id, { ...input, imagem: imagem.caminhoArquivo });
            if (imagem.novoCaminho) {
                await storageService.vincularEntidade(imagem.novoCaminho, id);
            }
            if (this.isManagedStoragePath(existente.curso.imagem) && existente.curso.imagem !== registro.curso.imagem) {
                await storageService.desativarPorCaminho(existente.curso.imagem, usuarioId);
            }
            return mapCursoToResponse(registro.curso, registro.matriculas, registro.filaEspera);
        }
        catch (error) {
            await storageService.rollbackArquivos([imagem.novoCaminho]);
            throw error;
        }
    }
    async remover(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const existente = await this.repository.buscarPorIdOuFalhar(id);
        await this.repository.remover(id);
        if (this.isManagedStoragePath(existente.curso.imagem)) {
            await storageService.desativarPorCaminho(existente.curso.imagem, usuarioId);
        }
    }
    async listarBeneficiarios(rawTermo) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const registros = await this.repository.listarBeneficiarios(termo);
        return registros.map(mapBeneficiarioCatalogoToResponse);
    }
    async listarProfissionais(rawTermo) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const registros = await this.repository.listarProfissionais(termo);
        return registros.map(mapProfissionalCatalogoToResponse);
    }
    async listarSalas() {
        const registros = await this.repository.listarSalas();
        return registros.map(mapSalaCatalogoToResponse);
    }
    async listarPresencaDatas(rawCursoId, rawPendentes) {
        const cursoId = this.parseId(rawCursoId);
        const somentePendentes = rawPendentes === true ||
            rawPendentes === "true" ||
            rawPendentes === "1" ||
            rawPendentes === 1;
        const registros = await this.repository.listarPresencaDatas(cursoId, somentePendentes);
        return registros.map((item) => ({
            id: toStringId(item.id),
            data_aula: toIsoDate(item.data_aula) ?? "",
            status: item.status,
            observacoes: item.observacoes ?? undefined,
            total_presencas: typeof item.total_presencas === "bigint" ? Number(item.total_presencas) : Number(item.total_presencas ?? 0),
            total_anexos: typeof item.total_anexos === "bigint" ? Number(item.total_anexos) : Number(item.total_anexos ?? 0),
            criado_em: item.criado_em.toISOString(),
            atualizado_em: item.atualizado_em.toISOString()
        }));
    }
    async criarPresencaData(rawCursoId, rawInput) {
        const cursoId = this.parseId(rawCursoId);
        const input = matriculaPresencaDataCreateSchema.parse(rawInput);
        const data = await this.repository.criarPresencaData(cursoId, input);
        return {
            id: toStringId(data.id),
            data_aula: toIsoDate(data.data_aula) ?? "",
            status: data.status,
            observacoes: data.observacoes ?? undefined,
            total_presencas: 0,
            total_anexos: 0,
            criado_em: data.criado_em.toISOString(),
            atualizado_em: data.atualizado_em.toISOString()
        };
    }
    async atualizarPresencaData(rawCursoId, rawPresencaDataId, rawInput) {
        const cursoId = this.parseId(rawCursoId);
        const presencaDataId = this.parseId(rawPresencaDataId);
        const input = matriculaPresencaDataUpdateSchema.parse(rawInput);
        const data = await this.repository.atualizarPresencaData(cursoId, presencaDataId, input);
        return {
            id: toStringId(data.id),
            data_aula: toIsoDate(data.data_aula) ?? "",
            status: data.status,
            observacoes: data.observacoes ?? undefined,
            total_presencas: 0,
            total_anexos: 0,
            criado_em: data.criado_em.toISOString(),
            atualizado_em: data.atualizado_em.toISOString()
        };
    }
    async cancelarPresencaData(rawCursoId, rawPresencaDataId) {
        const cursoId = this.parseId(rawCursoId);
        const presencaDataId = this.parseId(rawPresencaDataId);
        const data = await this.repository.cancelarPresencaData(cursoId, presencaDataId);
        return {
            id: toStringId(data.id),
            data_aula: toIsoDate(data.data_aula) ?? "",
            status: data.status,
            observacoes: data.observacoes ?? undefined,
            total_presencas: 0,
            total_anexos: 0,
            criado_em: data.criado_em.toISOString(),
            atualizado_em: data.atualizado_em.toISOString()
        };
    }
    async removerPresencaData(rawCursoId, rawPresencaDataId) {
        const cursoId = this.parseId(rawCursoId);
        const presencaDataId = this.parseId(rawPresencaDataId);
        await this.repository.removerPresencaData(cursoId, presencaDataId);
    }
    async listarPresencasPorData(rawCursoId, rawPresencaDataId) {
        const cursoId = this.parseId(rawCursoId);
        const presencaDataId = this.parseId(rawPresencaDataId);
        const resultado = await this.repository.listarPresencasPorData(cursoId, presencaDataId);
        return {
            data_aula: toIsoDate(resultado.data_aula) ?? "",
            presencas: resultado.itens.map((item) => ({
                matricula_id: toStringId(item.matricula_id),
                beneficiario_nome: item.beneficiario_nome,
                cpf: item.cpf ?? undefined,
                status: item.status === "PRESENTE" ? "PRESENTE" : "AUSENTE"
            }))
        };
    }
    async salvarPresencasPorData(rawCursoId, rawPresencaDataId, rawInput) {
        const cursoId = this.parseId(rawCursoId);
        const presencaDataId = this.parseId(rawPresencaDataId);
        const input = matriculaPresencaSalvarSchema.parse(rawInput);
        const resultado = await this.repository.salvarPresencasPorData(cursoId, presencaDataId, input);
        return {
            data_aula: toIsoDate(resultado.data_aula) ?? "",
            presencas: resultado.itens.map((item) => ({
                matricula_id: toStringId(item.matricula_id),
                beneficiario_nome: item.beneficiario_nome,
                cpf: item.cpf ?? undefined,
                status: item.status === "PRESENTE" ? "PRESENTE" : "AUSENTE"
            }))
        };
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador de matricula invalido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoMatricula);
    }
    async prepararImagem(valor, nome, usuarioId, entidadeId) {
        const arquivo = await storageService.persistirCampo({
            scope: "curso_imagem",
            valor,
            nomeOriginal: `${nome?.replace(/\s+/g, "-").toLowerCase() || "curso"}-imagem.jpg`,
            mimeType: "image/jpeg",
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: "Imagem principal do curso"
        });
        return {
            caminhoArquivo: arquivo.caminhoArquivo,
            novoCaminho: arquivo.registro ? arquivo.caminhoArquivo : undefined
        };
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
