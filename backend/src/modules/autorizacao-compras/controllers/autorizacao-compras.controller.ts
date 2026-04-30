import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { AutorizacaoComprasService } from "../services/autorizacao-compras.service.js";

const service = new AutorizacaoComprasService();

function obterIp(request: AuthenticatedRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.socket.remoteAddress ?? null;
}

function obterOrigem(request: AuthenticatedRequest) {
  const userAgent = request.headers["user-agent"];
  return typeof userAgent === "string" && userAgent.trim() ? userAgent.trim() : null;
}

function obterAtor(request: AuthenticatedRequest) {
  return {
    usuarioId: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
    nomeUsuario: request.authUser?.nomeUsuario,
    permissoes: request.authUser?.permissoes ?? [],
    tenantId: request.authUser?.tenant_id,
    ip: obterIp(request),
    maquina: obterOrigem(request)
  };
}

export class AutorizacaoComprasController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listar(request.authUser?.tenant_id);
    return response.json(lista);
  }

  async listarIndicadores(request: AuthenticatedRequest, response: Response) {
    const indicadores = await service.listarIndicadores(request.authUser?.tenant_id);
    return response.json(indicadores);
  }

  async listarSetoresSolicitantes(request: AuthenticatedRequest, response: Response) {
    const setores = await service.listarSetoresSolicitantes(request.authUser?.tenant_id);
    return response.json(setores);
  }

  async buscarDetalhe(request: AuthenticatedRequest, response: Response) {
    const registro = await service.buscarDetalhe(request.params.id, request.authUser?.tenant_id);
    return response.json(registro);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const item = await service.criar(request.body, obterAtor(request));
    return response.status(201).json(item);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const item = await service.atualizar(request.params.id, request.body, obterAtor(request));
    return response.json(item);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, obterAtor(request));
    return response.status(204).send();
  }

  async enviarParaAprovacao(request: AuthenticatedRequest, response: Response) {
    const item = await service.enviarParaAprovacao(request.params.id, obterAtor(request));
    return response.json(item);
  }

  async registrarAprovacao(request: AuthenticatedRequest, response: Response) {
    const item = await service.registrarAprovacao(request.params.id, request.body, obterAtor(request));
    return response.json(item);
  }

  async listarCotacoes(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarCotacoes(request.params.id, request.authUser?.tenant_id);
    return response.json(lista);
  }

  async criarCotacao(request: AuthenticatedRequest, response: Response) {
    const lista = await service.criarCotacao(request.params.id, request.body, obterAtor(request));
    return response.status(201).json(lista);
  }

  async excluirCotacao(request: AuthenticatedRequest, response: Response) {
    await service.removerCotacao(request.params.id, request.params.quoteId, obterAtor(request));
    return response.status(204).send();
  }

  async definirFornecedor(request: AuthenticatedRequest, response: Response) {
    const registro = await service.definirFornecedor(request.params.id, request.body, obterAtor(request));
    return response.json(registro);
  }

  async buscarFornecedorPorCnpj(request: AuthenticatedRequest, response: Response) {
    const fornecedor = await service.buscarFornecedorPorCnpj(
      request.params.cnpj,
      request.authUser?.tenant_id
    );
    return response.json(fornecedor);
  }

  async registrarReservaBancaria(request: AuthenticatedRequest, response: Response) {
    const reservas = await service.registrarReservaBancaria(request.params.id, request.body, obterAtor(request));
    return response.status(201).json(reservas);
  }

  async listarReservas(request: AuthenticatedRequest, response: Response) {
    const reservas = await service.listarReservas(request.params.id, request.authUser?.tenant_id);
    return response.json(reservas);
  }

  async removerReservaBancaria(request: AuthenticatedRequest, response: Response) {
    await service.removerReservaBancaria(request.params.id, request.params.reservaId, obterAtor(request));
    return response.status(204).send();
  }

  async gerarAutorizacaoPagamento(request: AuthenticatedRequest, response: Response) {
    const registro = await service.gerarAutorizacaoPagamento(request.params.id, request.body, obterAtor(request));
    return response.json(registro);
  }
}
