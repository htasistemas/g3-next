import { LicencaUsoService } from "../services/licenca-uso.service.js";
const service = new LicencaUsoService();
export class LicencaUsoController {
    async obterConfiguracao(_request, response) {
        const resultado = await service.obterConfiguracao();
        return response.json(resultado);
    }
    async atualizarConfiguracao(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        const resultado = await service.atualizarConfiguracao(request.body, usuario);
        return response.json(resultado);
    }
    async gerarCheckout(_request, response) {
        const resultado = await service.gerarCheckoutLink();
        return response.json(resultado);
    }
    async confirmarRetorno(request, response) {
        const resultado = await service.confirmarPagamentoRetorno(request.body);
        return response.json(resultado);
    }
    async webhookInfinitePay(request, response) {
        const resultado = await service.processarWebhookInfinitePay(request.body);
        return response.json(resultado);
    }
}
