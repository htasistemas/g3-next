import { captacaoAcaoDoacaoSchema } from "../captacao-recursos.schema.js";
import { CaptacaoRecursosService } from "../services/captacao-recursos.service.js";
const service = new CaptacaoRecursosService();
function obterUsuarioId(request) {
    return request.authUser?.id;
}
function obterTenantId(request) {
    return request.authUser?.tenant_id;
}
export class CaptacaoRecursosController {
    async dashboard(request, response) {
        return response.json(await service.getDashboard(request.query, obterTenantId(request)));
    }
    async listarDoadores(request, response) {
        return response.json(await service.listDoadores(request.query, obterTenantId(request)));
    }
    async buscarDoador(request, response) {
        return response.json(await service.getDoador(request.params.id, obterTenantId(request)));
    }
    async salvarDoador(request, response) {
        const resultado = await service.saveDoador(request.body, obterUsuarioId(request), request.params.id, obterTenantId(request));
        return response.status(request.params.id ? 200 : 201).json(resultado);
    }
    async inativarDoador(request, response) {
        return response.json(await service.inativarDoador(request.params.id, obterUsuarioId(request), obterTenantId(request)));
    }
    async listarTarefasRelacionamento(request, response) {
        return response.json(await service.listTarefasRelacionamento(request.params.id, obterTenantId(request)));
    }
    async salvarTarefaRelacionamento(request, response) {
        return response
            .status(201)
            .json(await service.saveTarefaRelacionamento(request.params.id, request.body, obterUsuarioId(request), obterTenantId(request)));
    }
    async concluirTarefaRelacionamento(request, response) {
        return response.json(await service.concluirTarefaRelacionamento(request.params.id, obterUsuarioId(request), obterTenantId(request)));
    }
    async listarCampanhas(request, response) {
        return response.json(await service.listCampanhas(request.query, obterTenantId(request)));
    }
    async buscarCampanha(request, response) {
        return response.json(await service.getCampanha(request.params.id, obterTenantId(request)));
    }
    async salvarCampanha(request, response) {
        const resultado = await service.saveCampanha(request.body, obterUsuarioId(request), request.params.id, obterTenantId(request));
        return response.status(request.params.id ? 200 : 201).json(resultado);
    }
    async alterarStatusCampanha(request, response) {
        return response.json(await service.alterarStatusCampanha(request.params.id, String(request.body?.status ?? request.params.status ?? ""), obterUsuarioId(request), obterTenantId(request)));
    }
    async listarDoacoes(request, response) {
        return response.json(await service.listDoacoes(request.query, obterTenantId(request)));
    }
    async buscarDoacao(request, response) {
        return response.json(await service.getDoacao(request.params.id, obterTenantId(request)));
    }
    async salvarDoacao(request, response) {
        const resultado = await service.saveDoacao(request.body, obterUsuarioId(request), request.params.id, obterTenantId(request));
        return response.status(request.params.id ? 200 : 201).json(resultado);
    }
    async gerarCobranca(request, response) {
        return response.json(await service.gerarCobranca(request.params.id, obterUsuarioId(request), obterTenantId(request)));
    }
    async confirmarDoacao(request, response) {
        return response.json(await service.confirmarDoacao(request.params.id, obterUsuarioId(request), obterTenantId(request)));
    }
    async cancelarDoacao(request, response) {
        const payload = captacaoAcaoDoacaoSchema.parse(request.body ?? {});
        return response.json(await service.cancelarDoacao(request.params.id, obterUsuarioId(request), payload.observacao, obterTenantId(request)));
    }
    async estornarDoacao(request, response) {
        const payload = captacaoAcaoDoacaoSchema.parse(request.body ?? {});
        return response.json(await service.estornarDoacao(request.params.id, obterUsuarioId(request), payload.observacao, obterTenantId(request)));
    }
    async emitirComprovante(request, response) {
        return response.json(await service.emitirComprovante(request.params.id, obterUsuarioId(request), obterTenantId(request)));
    }
    async listarComprovantes(request, response) {
        return response.json(await service.listComprovantes(request.query, obterTenantId(request)));
    }
    async reenviarComprovante(request, response) {
        return response.json(await service.reenviarComprovante(request.params.id, obterUsuarioId(request), obterTenantId(request)));
    }
    async configuracoes(request, response) {
        return response.json(await service.getConfiguracoes(obterTenantId(request)));
    }
    async salvarConfiguracoes(request, response) {
        return response.json(await service.saveConfiguracoes(request.body, obterUsuarioId(request), obterTenantId(request)));
    }
    async logs(request, response) {
        return response.json(await service.listLogs(obterTenantId(request)));
    }
    async exportar(request, response) {
        const formato = request.query.formato === "pdf" ? "pdf" : "excel";
        const arquivo = await service.exportarRelatorio(request.query, formato, obterTenantId(request));
        response.setHeader("Content-Type", arquivo.contentType);
        response.setHeader("Content-Disposition", `attachment; filename="${arquivo.filename}"`);
        return response.send(arquivo.buffer);
    }
    async portalLogin(request, response) {
        const resultado = await service.portalLogin(request.body, {
            ip: request.ip,
            userAgent: request.headers["user-agent"]
        });
        return response.json(resultado);
    }
    async portalPainel(request, response) {
        return response.json(await service.obterPainelPortal(String(request.query.token ?? "")));
    }
    async portalAtualizarDados(request, response) {
        return response.json(await service.atualizarPortalDoador(String(request.query.token ?? ""), request.body));
    }
    async portalCriarDoacao(request, response) {
        return response.status(201).json(await service.criarDoacaoPortal(String(request.query.token ?? ""), request.body));
    }
    async portalCancelarRecorrencia(request, response) {
        return response.json(await service.cancelarRecorrenciaPortal(String(request.query.token ?? ""), request.params.id));
    }
}
