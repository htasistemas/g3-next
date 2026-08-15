import multer from "multer";
import { mapArquivoMetadataToResponse, mapArquivoUploadToResponse } from "../arquivos.mapper.js";
import { ArquivosService } from "../services/arquivos.service.js";
const service = new ArquivosService();
export const arquivosUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024
    }
}).single("arquivo");
export class ArquivosController {
    async listar(request, response) {
        const arquivos = await service.listar(request.query, request.authUser?.tenant_id);
        return response.json({ arquivos: arquivos.map(mapArquivoMetadataToResponse) });
    }
    async upload(request, response) {
        const arquivo = await service.upload(request);
        return response.status(201).json({ arquivo: mapArquivoUploadToResponse(arquivo) });
    }
    async obterPorId(request, response) {
        const arquivo = await service.obterPorId(request.params.id, request.authUser?.tenant_id);
        return response.json({ arquivo: mapArquivoMetadataToResponse(arquivo) });
    }
    async obterConteudoPorId(request, response) {
        const conteudo = await service.obterConteudoPorId(request.params.id, request.authUser?.id, request.authUser?.tenant_id, this.deveAuditarVisualizacao(request.query.audit));
        return this.enviarConteudo(response, conteudo, request.query.download);
    }
    async obterConteudoPorCaminho(request, response) {
        const conteudo = await service.obterConteudoPorCaminho(String(request.query.path ?? ""), request.authUser?.id, request.authUser?.tenant_id, this.deveAuditarVisualizacao(request.query.audit));
        return this.enviarConteudo(response, conteudo, request.query.download);
    }
    async excluir(request, response) {
        await service.excluir(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    enviarConteudo(response, conteudo, download) {
        const forcarDownload = typeof download === "string" && ["1", "true", "sim", "yes"].includes(download.toLowerCase());
        response.setHeader("Content-Type", conteudo.mimeType);
        response.setHeader("Cache-Control", "private, max-age=3600");
        response.setHeader("Content-Disposition", `${forcarDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(conteudo.nomeArquivo)}"`);
        return conteudo.stream.pipe(response);
    }
    deveAuditarVisualizacao(valor) {
        if (typeof valor !== "string")
            return true;
        return !["0", "false", "nao", "não", "no"].includes(valor.trim().toLowerCase());
    }
}
