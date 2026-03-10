import type { Request, Response } from "express";
import { ControleVeiculosService } from "../services/controle-veiculos.service.js";

const service = new ControleVeiculosService();

export class ControleVeiculosController {
  async listarVeiculos(_request: Request, response: Response) {
    const veiculos = await service.listarVeiculos();
    return response.json(veiculos);
  }

  async criarVeiculo(request: Request, response: Response) {
    const veiculo = await service.criarVeiculo(request.body);
    return response.status(201).json(veiculo);
  }

  async atualizarVeiculo(request: Request, response: Response) {
    const veiculo = await service.atualizarVeiculo(request.params.id, request.body);
    return response.json(veiculo);
  }

  async removerVeiculo(request: Request, response: Response) {
    await service.removerVeiculo(request.params.id);
    return response.status(204).send();
  }

  async listarDiario(_request: Request, response: Response) {
    const registros = await service.listarDiario();
    return response.json(registros);
  }

  async criarDiario(request: Request, response: Response) {
    const registro = await service.criarDiario(request.body);
    return response.status(201).json(registro);
  }

  async atualizarDiario(request: Request, response: Response) {
    const registro = await service.atualizarDiario(request.params.id, request.body);
    return response.json(registro);
  }

  async removerDiario(request: Request, response: Response) {
    await service.removerDiario(request.params.id);
    return response.status(204).send();
  }

  async listarMotoristasDisponiveis(request: Request, response: Response) {
    const motoristas = await service.listarMotoristasDisponiveis(request.query.nome);
    return response.json(motoristas);
  }

  async listarMotoristasAutorizados(request: Request, response: Response) {
    const motoristas = await service.listarMotoristasAutorizados(request.query.veiculoId);
    return response.json(motoristas);
  }

  async criarMotoristaAutorizado(request: Request, response: Response) {
    const motorista = await service.criarMotoristaAutorizado(request.body);
    return response.status(201).json(motorista);
  }

  async atualizarMotoristaAutorizado(request: Request, response: Response) {
    const motorista = await service.atualizarMotoristaAutorizado(request.params.id, request.body);
    return response.json(motorista);
  }

  async removerMotoristaAutorizado(request: Request, response: Response) {
    await service.removerMotoristaAutorizado(request.params.id);
    return response.status(204).send();
  }
}
