import { TarefaAdministrativaService } from "../services/tarefa-administrativa.service.js";
const service = new TarefaAdministrativaService();
export class TarefaAdministrativaController {
    async listar(request, response) {
        const tarefas = await service.listar(request.authUser?.tenant_id);
        return response.json(tarefas);
    }
    async obterResumo(request, response) {
        const resumo = await service.obterResumo(request.authUser?.tenant_id);
        return response.json({ resumo });
    }
    async buscarPorId(request, response) {
        const tarefa = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
        return response.json(tarefa);
    }
    async criar(request, response) {
        const tarefa = await service.criar(request.body, request.authUser?.tenant_id);
        return response.status(201).json(tarefa);
    }
    async atualizar(request, response) {
        const tarefa = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(tarefa);
    }
    async adicionarHistorico(request, response) {
        const tarefa = await service.adicionarHistorico(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(tarefa);
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
}
