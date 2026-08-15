import { RhContratacaoService } from "../services/rh-contratacao.service.js";
const service = new RhContratacaoService();
export class RhContratacaoController {
    obterTenantId(request) {
        return request.authUser?.tenant_id;
    }
    obterUsuarioId(request) {
        const authUserId = request.authUser?.id;
        if (authUserId)
            return authUserId;
        return String(request.query.usuarioId ?? "");
    }
    async listarCandidatos(request, response) {
        const lista = await service.listarCandidatos(String(request.query.termo ?? ""), this.obterTenantId(request));
        return response.json(lista);
    }
    async buscarCandidato(request, response) {
        const candidato = await service.buscarCandidato(request.params.id, this.obterTenantId(request));
        return response.json(candidato);
    }
    async criarCandidato(request, response) {
        const candidato = await service.criarCandidato(request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.status(201).json(candidato);
    }
    async atualizarCandidato(request, response) {
        const candidato = await service.atualizarCandidato(request.params.id, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.json(candidato);
    }
    async inativarCandidato(request, response) {
        await service.inativarCandidato(request.params.id, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.status(204).send();
    }
    async buscarProcessoPorCandidato(request, response) {
        const processo = await service.buscarProcessoPorCandidato(request.params.candidatoId, this.obterTenantId(request));
        return response.json(processo);
    }
    async atualizarStatus(request, response) {
        const processo = await service.atualizarStatus(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.json(processo);
    }
    async listarEntrevistas(request, response) {
        const lista = await service.listarEntrevistas(request.params.processoId, this.obterTenantId(request));
        return response.json(lista);
    }
    async salvarEntrevista(request, response) {
        const entrevista = await service.salvarEntrevista(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.status(201).json(entrevista);
    }
    async buscarFicha(request, response) {
        const ficha = await service.buscarFicha(request.params.processoId, this.obterTenantId(request));
        return response.json(ficha);
    }
    async salvarFicha(request, response) {
        const ficha = await service.salvarFicha(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.json(ficha);
    }
    async listarDocumentos(request, response) {
        const lista = await service.listarDocumentos(request.params.processoId, this.obterTenantId(request));
        return response.json(lista);
    }
    async atualizarDocumento(request, response) {
        const documento = await service.atualizarDocumento(request.params.documentoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.json(documento);
    }
    async listarArquivos(request, response) {
        const lista = await service.listarArquivos(request.params.processoId, this.obterTenantId(request));
        return response.json(lista);
    }
    async adicionarArquivo(request, response) {
        const arquivo = await service.adicionarArquivo(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.status(201).json(arquivo);
    }
    async listarTermos(request, response) {
        const lista = await service.listarTermos(request.params.processoId, this.obterTenantId(request));
        return response.json(lista);
    }
    async salvarTermo(request, response) {
        const termo = await service.salvarTermo(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.status(201).json(termo);
    }
    async buscarPpd(request, response) {
        const ppd = await service.buscarPpd(request.params.processoId, this.obterTenantId(request));
        return response.json(ppd);
    }
    async salvarPpd(request, response) {
        const ppd = await service.salvarPpd(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.json(ppd);
    }
    async buscarCartaBanco(request, response) {
        const carta = await service.buscarCartaBanco(request.params.processoId, this.obterTenantId(request));
        return response.json(carta);
    }
    async salvarCartaBanco(request, response) {
        const carta = await service.salvarCartaBanco(request.params.processoId, request.body, this.obterUsuarioId(request), this.obterTenantId(request));
        return response.json(carta);
    }
    async listarAuditoria(request, response) {
        const lista = await service.listarAuditoria(request.params.processoId, this.obterTenantId(request));
        return response.json(lista);
    }
}
