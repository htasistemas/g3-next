import multer from "multer";
import { OficiosService } from "../services/oficios.service.js";
const service = new OficiosService();
export const oficiosImportUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024
    }
}).single("arquivo");
export class OficiosController {
    async listar(_request, response) {
        const oficios = await service.listar();
        return response.json({ oficios });
    }
    async obter(request, response) {
        const oficio = await service.obter(request.params.id);
        return response.json(oficio);
    }
    async obterProximoNumero(request, response) {
        const numero = await service.obterProximoNumero(request.query.data);
        return response.json({ numero });
    }
    async obterContextoDocumento(_request, response) {
        const contexto = await service.obterContextoDocumento();
        return response.json(contexto);
    }
    async importarConteudo(request, response) {
        const importacao = await service.importarConteudoArquivo(request.file);
        return response.json(importacao);
    }
    async criar(request, response) {
        const oficio = await service.criar(request.body, request.authUser?.id);
        return response.status(201).json(oficio);
    }
    async atualizar(request, response) {
        const oficio = await service.atualizar(request.params.id, request.body, request.authUser?.id);
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
    async documento(request, response) {
        const documento = await service.gerarDocumento(request.params.id);
        return response
            .status(200)
            .type("application/pdf")
            .setHeader("Content-Disposition", `inline; filename="${documento.filename}"`)
            .send(documento.pdf);
    }
}
