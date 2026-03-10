import { BeneficiarioService } from "../services/beneficiario.service.js";
const service = new BeneficiarioService();
export class BeneficiarioController {
    async listar(request, response) {
        const beneficiarios = await service.listar(request.query);
        return response.json({ beneficiarios });
    }
    async buscarPorId(request, response) {
        const beneficiario = await service.buscarPorId(request.params.id);
        return response.json({ beneficiario });
    }
    async criar(request, response) {
        const beneficiario = await service.criar(request.body);
        return response.status(201).json({ beneficiario });
    }
    async atualizar(request, response) {
        const beneficiario = await service.atualizar(request.params.id, request.body);
        return response.json({ beneficiario });
    }
    async remover(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
    async obterProximoCodigo(_request, response) {
        const data = await service.obterProximoCodigo();
        return response.json(data);
    }
    async obterSugestaoEndereco(request, response) {
        const sugestao = await service.obterSugestaoEndereco(request.query);
        return response.json({ sugestao });
    }
}
