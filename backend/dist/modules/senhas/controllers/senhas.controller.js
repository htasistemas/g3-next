import { SenhasService } from "../services/senhas.service.js";
const service = new SenhasService();
export class SenhasController {
    async listarAguardando(request, response) {
        const lista = await service.listarAguardando(request.query.unidadeId);
        return response.json(lista);
    }
    async emitir(request, response) {
        const fila = await service.emitir(request.body);
        return response.status(201).json(fila);
    }
    async chamar(request, response) {
        const chamada = await service.chamar(request.body);
        return response.status(201).json(chamada);
    }
    async finalizar(request, response) {
        await service.finalizar(request.body);
        return response.status(204).send();
    }
    async finalizarFila(request, response) {
        await service.finalizarFila(String(request.query.filaId ?? ""));
        return response.status(204).send();
    }
    async painel(request, response) {
        const lista = await service.painel(request.query.unidadeId, request.query.limite);
        return response.json(lista);
    }
    async atual(request, response) {
        const chamada = await service.atual(request.query.unidadeId);
        return response.json(chamada);
    }
    async obterConfig(_request, response) {
        const config = await service.obterConfig();
        return response.json(config);
    }
    async atualizarConfig(request, response) {
        const config = await service.atualizarConfig(request.body);
        return response.json(config);
    }
}
