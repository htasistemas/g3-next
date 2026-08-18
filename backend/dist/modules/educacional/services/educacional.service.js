import { AppError } from "../../../shared/errors/app-error.js";
import { agendaSchema, alunoSchema, alunosAgrupadosFiltrosSchema, anoLetivoSchema, avaliacaoSchema, autorizacaoSchema, boletimSchema, buscaBeneficiarioSchema, calendarioSchema, chamadaRapidaSchema, configuracaoEducacionalSchema, criarVinculoAlunoSchema, desenvolvimentoInfantilSchema, diarioSchema, disciplinaSchema, documentoSchema, editarVinculoMatriculaSchema, enturmacaoSchema, etapaSchema, frequenciaSchema, gerarBoletimSchema, gerarHistoricoSchema, gradeCurricularSchema, historicoSchema, horarioSchema, listaEsperaSchema, matriculaSchema, notaSchema, ocorrenciaSchema, painelEducacionalFiltrosSchema, pendenciaEducacionalTipoSchema, pendenciasEducacionaisFiltrosSchema, planejamentoSchema, planoAulaSchema, profissionalVinculoSchema, recuperacaoSchema, recuperacaoSugestoesSchema, rematriculaLoteSchema, rematriculaSchema, resultadoFinalSchema, rotinaInfantilSchema, serieSchema, transferenciaMatriculaSchema, transferenciaSchema, turmaSchema } from "../educacional.schema.js";
import { EducacionalRepository } from "../repositories/educacional.repository.js";
export class EducacionalService {
    repository = new EducacionalRepository();
    schemas = { "anos-letivos": anoLetivoSchema, etapas: etapaSchema, series: serieSchema, disciplinas: disciplinaSchema, turmas: turmaSchema, matriculas: matriculaSchema, enturmacoes: enturmacaoSchema, profissionais: profissionalVinculoSchema, "grade-curricular": gradeCurricularSchema, horarios: horarioSchema, diarios: diarioSchema, frequencias: frequenciaSchema, "planos-aula": planoAulaSchema, planejamentos: planejamentoSchema, avaliacoes: avaliacaoSchema, notas: notaSchema, boletins: boletimSchema, historicos: historicoSchema, ocorrencias: ocorrenciaSchema, agenda: agendaSchema, documentos: documentoSchema, "rotinas-infantis": rotinaInfantilSchema, "desenvolvimentos-infantis": desenvolvimentoInfantilSchema, transferencias: transferenciaSchema, autorizacoes: autorizacaoSchema, "lista-espera": listaEsperaSchema, recuperacoes: recuperacaoSchema, "resultados-finais": resultadoFinalSchema, calendario: calendarioSchema, configuracoes: configuracaoEducacionalSchema };
    async resumo(rawFiltros, tenantId) { return this.repository.resumo(painelEducacionalFiltrosSchema.parse(rawFiltros ?? {}), this.tenant(tenantId)); }
    async listarPendencias(rawTipo, rawFiltros, tenantId) { return this.repository.listarPendencias(pendenciaEducacionalTipoSchema.parse(rawTipo), pendenciasEducacionaisFiltrosSchema.parse(rawFiltros ?? {}), this.tenant(tenantId)); }
    async listar(recurso, tenantId) { return this.repository.listar(recurso, this.tenant(tenantId)); }
    async proximoNumeroMatricula(tenantId) { return this.repository.proximoNumeroMatricula(this.tenant(tenantId)); }
    async buscarBeneficiarios(raw, tenantId) { const input = buscaBeneficiarioSchema.parse(raw); return this.repository.buscarBeneficiarios(input.busca, this.tenant(tenantId)); }
    async buscarAlunos(raw, tenantId) { const input = buscaBeneficiarioSchema.parse(raw); return this.repository.buscarAlunos(input.busca, this.tenant(tenantId)); }
    async listarUnidadesEnsino(tenantId) { return this.repository.listarUnidadesEnsino(this.tenant(tenantId)); }
    async listarAlunosAgrupados(rawFiltros, tenantId) { return this.repository.listarAlunosAgrupados(alunosAgrupadosFiltrosSchema.parse(rawFiltros ?? {}), this.tenant(tenantId)); }
    async vidaAcademicaAluno(rawId, tenantId) { return this.repository.vidaAcademicaAluno(rawId, this.tenant(tenantId)); }
    async obterChamadaRapida(rawDiarioId, tenantId) { return this.repository.obterChamadaRapida(rawDiarioId, this.tenant(tenantId)); }
    async salvarChamadaRapida(rawDiarioId, raw, tenantId, actor = {}) { return this.repository.salvarChamadaRapida(rawDiarioId, chamadaRapidaSchema.parse(raw), this.tenant(tenantId), actor); }
    async gerarBoletimAutomatico(raw, tenantId, actor = {}) { return this.repository.gerarBoletimAutomatico(gerarBoletimSchema.parse(raw), this.tenant(tenantId), actor); }
    async gerarHistoricoAutomatico(raw, tenantId, actor = {}) { return this.repository.gerarHistoricoAutomatico(gerarHistoricoSchema.parse(raw), this.tenant(tenantId), actor); }
    async transferirMatricula(rawId, raw, tenantId, actor = {}) { return this.repository.transferirMatricula(rawId, transferenciaMatriculaSchema.parse(raw), this.tenant(tenantId), actor); }
    async rematricular(rawId, raw, tenantId, actor = {}) { return this.repository.rematricular(rawId, rematriculaSchema.parse(raw), this.tenant(tenantId), actor); }
    async rematricularLote(raw, tenantId, actor = {}) { return this.repository.rematricularLote(rematriculaLoteSchema.parse(raw), this.tenant(tenantId), actor); }
    async sugerirRecuperacoes(raw, tenantId) { return this.repository.sugerirRecuperacoes(recuperacaoSugestoesSchema.parse(raw ?? {}), this.tenant(tenantId)); }
    async listarHistoricoMatricula(rawId, tenantId) { return this.repository.listarHistoricoMatricula(rawId, this.tenant(tenantId)); }
    async editarVinculoMatricula(rawId, raw, tenantId, actor = {}) { return this.repository.editarVinculoMatricula(rawId, editarVinculoMatriculaSchema.parse(raw), this.tenant(tenantId), actor); }
    async criarVinculoAluno(rawId, raw, tenantId, actor = {}) { return this.repository.criarVinculoAluno(rawId, criarVinculoAlunoSchema.parse(raw), this.tenant(tenantId), actor); }
    async vincularAluno(raw, tenantId, actor = {}) { return this.repository.criarAluno(alunoSchema.parse(raw), this.tenant(tenantId), actor); }
    async salvar(recurso, rawId, raw, tenantId, actor = {}) { const schema = this.schemas[recurso]; if (!schema)
        throw new AppError("Recurso educacional inválido.", 400); return this.repository.salvar(recurso, rawId, schema.parse(raw), this.tenant(tenantId), actor); }
    tenant(value) { if (!value?.trim())
        throw new AppError("Tenant da sessão não identificado.", 401); return value.trim(); }
}
