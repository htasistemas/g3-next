import { EducacionalService } from "../services/educacional.service.js";
const service = new EducacionalService();
const actor = (request) => ({ id: request.authUser?.id, nome: request.authUser?.nome, nomeUsuario: request.authUser?.nomeUsuario });
export class EducacionalController {
    async resumo(request, response) { return response.json(await service.resumo(request.query, request.authUser?.tenant_id)); }
    async listarPendencias(request, response) { return response.json(await service.listarPendencias(request.params.tipo, request.query, request.authUser?.tenant_id)); }
    async listar(request, response) { return response.json({ itens: await service.listar(request.params.recurso, request.authUser?.tenant_id) }); }
    async proximoNumeroMatricula(request, response) { return response.json({ numero: await service.proximoNumeroMatricula(request.authUser?.tenant_id) }); }
    async buscarBeneficiarios(request, response) { return response.json({ beneficiarios: await service.buscarBeneficiarios(request.query, request.authUser?.tenant_id) }); }
    async listarUnidadesEnsino(request, response) { return response.json({ unidades: await service.listarUnidadesEnsino(request.authUser?.tenant_id) }); }
    async listarAlunosAgrupados(request, response) { return response.json(await service.listarAlunosAgrupados(request.query, request.authUser?.tenant_id)); }
    async vidaAcademicaAluno(request, response) { return response.json(await service.vidaAcademicaAluno(request.params.alunoId, request.authUser?.tenant_id)); }
    async obterChamadaRapida(request, response) { return response.json(await service.obterChamadaRapida(request.params.id, request.authUser?.tenant_id)); }
    async salvarChamadaRapida(request, response) { return response.json(await service.salvarChamadaRapida(request.params.id, request.body, request.authUser?.tenant_id, actor(request))); }
    async gerarBoletimAutomatico(request, response) { return response.json(await service.gerarBoletimAutomatico(request.body, request.authUser?.tenant_id, actor(request))); }
    async gerarHistoricoAutomatico(request, response) { return response.json(await service.gerarHistoricoAutomatico(request.body, request.authUser?.tenant_id, actor(request))); }
    async transferirMatricula(request, response) { return response.json(await service.transferirMatricula(request.params.id, request.body, request.authUser?.tenant_id, actor(request))); }
    async rematricular(request, response) { return response.status(201).json(await service.rematricular(request.params.id, request.body, request.authUser?.tenant_id, actor(request))); }
    async rematricularLote(request, response) { return response.status(201).json(await service.rematricularLote(request.body, request.authUser?.tenant_id, actor(request))); }
    async sugerirRecuperacoes(request, response) { return response.json(await service.sugerirRecuperacoes(request.query, request.authUser?.tenant_id)); }
    async listarHistoricoMatricula(request, response) { return response.json({ itens: await service.listarHistoricoMatricula(request.params.id, request.authUser?.tenant_id) }); }
    async editarVinculoMatricula(request, response) { return response.json({ item: await service.editarVinculoMatricula(request.params.id, request.body, request.authUser?.tenant_id, actor(request)) }); }
    async criarVinculoAluno(request, response) { return response.status(201).json({ item: await service.criarVinculoAluno(request.params.alunoId, request.body, request.authUser?.tenant_id, actor(request)) }); }
    async salvar(request, response) { const item = await service.salvar(request.params.recurso, request.params.id, request.body, request.authUser?.tenant_id, actor(request)); return response.status(request.params.id ? 200 : 201).json({ item }); }
    async vincularAluno(request, response) { return response.status(201).json({ aluno: await service.vincularAluno(request.body, request.authUser?.tenant_id, actor(request)) }); }
}
