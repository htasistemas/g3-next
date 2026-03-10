import { OcorrenciasCriancaService } from "../services/ocorrencias-crianca.service.js";
const service = new OcorrenciasCriancaService();
export class OcorrenciasCriancaController {
    async listar(_request, response) {
        const ocorrencias = await service.listar();
        return response.json(ocorrencias);
    }
    async obter(request, response) {
        const ocorrencia = await service.obter(request.params.id);
        return response.json(ocorrencia);
    }
    async criar(request, response) {
        const ocorrencia = await service.criar(request.body);
        return response.status(201).json(ocorrencia);
    }
    async atualizar(request, response) {
        const ocorrencia = await service.atualizar(request.params.id, request.body);
        return response.json(ocorrencia);
    }
    async excluir(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
    async listarAnexos(request, response) {
        const anexos = await service.listarAnexos(request.params.id);
        return response.json(anexos);
    }
    async adicionarAnexo(request, response) {
        const anexo = await service.adicionarAnexo(request.params.id, request.body);
        return response.status(201).json(anexo);
    }
    async removerAnexo(request, response) {
        await service.removerAnexo(request.params.id, request.params.anexoId);
        return response.status(204).send();
    }
    async pdfDenuncia(request, response) {
        const pdf = await service.gerarPdfDenuncia(request.params.id);
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader("Content-Disposition", `inline; filename=\"${pdf.nomeArquivo}\"`);
        return response.send(pdf.buffer);
    }
    async pdfConselhoTutelar(request, response) {
        const pdf = await service.gerarPdfConselhoTutelar(request.params.id);
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader("Content-Disposition", `inline; filename=\"${pdf.nomeArquivo}\"`);
        return response.send(pdf.buffer);
    }
}
