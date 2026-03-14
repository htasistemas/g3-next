import { OficiosService } from "../services/oficios.service.js";
const service = new OficiosService();
export class OficiosController {
    async listar(_request, response) {
        const oficios = await service.listar();
        return response.json({ oficios });
    }
    async obter(request, response) {
        const oficio = await service.obter(request.params.id);
        return response.json(oficio);
    }
    async criar(request, response) {
        const oficio = await service.criar(request.body);
        return response.status(201).json(oficio);
    }
    async atualizar(request, response) {
        const oficio = await service.atualizar(request.params.id, request.body);
        return response.json(oficio);
    }
    async excluir(request, response) {
        await service.remover(request.params.id, request.authUser?.id);
        return response.status(204).send();
    }
    async salvarPdfAssinado(request, response) {
        const oficio = await service.salvarPdfAssinado(request.params.id, request.body, request.authUser?.id);
        return response.json(oficio);
    }
    async obterPdfAssinado(request, response) {
        const pdf = await service.obterPdfAssinado(request.params.id);
        return response.json(pdf);
    }
    async removerPdfAssinado(request, response) {
        await service.removerPdfAssinado(request.params.id, request.authUser?.id);
        return response.status(204).send();
    }
    async listarImagens(request, response) {
        const imagens = await service.listarImagens(request.params.id);
        return response.json(imagens);
    }
    async adicionarImagem(request, response) {
        const imagem = await service.adicionarImagem(request.params.id, request.body, request.authUser?.id);
        return response.status(201).json(imagem);
    }
    async removerImagem(request, response) {
        await service.removerImagem(request.params.id, request.params.imagemId, request.authUser?.id);
        return response.status(204).send();
    }
}
