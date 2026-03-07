import { VoluntarioService } from "../services/voluntario.service.js";
const service = new VoluntarioService();
export class VoluntarioController {
    async listar(request, response) {
        const voluntarios = await service.listar(request.query);
        return response.json({ voluntarios });
    }
    async buscarPorId(request, response) {
        const voluntario = await service.buscarPorId(request.params.id);
        return response.json({ voluntario });
    }
    async criar(request, response) {
        const voluntario = await service.criar(request.body);
        return response.status(201).json({ voluntario });
    }
    async atualizar(request, response) {
        const voluntario = await service.atualizar(request.params.id, request.body);
        return response.json({ voluntario });
    }
    async remover(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
}
