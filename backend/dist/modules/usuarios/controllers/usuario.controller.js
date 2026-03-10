import { UsuarioService } from "../services/usuario.service.js";
const service = new UsuarioService();
export class UsuarioController {
    async listar(request, response) {
        const resultado = await service.listar(request.query);
        return response.json(resultado);
    }
    async buscarPorId(request, response) {
        const resultado = await service.buscarPorId(request.params.id);
        return response.json(resultado);
    }
    async listarPermissoes(_request, response) {
        const permissoes = await service.listarPermissoes();
        return response.json({ permissoes });
    }
    async criar(request, response) {
        const resultado = await service.criar(request.body, {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario
        });
        return response.status(201).json(resultado);
    }
    async atualizar(request, response) {
        const resultado = await service.atualizar(request.params.id, request.body, {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario
        });
        return response.json(resultado);
    }
    async atualizarStatus(request, response) {
        const resultado = await service.atualizarStatus(request.params.id, request.body, {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario
        });
        return response.json(resultado);
    }
    async resetarSenha(request, response) {
        const resultado = await service.resetarSenha(request.params.id, request.body, {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario
        });
        return response.json(resultado);
    }
    async remover(request, response) {
        const resultado = await service.remover(request.params.id, {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario
        });
        return response.json(resultado);
    }
}
