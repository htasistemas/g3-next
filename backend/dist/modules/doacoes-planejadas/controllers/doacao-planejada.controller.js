import { DoacaoPlanejadaService } from "../services/doacao-planejada.service.js";
export class DoacaoPlanejadaController {
    service = new DoacaoPlanejadaService();
    async listar(request, response) {
        const doacoes = await this.service.listar(request.query);
        response.json({ doacoes });
    }
    async buscarPorId(request, response) {
        const doacao = await this.service.buscarPorId(request.params.id);
        response.json({ doacao });
    }
    async criar(request, response) {
        const doacao = await this.service.criar(request.body);
        response.status(201).json({ doacao });
    }
    async atualizar(request, response) {
        const doacao = await this.service.atualizar(request.params.id, request.body);
        response.json({ doacao });
    }
    async remover(request, response) {
        await this.service.remover(request.params.id);
        response.status(204).send();
    }
}
