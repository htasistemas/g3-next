import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/middlewares/auth.middleware.js";
import { ControleVeiculosDisponibilidadeService } from "./disponibilidade-veiculos.service.js";

const service = new ControleVeiculosDisponibilidadeService();

export class ControleVeiculosDisponibilidadeController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listar(request.authUser?.tenant_id);
    return response.json({ disponibilidades: resultado });
  }

  async consultar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.consultar(request.query, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async resumo(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.resumo(request.query, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async agendaVeiculo(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.agendaVeiculo(
      request.params.veiculoId,
      request.query,
      request.authUser?.tenant_id
    );
    return response.json(resultado);
  }

  async proximaDisponibilidade(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.proximaDisponibilidade(
      request.params.veiculoId,
      request.authUser?.tenant_id
    );
    return response.json(resultado);
  }

  async detalhes(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.detalhes(request.params.id, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.criar(request.body, request.authUser?.tenant_id, {
      id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
      nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? null
    });
    return response.status(201).json(resultado);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id, {
      id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
      nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? null
    });
    return response.json(resultado);
  }

  async cancelar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.cancelar(request.params.id, request.body, request.authUser?.tenant_id, {
      id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
      nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? null
    });
    return response.json(resultado);
  }

  async encerrar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.encerrar(request.params.id, request.authUser?.tenant_id, {
      id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
      nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? null
    });
    return response.json(resultado);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.excluir(request.params.id, request.authUser?.tenant_id, {
      id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
      nome: request.authUser?.nome ?? request.authUser?.nomeUsuario ?? null
    });
    return response.json(resultado);
  }

  async listarVeiculosAtivos(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listarVeiculosAtivos(request.authUser?.tenant_id);
    return response.json(resultado);
  }
}
