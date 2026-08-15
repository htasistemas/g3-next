import { FotosEventosService } from "../services/fotos-eventos.service.js";
const service = new FotosEventosService();
export class FotosEventosController {
    async listar(request, response) {
        const resultado = await service.listar(request.query, request.authUser?.tenant_id);
        return response.json(resultado);
    }
    async resumo(request, response) {
        const resultado = await service.resumo(request.authUser?.tenant_id);
        return response.json(resultado);
    }
    async obter(request, response) {
        const resultado = await service.obter(request.params.id, request.authUser?.tenant_id);
        return response.json(resultado);
    }
    async obterFotoPrincipal(request, response) {
        const arquivo = await service.obterFotoPrincipal(request.params.id, request.authUser?.tenant_id);
        return response.json({ arquivo });
    }
    async criar(request, response) {
        const evento = await service.criar(request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json(evento);
    }
    async atualizar(request, response) {
        const evento = await service.atualizar(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.json(evento);
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async adicionarFoto(request, response) {
        const foto = await service.adicionarFoto(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json(foto);
    }
    async adicionarFotosLote(request, response) {
        const fotos = await service.adicionarFotosLote(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json({ fotos });
    }
    async definirFotoPrincipal(request, response) {
        const foto = await service.definirFotoPrincipal(request.params.id, request.params.fotoId, request.authUser?.tenant_id);
        return response.json(foto);
    }
    async reordenarFotos(request, response) {
        const fotos = await service.reordenarFotos(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json({ fotos });
    }
    async atualizarFoto(request, response) {
        const foto = await service.atualizarFoto(request.params.id, request.params.fotoId, request.body, request.authUser?.tenant_id);
        return response.json(foto);
    }
    async removerFoto(request, response) {
        await service.removerFoto(request.params.id, request.params.fotoId, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async obterArquivoFoto(request, response) {
        const arquivo = await service.obterArquivoFoto(request.params.id, request.params.fotoId, request.authUser?.tenant_id);
        return response.json({ arquivo });
    }
}
