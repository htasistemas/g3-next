import { UnidadeAssistencialService } from "../services/unidade-assistencial.service.js";
const service = new UnidadeAssistencialService();
export class UnidadeAssistencialController {
    async listar(request, response) {
        const unidades = await service.listar(request.query);
        return response.json({ unidades });
    }
    async buscarPorId(request, response) {
        const unidade = await service.buscarPorId(request.params.id);
        return response.json({ unidade });
    }
    async buscarAtual(_request, response) {
        const unidade = await service.buscarAtual();
        return response.json({ unidade });
    }
    async criar(request, response) {
        const unidade = await service.criar(request.body, request.authUser?.id);
        return response.status(201).json({ unidade });
    }
    async atualizar(request, response) {
        const unidade = await service.atualizar(request.params.id, request.body, request.authUser?.id);
        return response.json({ unidade });
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id);
        return response.status(204).send();
    }
}
