import { AppError } from "../../../shared/errors/app-error.js";
import { agendaSchema, alunoSchema, anoLetivoSchema, avaliacaoSchema, autorizacaoSchema, boletimSchema, buscaBeneficiarioSchema, desenvolvimentoInfantilSchema, diarioSchema, disciplinaSchema, documentoSchema, enturmacaoSchema, etapaSchema, frequenciaSchema, gradeCurricularSchema, historicoSchema, horarioSchema, matriculaSchema, notaSchema, ocorrenciaSchema, painelEducacionalFiltrosSchema, planejamentoSchema, planoAulaSchema, rotinaInfantilSchema, serieSchema, transferenciaSchema, turmaSchema } from "../educacional.schema.js";
import { EducacionalRepository } from "../repositories/educacional.repository.js";
import type { EducacionalActor, EducacionalRecurso } from "../educacional.types.js";

export class EducacionalService {
  private readonly repository = new EducacionalRepository();
  private readonly schemas = { "anos-letivos": anoLetivoSchema, etapas: etapaSchema, series: serieSchema, disciplinas: disciplinaSchema, turmas: turmaSchema, matriculas: matriculaSchema, enturmacoes: enturmacaoSchema, "grade-curricular": gradeCurricularSchema, horarios: horarioSchema, diarios: diarioSchema, frequencias: frequenciaSchema, "planos-aula": planoAulaSchema, planejamentos: planejamentoSchema, avaliacoes: avaliacaoSchema, notas: notaSchema, boletins: boletimSchema, historicos: historicoSchema, ocorrencias: ocorrenciaSchema, agenda: agendaSchema, documentos: documentoSchema, "rotinas-infantis": rotinaInfantilSchema, "desenvolvimentos-infantis": desenvolvimentoInfantilSchema, transferencias: transferenciaSchema, autorizacoes: autorizacaoSchema } as const;
  async resumo(rawFiltros: unknown, tenantId?: string) { return this.repository.resumo(painelEducacionalFiltrosSchema.parse(rawFiltros ?? {}), this.tenant(tenantId)); }
  async listar(recurso: EducacionalRecurso, tenantId?: string) { return this.repository.listar(recurso, this.tenant(tenantId)); }
  async buscarBeneficiarios(raw: unknown, tenantId?: string) { const input = buscaBeneficiarioSchema.parse(raw); return this.repository.buscarBeneficiarios(input.busca, this.tenant(tenantId)); }
  async vincularAluno(raw: unknown, tenantId?: string, actor: EducacionalActor = {}) { return this.repository.criarAluno(alunoSchema.parse(raw), this.tenant(tenantId), actor); }
  async salvar(recurso: EducacionalRecurso, rawId: string | undefined, raw: unknown, tenantId?: string, actor: EducacionalActor = {}) { const schema = this.schemas[recurso as keyof typeof this.schemas]; if (!schema) throw new AppError("Recurso educacional inválido.", 400); return this.repository.salvar(recurso, rawId, schema.parse(raw), this.tenant(tenantId), actor); }
  private tenant(value?: string) { if (!value?.trim()) throw new AppError("Tenant da sessão não identificado.", 401); return value.trim(); }
}
