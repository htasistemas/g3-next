import { UnidadeAssistencialService } from "../services/unidade-assistencial.service.js";
const service = new UnidadeAssistencialService();
export class UnidadeAssistencialController {
    async listar(request, response) {
        const unidades = await service.listar(request.query, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ unidades });
    }
    async buscarPorId(request, response) {
        const unidade = await service.buscarPorId(request.params.id, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ unidade });
    }
    async buscarAtual(request, response) {
        const unidade = await service.buscarAtual(request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ unidade });
    }
    async verificarVinculosSala(request, response) {
        const resultado = await service.verificarVinculosSala(request.params.salaId, request.authUser?.tenant_id);
        return response.json(resultado);
    }
    async criar(request, response) {
        const unidade = await service.criar(request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json({ unidade });
    }
    async atualizar(request, response) {
        const unidade = await service.atualizar(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.json({ unidade });
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id, request.authUser?.contexto);
        return response.status(204).send();
    }
}
