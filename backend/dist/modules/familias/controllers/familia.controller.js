import { FamiliaService } from "../services/familia.service.js";
const service = new FamiliaService();
export class FamiliaController {
    buildAtor(request) {
        return {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario,
            tenant_id: request.authUser?.tenant_id,
            instituicao_id: request.authUser?.instituicao_id
        };
    }
    async listar(request, response) {
        const familias = await service.listar(request.query, this.buildAtor(request));
        return response.json({ familias });
    }
    async buscarPorId(request, response) {
        const familia = await service.buscarPorId(request.params.id, this.buildAtor(request));
        return response.json({ familia });
    }
    async criar(request, response) {
        const familia = await service.criar(request.body, this.buildAtor(request));
        return response.status(201).json({ familia });
    }
    async atualizar(request, response) {
        const familia = await service.atualizar(request.params.id, request.body, this.buildAtor(request));
        return response.json({ familia });
    }
    async remover(request, response) {
        await service.remover(request.params.id, this.buildAtor(request));
        return response.status(204).send();
    }
    async adicionarMembro(request, response) {
        const familia = await service.adicionarMembro(request.params.id, request.body, this.buildAtor(request));
        return response.json({ familia });
    }
    async atualizarMembro(request, response) {
        const familia = await service.atualizarMembro(request.params.id, request.params.membroId, request.body, this.buildAtor(request));
        return response.json({ familia });
    }
    async removerMembro(request, response) {
        await service.removerMembro(request.params.id, request.params.membroId, this.buildAtor(request));
        return response.status(204).send();
    }
    async listarHistorico(request, response) {
        const historico = await service.listarHistorico(request.params.id, this.buildAtor(request));
        return response.json({ historico });
    }
    async listarAlertas(request, response) {
        const alertas = await service.listarAlertas(request.params.id, this.buildAtor(request));
        return response.json({ alertas });
    }
    async definirResponsavel(request, response) {
        const familia = await service.definirResponsavel(request.params.id, request.body, this.buildAtor(request));
        return response.json({ familia });
    }
    async atualizarEndereco(request, response) {
        const familia = await service.atualizarEndereco(request.params.id, request.body, this.buildAtor(request));
        return response.json({ familia });
    }
    async validarBeneficioFamiliar(request, response) {
        const validacao = await service.validarBeneficioFamiliar(request.params.id, request.query, this.buildAtor(request));
        return response.json(validacao);
    }
    async transferirMembro(request, response) {
        const resultado = await service.transferirMembro(request.params.id, request.body, this.buildAtor(request));
        return response.json(resultado);
    }
    async desmembrarFamilia(request, response) {
        const resultado = await service.desmembrarFamilia(request.params.id, request.body, this.buildAtor(request));
        return response.json(resultado);
    }
}
