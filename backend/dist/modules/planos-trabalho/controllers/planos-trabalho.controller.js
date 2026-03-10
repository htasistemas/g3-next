import { PlanosTrabalhoService } from "../services/planos-trabalho.service.js";
const service = new PlanosTrabalhoService();
export class PlanosTrabalhoController {
    async listar(_request, response) {
        const planos = await service.listar();
        return response.json({ planos });
    }
    async obter(request, response) {
        const plano = await service.obter(request.params.id);
        return response.json({ plano });
    }
    async criar(request, response) {
        const plano = await service.criar(request.body);
        return response.status(201).json({ plano });
    }
    async atualizar(request, response) {
        const plano = await service.atualizar(request.params.id, request.body);
        return response.json({ plano });
    }
    async excluir(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
}
