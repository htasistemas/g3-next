import { PatrimonioService } from "../services/patrimonio.service.js";
const service = new PatrimonioService();
export class PatrimonioController {
    async listar(request, response) {
        const patrimonios = await service.listar(request.authUser?.tenant_id);
        return response.json({ patrimonios });
    }
    async listarCategorias(request, response) {
        const categorias = await service.listarCategorias(request.authUser?.tenant_id);
        return response.json({ categorias });
    }
    async criarCategoria(request, response) {
        const categoria = await service.criarCategoria(request.body, request.authUser?.tenant_id);
        return response.status(201).json({ categoria });
    }
    async atualizarCategoria(request, response) {
        const categoria = await service.atualizarCategoria(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json({ categoria });
    }
    async removerCategoria(request, response) {
        await service.removerCategoria(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async criar(request, response) {
        const patrimonio = await service.criar(request.body, request.authUser?.tenant_id);
        return response.status(201).json({ patrimonio });
    }
    async atualizar(request, response) {
        const patrimonio = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json({ patrimonio });
    }
    async registrarMovimento(request, response) {
        const patrimonio = await service.registrarMovimento(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json({ patrimonio });
    }
}
