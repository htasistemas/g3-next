import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoMatricula } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { toIsoDate, toStringId } from "../../../utils/string-utils.js";
import {
  mapBeneficiarioCatalogoToResponse,
  mapCursoToResponse,
  mapProfissionalCatalogoToResponse,
  mapSalaCatalogoToResponse
} from "../matricula.mapper.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import {
  matriculaFiltersSchema,
  matriculaInputSchema,
  matriculaPresencaDataCreateSchema,
  matriculaPresencaDataUpdateSchema,
  matriculaPresencaSalvarSchema
} from "../matricula.schema.js";
import { MatriculaRepository } from "../repositories/matricula.repository.js";

export class MatriculaService {
  private readonly repository = new MatriculaRepository();

  async listar(rawFilters: unknown, rawTenantId?: string) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome: "instituicao",
              tipo: "textoCurto",
              status: "textoCurto",
              profissional: "nomePessoa",
              beneficiario: "nomePessoa"
            }
          )
        : rawFilters;

    const filters = matriculaFiltersSchema.parse(filtersNormalizados);
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(filters, tenantId);
    const registrosDetalhados = await Promise.all(
      registros.map(async (curso) => {
        const detalhes = await this.repository.buscarPorId(curso.id, tenantId);
        return detalhes
          ? mapCursoToResponse(detalhes.curso, detalhes.matriculas, detalhes.filaEspera)
          : mapCursoToResponse(curso, [], []);
      })
    );

    return registrosDetalhados;
  }

  async obterResumoCatalogo(rawTenantId?: string) {
    return this.repository.obterResumoCatalogo(this.parseTenant(rawTenantId));
  }

  async buscarPorId(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapCursoToResponse(registro.curso, registro.matriculas, registro.filaEspera);
  }

  async criar(rawInput: unknown, rawUsuarioId?: string, rawTenantId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = matriculaInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const imagem = await this.prepararImagem(input.imagem, input.nome, usuarioId);

    try {
      const registro = await this.repository.criar({ ...input, imagem: imagem.caminhoArquivo }, tenantId);
      if (imagem.novoCaminho) {
        await storageService.vincularEntidade(imagem.novoCaminho, registro.curso.id);
      }
      return mapCursoToResponse(registro.curso, registro.matriculas, registro.filaEspera);
    } catch (error) {
      await storageService.rollbackArquivos([imagem.novoCaminho]);
      throw error;
    }
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = matriculaInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const imagem = await this.prepararImagem(input.imagem, input.nome, usuarioId, id);

    try {
      const registro = await this.repository.atualizar(id, { ...input, imagem: imagem.caminhoArquivo }, tenantId);
      if (imagem.novoCaminho) {
        await storageService.vincularEntidade(imagem.novoCaminho, id);
      }
      if (this.isManagedStoragePath(existente.curso.imagem) && existente.curso.imagem !== registro.curso.imagem) {
        await storageService.desativarPorCaminho(existente.curso.imagem, usuarioId);
      }
      return mapCursoToResponse(registro.curso, registro.matriculas, registro.filaEspera);
    } catch (error) {
      await storageService.rollbackArquivos([imagem.novoCaminho]);
      throw error;
    }
  }

  async remover(rawId: string, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    await this.repository.remover(id, tenantId);
    if (this.isManagedStoragePath(existente.curso.imagem)) {
      await storageService.desativarPorCaminho(existente.curso.imagem, usuarioId);
    }
  }

  async listarBeneficiarios(rawTermo: unknown, rawTenantId?: string) {
    const termo = typeof rawTermo === "string" ? rawTermo : undefined;
    const registros = await this.repository.listarBeneficiarios(termo, this.parseTenant(rawTenantId));
    return registros.map(mapBeneficiarioCatalogoToResponse);
  }

  async listarProfissionais(rawTermo: unknown, rawTenantId?: string) {
    const termo = typeof rawTermo === "string" ? rawTermo : undefined;
    const registros = await this.repository.listarProfissionais(termo, this.parseTenant(rawTenantId));
    return registros.map(mapProfissionalCatalogoToResponse);
  }

  async listarSalas(rawTenantId?: string) {
    const registros = await this.repository.listarSalas(this.parseTenant(rawTenantId));
    return registros.map(mapSalaCatalogoToResponse);
  }

  async listarPresencaDatas(rawCursoId: string, rawPendentes: unknown, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const tenantId = this.parseTenant(rawTenantId);
    const somentePendentes =
      rawPendentes === true ||
      rawPendentes === "true" ||
      rawPendentes === "1" ||
      rawPendentes === 1;
    const registros = await this.repository.listarPresencaDatas(cursoId, tenantId, somentePendentes);

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

  async criarPresencaData(rawCursoId: string, rawInput: unknown, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const input = matriculaPresencaDataCreateSchema.parse(rawInput);
    const data = await this.repository.criarPresencaData(cursoId, input, this.parseTenant(rawTenantId));

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

  async atualizarPresencaData(rawCursoId: string, rawPresencaDataId: string, rawInput: unknown, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const presencaDataId = this.parseId(rawPresencaDataId);
    const input = matriculaPresencaDataUpdateSchema.parse(rawInput);
    const data = await this.repository.atualizarPresencaData(cursoId, presencaDataId, input, this.parseTenant(rawTenantId));

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

  async cancelarPresencaData(rawCursoId: string, rawPresencaDataId: string, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const presencaDataId = this.parseId(rawPresencaDataId);
    const data = await this.repository.cancelarPresencaData(cursoId, presencaDataId, this.parseTenant(rawTenantId));

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

  async removerPresencaData(rawCursoId: string, rawPresencaDataId: string, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const presencaDataId = this.parseId(rawPresencaDataId);
    await this.repository.removerPresencaData(cursoId, presencaDataId, this.parseTenant(rawTenantId));
  }

  async listarPresencasPorData(rawCursoId: string, rawPresencaDataId: string, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const presencaDataId = this.parseId(rawPresencaDataId);
    const resultado = await this.repository.listarPresencasPorData(cursoId, presencaDataId, this.parseTenant(rawTenantId));

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

  async salvarPresencasPorData(rawCursoId: string, rawPresencaDataId: string, rawInput: unknown, rawTenantId?: string) {
    const cursoId = this.parseId(rawCursoId);
    const presencaDataId = this.parseId(rawPresencaDataId);
    const input = matriculaPresencaSalvarSchema.parse(rawInput);
    const resultado = await this.repository.salvarPresencasPorData(cursoId, presencaDataId, input, this.parseTenant(rawTenantId));

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

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador de matricula invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoMatricula
    );
  }

  private async prepararImagem(
    valor?: string,
    nome?: string,
    usuarioId?: bigint,
    entidadeId?: bigint
  ) {
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

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }

  private parseUsuarioId(rawUsuarioId?: string) {
    if (!rawUsuarioId) return undefined;
    const parsed = Number(rawUsuarioId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }
}
