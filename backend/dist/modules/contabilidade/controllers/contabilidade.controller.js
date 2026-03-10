import { ContabilidadeService } from "../services/contabilidade.service.js";
const service = new ContabilidadeService();
export class ContabilidadeController {
    async listarContasBancarias(_request, response) {
        const lista = await service.listarContasBancarias();
        return response.json(lista);
    }
    async criarContaBancaria(request, response) {
        const registro = await service.criarContaBancaria(request.body);
        return response.status(201).json(registro);
    }
    async atualizarContaBancaria(request, response) {
        const registro = await service.atualizarContaBancaria(request.params.id, request.body);
        return response.json(registro);
    }
    async removerContaBancaria(request, response) {
        await service.removerContaBancaria(request.params.id);
        return response.status(204).send();
    }
    async listarLancamentos(_request, response) {
        const lista = await service.listarLancamentos();
        return response.json(lista);
    }
    async criarLancamento(request, response) {
        const registro = await service.criarLancamento(request.body);
        return response.status(201).json(registro);
    }
    async atualizarLancamento(request, response) {
        const registro = await service.atualizarLancamento(request.params.id, request.body);
        return response.json(registro);
    }
    async atualizarSituacaoLancamento(request, response) {
        const registro = await service.atualizarSituacaoLancamento(request.params.id, request.body);
        return response.json(registro);
    }
    async pagarLancamento(request, response) {
        const recibo = await service.pagarLancamento(request.params.id, request.body);
        return response.json(recibo);
    }
    async removerLancamento(request, response) {
        await service.removerLancamento(request.params.id);
        return response.status(204).send();
    }
    async listarMovimentacoes(_request, response) {
        const lista = await service.listarMovimentacoes();
        return response.json(lista);
    }
    async criarMovimentacao(request, response) {
        const registro = await service.criarMovimentacao(request.body);
        return response.status(201).json(registro);
    }
    async atualizarMovimentacao(request, response) {
        const registro = await service.atualizarMovimentacao(request.params.id, request.body);
        return response.json(registro);
    }
    async removerMovimentacao(request, response) {
        await service.removerMovimentacao(request.params.id);
        return response.status(204).send();
    }
    async listarEmendas(_request, response) {
        const lista = await service.listarEmendas();
        return response.json(lista);
    }
    async criarEmenda(request, response) {
        const registro = await service.criarEmenda(request.body);
        return response.status(201).json(registro);
    }
    async atualizarStatusEmenda(request, response) {
        const registro = await service.atualizarStatusEmenda(request.params.id, request.body);
        return response.json(registro);
    }
}
