import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ControleVeiculosService } from "../services/controle-veiculos.service.js";

const service = new ControleVeiculosService();

export class ControleVeiculosController {
  async listarVeiculos(request: AuthenticatedRequest, response: Response) {
    const veiculos = await service.listarVeiculos(request.authUser?.tenant_id);
    return response.json(veiculos);
  }

  async criarVeiculo(request: AuthenticatedRequest, response: Response) {
    const veiculo = await service.criarVeiculo(request.body, request.authUser?.tenant_id);
    return response.status(201).json(veiculo);
  }

  async atualizarVeiculo(request: AuthenticatedRequest, response: Response) {
    const veiculo = await service.atualizarVeiculo(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(veiculo);
  }

  async removerVeiculo(request: AuthenticatedRequest, response: Response) {
    await service.removerVeiculo(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarDiario(request: AuthenticatedRequest, response: Response) {
    const registros = await service.listarDiario(request.authUser?.tenant_id);
    return response.json(registros);
  }

  async criarDiario(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarDiario(request.body, request.authUser?.tenant_id);
    return response.status(201).json(registro);
  }

  async atualizarDiario(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarDiario(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(registro);
  }

  async removerDiario(request: AuthenticatedRequest, response: Response) {
    await service.removerDiario(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarLocaisDestino(request: AuthenticatedRequest, response: Response) {
    const locais = await service.listarLocaisDestino(request.authUser?.tenant_id);
    return response.json(locais);
  }

  async criarLocalDestino(request: AuthenticatedRequest, response: Response) {
    const local = await service.criarLocalDestino(request.body, request.authUser?.tenant_id);
    return response.status(201).json(local);
  }

  async atualizarLocalDestino(request: AuthenticatedRequest, response: Response) {
    const local = await service.atualizarLocalDestino(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(local);
  }

  async removerLocalDestino(request: AuthenticatedRequest, response: Response) {
    await service.removerLocalDestino(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarMotoristasDisponiveis(request: AuthenticatedRequest, response: Response) {
    const motoristas = await service.listarMotoristasDisponiveis(
      request.query.nome,
      request.authUser?.tenant_id
    );
    return response.json(motoristas);
  }

  async listarMotoristasAutorizados(request: AuthenticatedRequest, response: Response) {
    const motoristas = await service.listarMotoristasAutorizados(
      request.query.veiculoId,
      request.authUser?.tenant_id
    );
    return response.json(motoristas);
  }

  async criarMotoristaAutorizado(request: AuthenticatedRequest, response: Response) {
    const motorista = await service.criarMotoristaAutorizado(
      request.body,
      request.authUser?.tenant_id
    );
    return response.status(201).json(motorista);
  }

  async atualizarMotoristaAutorizado(request: AuthenticatedRequest, response: Response) {
    const motorista = await service.atualizarMotoristaAutorizado(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(motorista);
  }

  async removerMotoristaAutorizado(request: AuthenticatedRequest, response: Response) {
    await service.removerMotoristaAutorizado(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
