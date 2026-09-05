import { AppError } from "../../../shared/errors/app-error.js";
import { projetoIndicadorInputSchema, projetoIndicadorMedicaoSchema } from "../projeto-indicadores.schema.js";
import { ProjetoIndicadoresRepository } from "../repositories/projeto-indicadores.repository.js";
import type { ProjetoIndicadorInput } from "../projeto-indicadores.types.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

type Actor = { id?: string; tenant_id?: string; contexto?: { projeto_id?: string } };

export class ProjetoIndicadoresService {
  private readonly repository = new ProjetoIndicadoresRepository();

  async listar(rawProjetoId: string, actor: Actor) {
    const { projetoId, tenantId } = this.contexto(rawProjetoId, actor);
    await this.repository.garantirProjeto(projetoId, tenantId);
    return (await this.repository.listar(projetoId, tenantId)).map(mapIndicador);
  }

  async dashboard(rawFilters: { projeto_id?: string; periodo_de?: string; periodo_ate?: string; unidade_id?: string }, actor: Actor) {
    const tenantId = actor.tenant_id?.trim();
    if (!tenantId) throw new AppError("Tenant da sessão não identificado.", 401);
    const projetoId = rawFilters.projeto_id ? parseId(rawFilters.projeto_id, "projeto") : undefined;
    const unidadeId = rawFilters.unidade_id ? parseId(rawFilters.unidade_id, "unidade") : undefined;
    const validarData = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
    const periodoDe = validarData(rawFilters.periodo_de);
    const periodoAte = validarData(rawFilters.periodo_ate);
    if (rawFilters.periodo_de && !periodoDe || rawFilters.periodo_ate && !periodoAte) throw new AppError("Informe períodos válidos no formato ISO.", 400);
    if (periodoDe && periodoAte && periodoAte < periodoDe) throw new AppError("O período final não pode ser anterior ao inicial.", 400);
    if (projetoId && actor.contexto?.projeto_id && actor.contexto.projeto_id !== projetoId.toString()) throw new AppError("Projeto fora do contexto organizacional ativo.", 403);
    return this.repository.dashboard(tenantId, { projetoId, unidadeId, periodoDe, periodoAte });
  }

  async criar(rawProjetoId: string, rawInput: unknown, actor: Actor) {
    const { projetoId, tenantId } = this.contexto(rawProjetoId, actor);
    await this.repository.garantirProjeto(projetoId, tenantId);
    const input = projetoIndicadorInputSchema.parse(rawInput) as ProjetoIndicadorInput;
    const row = await this.repository.criar(projetoId, tenantId, input, actorId(actor));
    return mapIndicador(row);
  }

  async registrarMedicao(rawProjetoId: string, rawIndicadorId: string, rawInput: unknown, actor: Actor) {
    const { projetoId, tenantId } = this.contexto(rawProjetoId, actor);
    const indicadorId = parseId(rawIndicadorId, "indicador");
    const input = projetoIndicadorMedicaoSchema.parse(rawInput);
    const evidenciaId = input.evidencia_id ? BigInt(input.evidencia_id) : undefined;
    const row = await this.repository.registrarMedicao(indicadorId, projetoId, tenantId, input.competencia, input.valor, input.observacao, evidenciaId, actorId(actor));
    return mapMedicao(row);
  }

  async listarMedicoes(rawProjetoId: string, rawIndicadorId: string, actor: Actor) {
    const { projetoId, tenantId } = this.contexto(rawProjetoId, actor);
    const indicadorId = parseId(rawIndicadorId, "indicador");
    const rows = await this.repository.listarMedicoes(indicadorId, projetoId, tenantId);
    return rows.map(mapMedicao);
  }

  async listarEvidencias(rawProjetoId: string, rawIndicadorId: string, actor: Actor) {
    const { projetoId, tenantId } = this.contexto(rawProjetoId, actor);
    const indicadorId = parseId(rawIndicadorId, "indicador");
    return (await this.repository.listarEvidencias(indicadorId, projetoId, tenantId)).map(mapEvidencia);
  }

  async enviarEvidencia(rawProjetoId: string, rawIndicadorId: string, file: Express.Multer.File | undefined, actor: Actor) {
    const { projetoId, tenantId } = this.contexto(rawProjetoId, actor);
    const indicadorId = parseId(rawIndicadorId, "indicador");
    if (!file) throw new AppError("Selecione um arquivo de evidência.", 400);
    const upload = await storageService.salvarUpload(file, { scope: "projeto_indicador_evidencia", entidadeId: indicadorId, entidadeTipo: "projeto_indicador", usuarioUploadId: actorId(actor), tenantId, observacao: `Evidência do projeto ${projetoId.toString()}` });
    try {
      const row = await this.repository.registrarEvidencia(indicadorId, projetoId, tenantId, { nome: file.originalname, referencia: upload.caminhoArquivo, mime: upload.registro.mime_type, tamanho: Number(upload.registro.tamanho_bytes), usuario: actorId(actor) ?? undefined });
      return mapEvidencia(row);
    } catch (error) {
      await storageService.excluirLogico(upload.registro.id.toString(), actorId(actor), tenantId);
      throw error;
    }
  }

  private contexto(rawProjetoId: string, actor: Actor) {
    const projetoId = parseId(rawProjetoId, "projeto");
    const tenantId = actor.tenant_id?.trim();
    if (!tenantId) throw new AppError("Tenant da sessão não identificado.", 401);
    if (actor.contexto?.projeto_id && actor.contexto.projeto_id !== projetoId.toString()) throw new AppError("Projeto fora do contexto organizacional ativo.", 403);
    return { projetoId, tenantId };
  }
}

function parseId(raw: string, label: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new AppError(`Identificador de ${label} inválido.`, 400);
  return BigInt(value);
}

function actorId(actor: Actor) {
  if (!actor.id) return undefined;
  const value = Number(actor.id);
  return Number.isInteger(value) && value > 0 ? BigInt(value) : undefined;
}

function mapIndicador(row: any) {
  return { id: Number(row.id), projeto_id: Number(row.projeto_id), nome: row.nome, descricao: row.descricao, tipo: row.tipo, unidade_medida: row.unidade_medida, linha_base: row.linha_base === null ? null : Number(row.linha_base), meta: Number(row.meta), valor_atual: Number(row.valor_atual), periodicidade: row.periodicidade, fonte_dado: row.fonte_dado, responsavel: row.responsavel, status: row.status, criado_em: row.criado_em, atualizado_em: row.atualizado_em };
}

function mapMedicao(row: any) {
  return { id: Number(row.id), indicador_id: Number(row.indicador_id), competencia: row.competencia, valor: Number(row.valor), observacao: row.observacao, registrado_em: row.registrado_em };
}

function mapEvidencia(row: any) {
  return { id: Number(row.id), indicador_id: Number(row.indicador_id), nome_arquivo: row.nome_arquivo, referencia_logica: row.referencia_logica, mime_type: row.mime_type, tamanho_bytes: row.tamanho_bytes === null ? null : Number(row.tamanho_bytes), checksum: row.checksum, enviado_em: row.enviado_em, ativo: row.ativo };
}
