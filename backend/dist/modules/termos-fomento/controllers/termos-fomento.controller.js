import { TermosFomentoService } from "../services/termos-fomento.service.js";
const service = new TermosFomentoService();
export class TermosFomentoController {
    async listar(request, response) {
        const termos = await service.listar(request.authUser?.tenant_id);
        return response.json(termos);
    }
    async obter(request, response) {
        const termo = await service.obter(request.params.id, request.authUser?.tenant_id);
        return response.json(termo);
    }
    async criar(request, response) {
        const termo = await service.criar(request.body, request.authUser?.tenant_id);
        return response.status(201).json(termo);
    }
    async atualizar(request, response) {
        const termo = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(termo);
    }
    async excluir(request, response) {
        await service.remover(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async adicionarAditivo(request, response) {
        const termo = await service.adicionarAditivo(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(termo);
    }
}
