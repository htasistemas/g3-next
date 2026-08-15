import { InstituicoesService } from "../services/instituicoes.service.js";
const service = new InstituicoesService();
export class InstituicoesController {
    async listar(_request, response) {
        const instituicoes = await service.listar();
        return response.json({ instituicoes });
    }
    async listarUsuarios(request, response) {
        const usuarios = await service.listarUsuarios(request.params.id);
        return response.json(usuarios);
    }
    async criar(request, response) {
        const instituicao = await service.criar(request.body);
        return response.status(201).json({ instituicao });
    }
    async atualizar(request, response) {
        const instituicao = await service.atualizar(request.params.id, request.body);
        return response.json({ instituicao });
    }
    async resetarAdmin(request, response) {
        const resultado = await service.resetarAdmin(request.params.id, request.body);
        return response.json(resultado);
    }
    async desbloquearAcesso(request, response) {
        const resultado = await service.desbloquearAcesso(request.params.id);
        return response.json(resultado);
    }
    async criarUsuario(request, response) {
        const resultado = await service.criarUsuario(request.params.id, request.body, request.authUser?.nomeUsuario, request.authUser?.id);
        return response.status(201).json(resultado);
    }
    async atualizarUsuario(request, response) {
        const resultado = await service.atualizarUsuario(request.params.id, request.params.usuarioId, request.body, request.authUser?.nomeUsuario, request.authUser?.id);
        return response.json(resultado);
    }
    async resetarSenhaUsuario(request, response) {
        const resultado = await service.resetarSenhaUsuario(request.params.id, request.params.usuarioId, request.body, request.authUser?.nomeUsuario, request.authUser?.id);
        return response.json(resultado);
    }
}
