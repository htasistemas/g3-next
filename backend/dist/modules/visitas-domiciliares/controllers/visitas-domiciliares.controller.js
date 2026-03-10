import { VisitasDomiciliaresService } from "../services/visitas-domiciliares.service.js";
const service = new VisitasDomiciliaresService();
export class VisitasDomiciliaresController {
    async listar(_request, response) {
        const visitas = await service.listar();
        return response.json({ visitas });
    }
    async criar(request, response) {
        const visita = await service.criar(request.body);
        return response.status(201).json(visita);
    }
    async atualizar(request, response) {
        const visita = await service.atualizar(request.params.id, request.body);
        return response.json(visita);
    }
    async excluir(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
}
