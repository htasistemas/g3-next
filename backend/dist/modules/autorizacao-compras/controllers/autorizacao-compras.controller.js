import { AutorizacaoComprasService } from "../services/autorizacao-compras.service.js";
const service = new AutorizacaoComprasService();
export class AutorizacaoComprasController {
    async listar(_request, response) {
        const lista = await service.listar();
        return response.json(lista);
    }
    async criar(request, response) {
        const item = await service.criar(request.body);
        return response.status(201).json(item);
    }
    async atualizar(request, response) {
        const item = await service.atualizar(request.params.id, request.body);
        return response.json(item);
    }
    async excluir(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
    async listarCotacoes(request, response) {
        const lista = await service.listarCotacoes(request.params.id);
        return response.json(lista);
    }
    async criarCotacao(request, response) {
        const item = await service.criarCotacao(request.params.id, request.body);
        return response.status(201).json(item);
    }
    async excluirCotacao(request, response) {
        await service.removerCotacao(request.params.id, request.params.quoteId);
        return response.status(204).send();
    }
    async buscarFornecedorPorCnpj(request, response) {
        const fornecedor = await service.buscarFornecedorPorCnpj(request.params.cnpj);
        return response.json(fornecedor);
    }
    async registrarReservaBancaria(request, response) {
        const reserva = await service.registrarReservaBancaria(request.params.id, request.body);
        return response.status(201).json(reserva);
    }
    async listarReservas(request, response) {
        const reservas = await service.listarReservas(request.params.id);
        return response.json(reservas);
    }
    async removerReservaBancaria(request, response) {
        await service.removerReservaBancaria(request.params.id, request.params.contaId);
        return response.status(204).send();
    }
    async gerarAutorizacaoPagamento(request, response) {
        const registro = await service.gerarAutorizacaoPagamento(request.params.id, request.body);
        return response.json(registro);
    }
}
