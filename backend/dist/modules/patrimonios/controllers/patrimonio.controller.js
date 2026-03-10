import { PatrimonioService } from "../services/patrimonio.service.js";
const service = new PatrimonioService();
export class PatrimonioController {
    async listar(_request, response) {
        const patrimonios = await service.listar();
        return response.json({ patrimonios });
    }
    async criar(request, response) {
        const patrimonio = await service.criar(request.body);
        return response.status(201).json({ patrimonio });
    }
    async atualizar(request, response) {
        const patrimonio = await service.atualizar(request.params.id, request.body);
        return response.json({ patrimonio });
    }
    async registrarMovimento(request, response) {
        const patrimonio = await service.registrarMovimento(request.params.id, request.body);
        return response.json({ patrimonio });
    }
}
