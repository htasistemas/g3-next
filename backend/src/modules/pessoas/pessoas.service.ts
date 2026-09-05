import { AppError } from "../../shared/errors/app-error.js";
import { PessoasRepository } from "./pessoas.repository.js";
import { criarVinculoSchema, listarPessoasQuerySchema, revisarDuplicidadeSchema } from "./pessoas.types.js";

function id(value: string, label: string) {
  try { return BigInt(value); } catch { throw new AppError(`${label} inválido.`, 400); }
}

export class PessoasService {
  private readonly repository = new PessoasRepository();

  listar(tenantId: string | undefined, rawQuery: unknown) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return this.repository.listar(tenantId, listarPessoasQuerySchema.parse(rawQuery));
  }

  listarDuplicidades(tenantId: string | undefined) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    return this.repository.listarDuplicidades(tenantId);
  }

  async buscar(tenantId: string | undefined, rawId: string) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    const pessoa = await this.repository.buscar(tenantId, id(rawId, "Pessoa"));
    if (!pessoa) throw new AppError("Pessoa não encontrada no contexto da instituição.", 404);
    return pessoa;
  }

  async listarVinculos(tenantId: string | undefined, rawId: string) {
    await this.buscar(tenantId, rawId);
    return this.repository.listarVinculos(tenantId!, id(rawId, "Pessoa"));
  }

  async listarAuditoria(tenantId: string | undefined, rawId: string) {
    await this.buscar(tenantId, rawId);
    return this.repository.listarAuditoria(tenantId!, id(rawId, "Pessoa"));
  }

  async criarVinculo(tenantId: string | undefined, rawId: string, body: unknown, usuarioId?: string, ip?: string) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    const pessoaId = id(rawId, "Pessoa");
    const input = criarVinculoSchema.parse(body);
    const vinculo = await this.repository.criarVinculo(tenantId, pessoaId, input, usuarioId, ip);
    if (!vinculo) throw new AppError("Pessoa não encontrada no contexto da instituição.", 404);
    return vinculo;
  }

  async desativarVinculo(tenantId: string | undefined, rawId: string, usuarioId?: string, ip?: string, motivo?: string) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    const vinculoId = await this.repository.desativarVinculo(tenantId, id(rawId, "Vínculo"), usuarioId, ip, motivo);
    if (!vinculoId) throw new AppError("Vínculo ativo não encontrado no contexto da instituição.", 404);
    return { id: vinculoId, ativo: false };
  }

  async revisarDuplicidade(tenantId: string | undefined, rawId: string, body: unknown, usuarioId?: string) {
    if (!tenantId) throw new AppError("O contexto institucional da sessão não está completo.", 403);
    const resultado = await this.repository.revisarDuplicidade(tenantId, id(rawId, "Pessoa"), revisarDuplicidadeSchema.parse(body), usuarioId);
    if (!resultado) throw new AppError("Pessoa não encontrada ou sem CPF para análise.", 404);
    return resultado;
  }
}
