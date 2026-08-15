import { SenhasService } from "../services/senhas.service.js";
const service = new SenhasService();
export class SenhasController {
    async listarAguardando(request, response) {
        const lista = await service.listarAguardando(request.query.unidadeId, request.authUser?.tenant_id);
        return response.json(lista);
    }
    async emitir(request, response) {
        const fila = await service.emitir(request.body, request.authUser?.tenant_id);
        return response.status(201).json(fila);
    }
    async chamar(request, response) {
        const chamada = await service.chamar(request.body, request.authUser?.tenant_id);
        return response.status(201).json(chamada);
    }
    async finalizar(request, response) {
        await service.finalizar(request.body, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async finalizarFila(request, response) {
        await service.finalizarFila(String(request.query.filaId ?? ""), request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async painel(request, response) {
        const lista = await service.painel(request.query.unidadeId, request.query.limite, request.authUser?.tenant_id);
        return response.json(lista);
    }
    async atual(request, response) {
        const chamada = await service.atual(request.query.unidadeId, request.authUser?.tenant_id);
        return response.json(chamada);
    }
    async obterConfig(request, response) {
        const config = await service.obterConfig(request.authUser?.tenant_id);
        return response.json(config);
    }
    async atualizarConfig(request, response) {
        const config = await service.atualizarConfig(request.body, request.authUser?.tenant_id);
        return response.json(config);
    }
}
