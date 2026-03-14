import { ProfissionalService } from "../services/profissional.service.js";
const service = new ProfissionalService();
export class ProfissionalController {
    async listar(request, response) {
        const profissionais = await service.listar(request.query);
        return response.json({ profissionais });
    }
    async buscarPorId(request, response) {
        const profissional = await service.buscarPorId(request.params.id);
        return response.json({ profissional });
    }
    async criar(request, response) {
        const profissional = await service.criar(request.body, request.authUser?.id);
        return response.status(201).json({ profissional });
    }
    async atualizar(request, response) {
        const profissional = await service.atualizar(request.params.id, request.body, request.authUser?.id);
        return response.json({ profissional });
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id);
        return response.status(204).send();
    }
}
