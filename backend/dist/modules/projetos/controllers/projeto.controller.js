import { ProjetoService } from "../services/projeto.service.js";
import { ProjetoReportService } from "../services/projeto-report.service.js";
const service = new ProjetoService();
const reportService = new ProjetoReportService();
function getActor(request) {
    return {
        id: request.authUser?.id,
        nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? "Usuário",
        tenant_id: request.authUser?.tenant_id,
        contexto: request.authUser?.contexto
    };
}
export class ProjetoController {
    async listar(request, response) {
        const projetos = await service.listar(request.query, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ projetos });
    }
    async dashboard(request, response) {
        const dashboard = await service.dashboard(request.query, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json(dashboard);
    }
    async buscarPorId(request, response) {
        const projeto = await service.buscarPorId(request.params.id, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ projeto });
    }
    async criar(request, response) {
        const projeto = await service.criar(request.body, getActor(request));
        return response.status(201).json({ projeto });
    }
    async atualizar(request, response) {
        const projeto = await service.atualizar(request.params.id, request.body, getActor(request));
        return response.json({ projeto });
    }
    async remover(request, response) {
        await service.remover(request.params.id, getActor(request));
        return response.status(204).send();
    }
    async listarHistorico(request, response) {
        const historico = await service.listarHistorico(request.params.id, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ historico });
    }
    async criarTarefa(request, response) {
        const tarefa = await service.criarTarefa(request.params.id, request.body, getActor(request));
        return response.status(201).json({ tarefa });
    }
    async atualizarTarefa(request, response) {
        const tarefa = await service.atualizarTarefa(request.params.id, request.params.tarefaId, request.body, getActor(request));
        return response.json({ tarefa });
    }
    async moverTarefa(request, response) {
        const tarefa = await service.moverTarefa(request.params.id, request.params.tarefaId, request.body, getActor(request));
        return response.json({ tarefa });
    }
    async gerarRelatorio(request, response) {
        const tipo = request.params.tipo;
        const resultado = await reportService.gerar(tipo, request.body, request.authUser);
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader("Content-Disposition", `inline; filename="${resultado.filename}"`);
        return response.send(resultado.pdf);
    }
}
