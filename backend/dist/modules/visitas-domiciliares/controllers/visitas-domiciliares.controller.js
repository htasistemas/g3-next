import { VisitasDomiciliaresService } from "../services/visitas-domiciliares.service.js";
const service = new VisitasDomiciliaresService();
export class VisitasDomiciliaresController {
    async listar(request, response) {
        const visitas = await service.listar(request.authUser?.tenant_id);
        return response.json({ visitas });
    }
    async criar(request, response) {
        const visita = await service.criar(request.body, request.authUser?.tenant_id);
        return response.status(201).json(visita);
    }
    async atualizar(request, response) {
        const visita = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(visita);
    }
    async excluir(request, response) {
        await service.remover(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
}
