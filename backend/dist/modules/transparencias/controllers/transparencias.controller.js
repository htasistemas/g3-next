import { TransparenciasService } from "../services/transparencias.service.js";
const service = new TransparenciasService();
export class TransparenciasController {
    async listar(request, response) {
        const transparencias = await service.listar(request.authUser?.tenant_id);
        return response.json({ transparencias });
    }
    async obter(request, response) {
        const transparencia = await service.obter(request.params.id, request.authUser?.tenant_id);
        return response.json({ transparencia });
    }
    async criar(request, response) {
        const transparencia = await service.criar(request.body, request.authUser?.tenant_id);
        return response.status(201).json({ transparencia });
    }
    async atualizar(request, response) {
        const transparencia = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id, request.authUser);
        return response.json({ transparencia });
    }
    async excluir(request, response) {
        await service.remover(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async alterarWorkflow(request, response) {
        const transparencia = await service.alterarWorkflow(request.params.id, request.body, request.authUser);
        return response.json({ transparencia });
    }
}
