import { UsuarioService } from "../services/usuario.service.js";
const service = new UsuarioService();
export class UsuarioController {
    buildAtor(request) {
        return {
            id: request.authUser?.id,
            nomeUsuario: request.authUser?.nomeUsuario,
            tenant_id: request.authUser?.tenant_id,
            instituicao_id: request.authUser?.instituicao_id
        };
    }
    async listar(request, response) {
        const resultado = await service.listar(request.query, this.buildAtor(request));
        return response.json(resultado);
    }
    async buscarPorId(request, response) {
        const resultado = await service.buscarPorId(request.params.id, this.buildAtor(request));
        return response.json(resultado);
    }
    async listarPermissoes(_request, response) {
        const permissoes = await service.listarPermissoes();
        return response.json({ permissoes });
    }
    async listarAcessos(request, response) {
        return response.json({ acessos: await service.listarAcessos(request.params.id, this.buildAtor(request)) });
    }
    async substituirAcessos(request, response) {
        return response.json({ acessos: await service.substituirAcessos(request.params.id, request.body, this.buildAtor(request)) });
    }
    async listarCatalogoAcessos(request, response) {
        return response.json(await service.listarCatalogoAcessos(this.buildAtor(request)));
    }
    async buscarFace(request, response) {
        const resultado = await service.buscarFace(request.params.id, this.buildAtor(request));
        return response.json(resultado);
    }
    async salvarFace(request, response) {
        const resultado = await service.salvarFace(request.params.id, request.body, this.buildAtor(request));
        return response.json(resultado);
    }
    async removerFace(request, response) {
        const resultado = await service.removerFace(request.params.id, this.buildAtor(request));
        return response.json(resultado);
    }
    async criar(request, response) {
        const resultado = await service.criar(request.body, this.buildAtor(request));
        return response.status(201).json(resultado);
    }
    async atualizar(request, response) {
        const resultado = await service.atualizar(request.params.id, request.body, this.buildAtor(request));
        return response.json(resultado);
    }
    async atualizarStatus(request, response) {
        const resultado = await service.atualizarStatus(request.params.id, request.body, this.buildAtor(request));
        return response.json(resultado);
    }
    async resetarSenha(request, response) {
        const resultado = await service.resetarSenha(request.params.id, request.body, this.buildAtor(request));
        return response.json(resultado);
    }
    async remover(request, response) {
        const resultado = await service.remover(request.params.id, this.buildAtor(request));
        return response.json(resultado);
    }
}
