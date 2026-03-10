import { TransparenciasService } from "../services/transparencias.service.js";
const service = new TransparenciasService();
export class TransparenciasController {
    async listar(_request, response) {
        const transparencias = await service.listar();
        return response.json({ transparencias });
    }
    async obter(request, response) {
        const transparencia = await service.obter(request.params.id);
        return response.json({ transparencia });
    }
    async criar(request, response) {
        const transparencia = await service.criar(request.body);
        return response.status(201).json({ transparencia });
    }
    async atualizar(request, response) {
        const transparencia = await service.atualizar(request.params.id, request.body);
        return response.json({ transparencia });
    }
    async excluir(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
}
