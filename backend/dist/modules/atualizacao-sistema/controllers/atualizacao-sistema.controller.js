import { AtualizacaoSistemaService } from "../services/atualizacao-sistema.service.js";
const service = new AtualizacaoSistemaService();
export class AtualizacaoSistemaController {
    async obterVersaoAtual(_request, response) {
        return response.json(await service.obterVersaoAtual());
    }
    async obterVersaoPublicada(_request, response) {
        return response.json(await service.obterVersaoPublicada());
    }
    async verificarAtualizacao(_request, response) {
        return response.json(await service.verificarAtualizacao());
    }
    async obterChangelog(_request, response) {
        return response.json(await service.obterChangelog());
    }
    async listarHistorico(_request, response) {
        return response.json(await service.listarHistorico());
    }
    async listarLogs(request, response) {
        return response.json(await service.listarLogs({
            execucaoId: String(request.query.execucaoId ?? ""),
            limite: String(request.query.limite ?? "100")
        }));
    }
    async baixarAtualizacao(_request, response) {
        return response.json(await service.baixarAtualizacao());
    }
    async aplicarAtualizacao(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.status(202).json(await service.aplicarAtualizacao(request.body, usuario));
    }
    async rollback(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.status(202).json(await service.rollback(request.body, usuario));
    }
    async obterStatus(_request, response) {
        return response.json(await service.obterStatus());
    }
    async obterConfig(_request, response) {
        return response.json(await service.obterConfig());
    }
    async salvarConfig(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.json(await service.salvarConfig(request.body, usuario));
    }
}
