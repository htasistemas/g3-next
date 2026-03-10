import type { Request, Response } from "express";
import { AutorizacaoComprasService } from "../services/autorizacao-compras.service.js";

const service = new AutorizacaoComprasService();

export class AutorizacaoComprasController {
  async listar(_request: Request, response: Response) {
    const lista = await service.listar();
    return response.json(lista);
  }

  async criar(request: Request, response: Response) {
    const item = await service.criar(request.body);
    return response.status(201).json(item);
  }

  async atualizar(request: Request, response: Response) {
    const item = await service.atualizar(request.params.id, request.body);
    return response.json(item);
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async listarCotacoes(request: Request, response: Response) {
    const lista = await service.listarCotacoes(request.params.id);
    return response.json(lista);
  }

  async criarCotacao(request: Request, response: Response) {
    const item = await service.criarCotacao(request.params.id, request.body);
    return response.status(201).json(item);
  }

  async excluirCotacao(request: Request, response: Response) {
    await service.removerCotacao(request.params.id, request.params.quoteId);
    return response.status(204).send();
  }

  async buscarFornecedorPorCnpj(request: Request, response: Response) {
    const fornecedor = await service.buscarFornecedorPorCnpj(request.params.cnpj);
    return response.json(fornecedor);
  }

  async registrarReservaBancaria(request: Request, response: Response) {
    const reserva = await service.registrarReservaBancaria(request.params.id, request.body);
    return response.status(201).json(reserva);
  }

  async listarReservas(request: Request, response: Response) {
    const reservas = await service.listarReservas(request.params.id);
    return response.json(reservas);
  }

  async removerReservaBancaria(request: Request, response: Response) {
    await service.removerReservaBancaria(request.params.id, request.params.contaId);
    return response.status(204).send();
  }

  async gerarAutorizacaoPagamento(request: Request, response: Response) {
    const registro = await service.gerarAutorizacaoPagamento(request.params.id, request.body);
    return response.json(registro);
  }
}
