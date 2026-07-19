import { AppError } from "../../../shared/errors/app-error.js";
import { prontuarioAdendoSchema, prontuarioAtendimentoSchema, prontuarioBuscaSchema } from "../prontuario.schema.js";
import { mapProntuarioAtendimento, mapProntuarioBeneficiario } from "../prontuario.mapper.js";
import { ProntuarioRepository } from "../repositories/prontuario.repository.js";

type AuthUser = { id: string; nome?: string; nomeUsuario?: string; permissoes?: string[]; tenant_id?: string };

export class ProntuarioService {
  private readonly repository = new ProntuarioRepository();

  async buscarBeneficiarios(rawFilters: unknown, tenantId?: string) {
    const tenant = this.parseTenant(tenantId);
    const filters = prontuarioBuscaSchema.parse(rawFilters ?? {});
    const rows = await this.repository.buscarBeneficiarios(filters.busca, tenant);
    return rows.map((row) => ({
      id: String(row.id),
      codigo: row.codigo ? String(row.codigo) : undefined,
      nome_completo: String(row.nome_completo ?? ""),
      nome_social: row.nome_social ? String(row.nome_social) : undefined,
      data_nascimento: row.data_nascimento instanceof Date ? row.data_nascimento.toISOString().slice(0, 10) : undefined,
      cpf: row.cpf ? String(row.cpf) : undefined,
      telefone: row.telefone_principal ? String(row.telefone_principal) : undefined,
      ultimo_atendimento: row.ultimo_atendimento instanceof Date ? row.ultimo_atendimento.toISOString() : undefined
    }));
  }

  async obterContexto(rawBeneficiarioId: string, usuario: AuthUser) {
    const tenant = this.parseTenant(usuario.tenant_id);
    const contexto = await this.repository.obterContexto(this.parseId(rawBeneficiarioId), tenant);
    const podeVerRestrito = this.podeVerRestrito(usuario);
    return {
      beneficiario: mapProntuarioBeneficiario(contexto.beneficiario),
      atendimentos: contexto.atendimentos.map((item) => mapProntuarioAtendimento(item, podeVerRestrito)),
      rascunho: contexto.rascunho ? mapProntuarioAtendimento(contexto.rascunho, podeVerRestrito) : null
    };
  }

  async criarAtendimento(rawBeneficiarioId: string, rawInput: unknown, usuario: AuthUser) {
    const input = prontuarioAtendimentoSchema.parse(rawInput);
    const registro = await this.repository.criarAtendimento(this.parseId(rawBeneficiarioId), input, this.parseTenant(usuario.tenant_id), usuario);
    return mapProntuarioAtendimento(registro, this.podeVerRestrito(usuario));
  }

  async atualizarAtendimento(rawId: string, rawInput: unknown, usuario: AuthUser) {
    const input = prontuarioAtendimentoSchema.parse(rawInput);
    const registro = await this.repository.atualizarAtendimento(this.parseId(rawId), input, this.parseTenant(usuario.tenant_id), usuario);
    return registro ? mapProntuarioAtendimento(registro, this.podeVerRestrito(usuario)) : null;
  }

  async finalizarAtendimento(rawId: string, usuario: AuthUser) {
    const registro = await this.repository.finalizarAtendimento(this.parseId(rawId), this.parseTenant(usuario.tenant_id), usuario);
    return registro ? mapProntuarioAtendimento(registro, this.podeVerRestrito(usuario)) : null;
  }

  async criarAdendo(rawId: string, rawInput: unknown, usuario: AuthUser) {
    const input = prontuarioAdendoSchema.parse(rawInput);
    const registro = await this.repository.criarAdendo(this.parseId(rawId), input, this.parseTenant(usuario.tenant_id), usuario);
    return registro ? mapProntuarioAtendimento(registro, this.podeVerRestrito(usuario)) : null;
  }

  private podeVerRestrito(usuario: AuthUser) {
    return usuario.permissoes?.includes("ADMINISTRADOR") || usuario.permissoes?.includes("PRONTUARIO_VISUALIZAR_RESTRITO") || false;
  }

  private parseId(value: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError("Identificador de prontuário inválido.", 400);
    return BigInt(id);
  }

  private parseTenant(value?: string) {
    const tenant = value?.trim();
    if (!tenant) throw new AppError("Tenant da sessão não identificado.", 401);
    return tenant;
  }
}
