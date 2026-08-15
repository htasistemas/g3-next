import { PrestacaoContasProfissionalService } from "../services/prestacao-contas-profissional.service.js";
const service = new PrestacaoContasProfissionalService();
export class PrestacaoContasProfissionalController {
    async visaoGeral(request, response) {
        const dados = await service.visaoGeral(request.authUser);
        return response.json({ dados });
    }
    async listar(request, response) {
        const registros = await service.listar(request.params.entidade, request.authUser);
        return response.json({ registros });
    }
    async criar(request, response) {
        const registro = await service.criar(request.params.entidade, request.body, request.authUser, request.ip);
        return response.status(201).json({ registro });
    }
    async auditoria(request, response) {
        const registros = await service.listarAuditoria(request.authUser);
        return response.json({ registros });
    }
    async listarConfiguracoesIa(request, response) {
        const registros = await service.obterConfiguracoesIa(request.authUser);
        return response.json({ registros });
    }
    async salvarConfiguracaoIa(request, response) {
        const registro = await service.salvarConfiguracaoIa(request.body, request.authUser, request.ip);
        return response.json({ registro });
    }
    async testarConfiguracaoIa(request, response) {
        const resultado = await service.testarConfiguracaoIa(request.body, request.authUser, request.ip);
        return response.json({ resultado });
    }
    async analisarDocumento(request, response) {
        const resultado = await service.analisarDocumento(request.body, request.authUser, request.ip);
        return response.json({ resultado });
    }
    async assistente(request, response) {
        const resultado = await service.assistente(request.body, request.authUser, request.ip);
        return response.json({ resultado });
    }
}
