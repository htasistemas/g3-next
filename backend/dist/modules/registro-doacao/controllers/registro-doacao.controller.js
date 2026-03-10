import { RegistroDoacaoService } from "../services/registro-doacao.service.js";
const service = new RegistroDoacaoService();
export class RegistroDoacaoController {
    async listar(request, response) {
        const registros = await service.listar(request.query);
        return response.json({ registros });
    }
    async buscarPorId(request, response) {
        const registro = await service.buscarPorId(request.params.id);
        return response.json({ registro });
    }
    async criar(request, response) {
        const registro = await service.criar(request.body);
        return response.status(201).json({ registro });
    }
    async atualizar(request, response) {
        const registro = await service.atualizar(request.params.id, request.body);
        return response.json({ registro });
    }
    async remover(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
    async listarDoadores(request, response) {
        const doadores = await service.listarDoadores(request.query.termo);
        return response.json({ doadores });
    }
    async criarDoador(request, response) {
        const doador = await service.criarDoador(request.body);
        return response.status(201).json({ doador });
    }
    async removerDoador(request, response) {
        await service.removerDoador(request.params.id);
        return response.status(204).send();
    }
}
