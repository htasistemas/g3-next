import { ParametrosSistemaService } from "../services/parametros-sistema.service.js";
const service = new ParametrosSistemaService();
export class ParametrosSistemaController {
    async obterPersonalizacao(_request, response) {
        const resultado = await service.obterPersonalizacao();
        return response.json(resultado);
    }
    async atualizarPersonalizacao(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        const resultado = await service.atualizarPersonalizacao(request.body, usuario);
        return response.json(resultado);
    }
    async obterCarenciaDoacaoRealizada(_request, response) {
        const resultado = await service.obterCarenciaDoacaoRealizada();
        return response.json(resultado);
    }
    async atualizarCarenciaDoacaoRealizada(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        const resultado = await service.atualizarCarenciaDoacaoRealizada(request.body, usuario);
        return response.json(resultado);
    }
}
