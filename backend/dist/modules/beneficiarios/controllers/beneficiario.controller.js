import multer from "multer";
import { BeneficiarioService } from "../services/beneficiario.service.js";
import { BeneficiarioEvolucaoService } from "../services/beneficiario-evolucao.service.js";
import { BeneficiarioOcrService } from "../services/beneficiario-ocr.service.js";
const service = new BeneficiarioService();
const evolucaoService = new BeneficiarioEvolucaoService();
const ocrService = new BeneficiarioOcrService();
export const beneficiarioOcrUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
}).single("arquivo");
function buildAtor(request) {
    return {
        usuarioId: request.authUser?.id,
        usuarioNome: request.authUser?.nomeUsuario ?? request.authUser?.nome,
        tenantId: request.authUser?.tenant_id,
        ip: request.ip,
        requestId: request.headers["x-request-id"] ? String(request.headers["x-request-id"]) : undefined
    };
}
export class BeneficiarioController {
    async listar(request, response) {
        const beneficiarios = await service.listar(request.query, request.authUser?.tenant_id);
        return response.json({ beneficiarios });
    }
    async buscarPorId(request, response) {
        const beneficiario = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
        return response.json({ beneficiario });
    }
    async criar(request, response) {
        const resultado = await service.criar(request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json(resultado);
    }
    async atualizar(request, response) {
        const resultado = await service.atualizar(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.json(resultado);
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async obterProximoCodigo(request, response) {
        const data = await service.obterProximoCodigo(request.authUser?.tenant_id);
        return response.json(data);
    }
    async obterSugestaoEndereco(request, response) {
        const sugestao = await service.obterSugestaoEndereco(request.query, request.authUser?.tenant_id);
        return response.json({ sugestao });
    }
    async analisarDuplicidade(request, response) {
        const resultado = await evolucaoService.analisarDuplicidade(request.body, buildAtor(request));
        return response.json(resultado);
    }
    async criarRapido(request, response) {
        const resultado = await evolucaoService.criarRapido(request.body, buildAtor(request));
        return response.status(201).json(resultado);
    }
    async lerCpfPorOcr(request, response) {
        const resultado = await ocrService.lerCpf(request.file);
        return response.json({ resultado });
    }
    async obterCompletude(request, response) {
        const completude = await evolucaoService.obterCompletude(request.params.id, buildAtor(request));
        return response.json({ completude });
    }
    async recalcularCompletude(request, response) {
        const completude = await evolucaoService.recalcularCompletude(request.params.id, buildAtor(request));
        return response.json({ completude });
    }
    async listarConsentimentos(request, response) {
        const resultado = await evolucaoService.listarConsentimentos(request.params.id, buildAtor(request));
        return response.json(resultado);
    }
    async registrarConsentimento(request, response) {
        const resultado = await evolucaoService.registrarConsentimento(request.params.id, request.body, buildAtor(request));
        return response.status(201).json(resultado);
    }
    async listarAuditoria(request, response) {
        const completa = request.query.visao === "completa";
        const resultado = await evolucaoService.listarAuditoria(request.params.id, buildAtor(request), completa);
        return response.json(resultado);
    }
    async obterResumoFamilia(request, response) {
        const resultado = await evolucaoService.obterResumoFamilia(request.params.id, buildAtor(request));
        return response.json(resultado);
    }
    async listarPendencias(request, response) {
        const resultado = await evolucaoService.listarPendencias(buildAtor(request), request.query);
        return response.json(resultado);
    }
}
