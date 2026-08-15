import { DocumentosInstituicaoService } from "../services/documentos-instituicao.service.js";
const service = new DocumentosInstituicaoService();
export class DocumentosInstituicaoController {
    async listar(request, response) {
        const documentos = await service.listar(request.authUser?.tenant_id);
        return response.json(documentos);
    }
    async criar(request, response) {
        const documento = await service.criar(request.body, request.authUser?.tenant_id);
        return response.status(201).json(documento);
    }
    async atualizar(request, response) {
        const documento = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(documento);
    }
    async excluir(request, response) {
        await service.excluir(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async listarAnexos(request, response) {
        const anexos = await service.listarAnexos(request.params.id, request.authUser?.tenant_id);
        return response.json(anexos);
    }
    async adicionarAnexo(request, response) {
        const anexo = await service.adicionarAnexo(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json(anexo);
    }
    async substituirAnexo(request, response) {
        const anexo = await service.substituirAnexo(request.params.id, request.params.anexoId, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.json(anexo);
    }
    async excluirAnexo(request, response) {
        await service.excluirAnexo(request.params.id, request.params.anexoId, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async obterArquivoAnexo(request, response) {
        const conteudo = await service.obterArquivoAnexo(request.params.id, request.params.anexoId, request.authUser?.tenant_id);
        response.setHeader("Content-Type", conteudo.mimeType);
        response.setHeader("Cache-Control", "private, max-age=3600");
        response.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(conteudo.nomeArquivo)}"`);
        return conteudo.stream.pipe(response);
    }
    async listarHistorico(request, response) {
        const historico = await service.listarHistorico(request.params.id, request.authUser?.tenant_id);
        return response.json(historico);
    }
    async adicionarHistorico(request, response) {
        const historico = await service.adicionarHistorico(request.params.id, request.body, request.authUser?.tenant_id);
        return response.status(201).json(historico);
    }
}
