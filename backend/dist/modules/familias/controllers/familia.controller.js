import { FamiliaService } from "../services/familia.service.js";
const service = new FamiliaService();
export class FamiliaController {
    async listar(request, response) {
        const familias = await service.listar(request.query);
        return response.json({ familias });
    }
    async buscarPorId(request, response) {
        const familia = await service.buscarPorId(request.params.id);
        return response.json({ familia });
    }
    async criar(request, response) {
        const familia = await service.criar(request.body);
        return response.status(201).json({ familia });
    }
    async atualizar(request, response) {
        const familia = await service.atualizar(request.params.id, request.body);
        return response.json({ familia });
    }
    async remover(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
    async adicionarMembro(request, response) {
        const familia = await service.adicionarMembro(request.params.id, request.body);
        return response.json({ familia });
    }
    async atualizarMembro(request, response) {
        const familia = await service.atualizarMembro(request.params.id, request.params.membroId, request.body);
        return response.json({ familia });
    }
    async removerMembro(request, response) {
        await service.removerMembro(request.params.id, request.params.membroId);
        return response.status(204).send();
    }
    async listarHistorico(request, response) {
        const historico = await service.listarHistorico(request.params.id);
        return response.json({ historico });
    }
    async listarAlertas(request, response) {
        const alertas = await service.listarAlertas(request.params.id);
        return response.json({ alertas });
    }
    async definirResponsavel(request, response) {
        const familia = await service.definirResponsavel(request.params.id, request.body);
        return response.json({ familia });
    }
    async atualizarEndereco(request, response) {
        const familia = await service.atualizarEndereco(request.params.id, request.body);
        return response.json({ familia });
    }
    async validarBeneficioFamiliar(request, response) {
        const validacao = await service.validarBeneficioFamiliar(request.params.id, request.query);
        return response.json(validacao);
    }
    async transferirMembro(request, response) {
        const resultado = await service.transferirMembro(request.params.id, request.body);
        return response.json(resultado);
    }
    async desmembrarFamilia(request, response) {
        const resultado = await service.desmembrarFamilia(request.params.id, request.body);
        return response.json(resultado);
    }
}
