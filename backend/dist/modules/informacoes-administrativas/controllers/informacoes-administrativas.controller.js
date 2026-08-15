import { InformacoesAdministrativasService } from "../services/informacoes-administrativas.service.js";
export class InformacoesAdministrativasController {
    service = new InformacoesAdministrativasService();
    async listar(request, response) {
        const result = await this.service.listar(request.body, request.authUser);
        response.json(result);
    }
    async criar(request, response) {
        const result = await this.service.criar(request.body, request.authUser);
        response.status(201).json(result);
    }
    async listarCategorias(request, response) {
        const result = await this.service.listarCategorias(request.body, request.authUser);
        response.json(result);
    }
    async criarCategoria(request, response) {
        const result = await this.service.criarCategoria(request.body, request.authUser);
        response.status(201).json(result);
    }
    async atualizarCategoria(request, response) {
        const result = await this.service.atualizarCategoria(request.params.id, request.body, request.authUser);
        response.json(result);
    }
    async removerCategoria(request, response) {
        const result = await this.service.removerCategoria(request.params.id, request.body, request.authUser);
        response.json(result);
    }
    async atualizar(request, response) {
        const result = await this.service.atualizar(request.params.id, request.body, request.authUser);
        response.json(result);
    }
    async remover(request, response) {
        const result = await this.service.remover(request.params.id, request.body, request.authUser);
        response.json(result);
    }
}
