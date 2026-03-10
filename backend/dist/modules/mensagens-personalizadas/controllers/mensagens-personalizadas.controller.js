import { MensagensPersonalizadasService } from "../services/mensagens-personalizadas.service.js";
const service = new MensagensPersonalizadasService();
export class MensagensPersonalizadasController {
    async obterSuporte(request, response) {
        const suporte = await service.obterSuporte();
        return response.json(suporte);
    }
    async listarModelos(request, response) {
        const modelos = await service.listarModelos(request.query);
        return response.json({ modelos });
    }
    async obterModelo(request, response) {
        const modelo = await service.obterModelo(request.params.id);
        return response.json({ modelo });
    }
    async criarModelo(request, response) {
        const modelo = await service.criarModelo(request.body, request.authUser);
        return response.status(201).json({ modelo });
    }
    async atualizarModelo(request, response) {
        const modelo = await service.atualizarModelo(request.params.id, request.body, request.authUser);
        return response.json({ modelo });
    }
    async duplicarModelo(request, response) {
        const modelo = await service.duplicarModelo(request.params.id, request.authUser);
        return response.status(201).json({ modelo });
    }
    async atualizarStatusModelo(request, response) {
        const modelo = await service.atualizarStatusModelo(request.params.id, request.body?.status, request.authUser);
        return response.json({ modelo });
    }
    async excluirModelo(request, response) {
        await service.excluirModelo(request.params.id, request.authUser);
        return response.status(204).send();
    }
    async listarTaxonomias(_request, response) {
        const taxonomias = await service.listarTaxonomias();
        return response.json({ taxonomias });
    }
    async criarTaxonomia(request, response) {
        const taxonomia = await service.criarTaxonomia(request.body, request.authUser);
        return response.status(201).json({ taxonomia });
    }
    async atualizarTaxonomia(request, response) {
        const taxonomia = await service.atualizarTaxonomia(request.params.id, request.body, request.authUser);
        return response.json({ taxonomia });
    }
    async excluirTaxonomia(request, response) {
        await service.excluirTaxonomia(request.params.id, request.authUser);
        return response.status(204).send();
    }
    async listarHistorico(request, response) {
        const historico = await service.listarHistorico(request.query);
        return response.json({ historico });
    }
    async buscarDestinatarios(request, response) {
        const destinatarios = await service.buscarDestinatarios(request.query);
        return response.json({ destinatarios });
    }
    async gerarPreview(request, response) {
        const preview = await service.gerarPreview(request.body, request.authUser);
        return response.json({ preview });
    }
    async enviarMensagem(request, response) {
        const resultado = await service.enviarMensagem(request.body, request.authUser);
        return response.json({ resultado });
    }
}
