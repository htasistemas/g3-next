import type { Request, Response } from "express";
import { ContabilidadeService } from "../services/contabilidade.service.js";

const service = new ContabilidadeService();

export class ContabilidadeController {
  async listarContasBancarias(_request: Request, response: Response) {
    const lista = await service.listarContasBancarias();
    return response.json(lista);
  }

  async criarContaBancaria(request: Request, response: Response) {
    const registro = await service.criarContaBancaria(request.body);
    return response.status(201).json(registro);
  }

  async atualizarContaBancaria(request: Request, response: Response) {
    const registro = await service.atualizarContaBancaria(request.params.id, request.body);
    return response.json(registro);
  }

  async removerContaBancaria(request: Request, response: Response) {
    await service.removerContaBancaria(request.params.id);
    return response.status(204).send();
  }

  async listarLancamentos(_request: Request, response: Response) {
    const lista = await service.listarLancamentos();
    return response.json(lista);
  }

  async criarLancamento(request: Request, response: Response) {
    const registro = await service.criarLancamento(request.body);
    return response.status(201).json(registro);
  }

  async atualizarLancamento(request: Request, response: Response) {
    const registro = await service.atualizarLancamento(request.params.id, request.body);
    return response.json(registro);
  }

  async atualizarSituacaoLancamento(request: Request, response: Response) {
    const registro = await service.atualizarSituacaoLancamento(request.params.id, request.body);
    return response.json(registro);
  }

  async pagarLancamento(request: Request, response: Response) {
    const recibo = await service.pagarLancamento(request.params.id, request.body);
    return response.json(recibo);
  }

  async removerLancamento(request: Request, response: Response) {
    await service.removerLancamento(request.params.id);
    return response.status(204).send();
  }

  async listarMovimentacoes(_request: Request, response: Response) {
    const lista = await service.listarMovimentacoes();
    return response.json(lista);
  }

  async criarMovimentacao(request: Request, response: Response) {
    const registro = await service.criarMovimentacao(request.body);
    return response.status(201).json(registro);
  }

  async atualizarMovimentacao(request: Request, response: Response) {
    const registro = await service.atualizarMovimentacao(request.params.id, request.body);
    return response.json(registro);
  }

  async removerMovimentacao(request: Request, response: Response) {
    await service.removerMovimentacao(request.params.id);
    return response.status(204).send();
  }

  async listarEmendas(_request: Request, response: Response) {
    const lista = await service.listarEmendas();
    return response.json(lista);
  }

  async criarEmenda(request: Request, response: Response) {
    const registro = await service.criarEmenda(request.body);
    return response.status(201).json(registro);
  }

  async atualizarStatusEmenda(request: Request, response: Response) {
    const registro = await service.atualizarStatusEmenda(request.params.id, request.body);
    return response.json(registro);
  }
}
