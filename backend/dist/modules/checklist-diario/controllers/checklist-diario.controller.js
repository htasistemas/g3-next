import { ChecklistDiarioService } from "../services/checklist-diario.service.js";
const service = new ChecklistDiarioService();
export class ChecklistDiarioController {
    async listarExecucoes(request, response) {
        return response.json(await service.listarExecucoes(request.query, request.authUser));
    }
    async listarSemana(request, response) {
        return response.json(await service.listarSemana(request.query, request.authUser));
    }
    async obterIndicadores(request, response) {
        return response.json(await service.obterIndicadores(request.query, request.authUser));
    }
    async listarHistorico(request, response) {
        return response.json(await service.listarHistorico(request.query, request.authUser));
    }
    async obterExecucao(request, response) {
        return response.json(await service.obterExecucao(request.params.id, request.authUser));
    }
    async concluir(request, response) {
        return response.json(await service.concluir(request.params.id, request.body, request.authUser));
    }
    async dispensar(request, response) {
        return response.json(await service.dispensar(request.params.id, request.body, request.authUser));
    }
    async marcarNaoSeAplica(request, response) {
        return response.json(await service.marcarNaoSeAplica(request.params.id, request.body, request.authUser));
    }
    async reabrir(request, response) {
        return response.json(await service.reabrir(request.params.id, request.body, request.authUser));
    }
    async listarModelos(_request, response) {
        return response.json(await service.listarModelos());
    }
    async criarModelo(request, response) {
        return response.status(201).json(await service.salvarModelo(undefined, request.body, request.authUser));
    }
    async atualizarModelo(request, response) {
        return response.json(await service.salvarModelo(request.params.id, request.body, request.authUser));
    }
    async clonarModelo(request, response) {
        return response.status(201).json(await service.clonarModelo(request.params.id, request.authUser));
    }
    async atualizarStatusModelo(request, response) {
        await service.atualizarStatusModelo(request.params.id, !!request.body?.ativo, request.authUser);
        return response.status(204).send();
    }
    async gerarSemana(request, response) {
        return response.json(await service.gerarSemana(request.body, request.authUser));
    }
    async obterConfiguracao(_request, response) {
        return response.json(await service.obterConfiguracao());
    }
    async atualizarConfiguracao(request, response) {
        return response.json(await service.atualizarConfiguracao(request.body, request.authUser));
    }
}
