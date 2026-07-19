import { AppError } from "../../../shared/errors/app-error.js";
import { alunoSchema, anoLetivoSchema, buscaBeneficiarioSchema, disciplinaSchema, enturmacaoSchema, etapaSchema, matriculaSchema, serieSchema, turmaSchema } from "../educacional.schema.js";
import { EducacionalRepository } from "../repositories/educacional.repository.js";
import type { EducacionalActor, EducacionalRecurso } from "../educacional.types.js";

export class EducacionalService {
  private readonly repository = new EducacionalRepository();
  private readonly schemas = { "anos-letivos": anoLetivoSchema, etapas: etapaSchema, series: serieSchema, disciplinas: disciplinaSchema, turmas: turmaSchema, matriculas: matriculaSchema, enturmacoes: enturmacaoSchema } as const;
  async resumo(tenantId?: string) { return this.repository.resumo(this.tenant(tenantId)); }
  async listar(recurso: EducacionalRecurso, tenantId?: string) { return this.repository.listar(recurso, this.tenant(tenantId)); }
  async buscarBeneficiarios(raw: unknown, tenantId?: string) { const input = buscaBeneficiarioSchema.parse(raw); return this.repository.buscarBeneficiarios(input.busca, this.tenant(tenantId)); }
  async vincularAluno(raw: unknown, tenantId?: string, actor: EducacionalActor = {}) { return this.repository.criarAluno(alunoSchema.parse(raw), this.tenant(tenantId), actor); }
  async salvar(recurso: EducacionalRecurso, rawId: string | undefined, raw: unknown, tenantId?: string, actor: EducacionalActor = {}) { const schema = this.schemas[recurso as keyof typeof this.schemas]; if (!schema) throw new AppError("Recurso educacional inválido.", 400); return this.repository.salvar(recurso, rawId, schema.parse(raw), this.tenant(tenantId), actor); }
  private tenant(value?: string) { if (!value?.trim()) throw new AppError("Tenant da sessão não identificado.", 401); return value.trim(); }
}
