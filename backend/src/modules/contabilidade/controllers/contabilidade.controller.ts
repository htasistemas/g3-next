import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ContabilidadeService } from "../services/contabilidade.service.js";

const service = new ContabilidadeService();

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

function obterUsuarioId(request: AuthenticatedRequest) {
  const id = request.authUser?.id;
  if (!id) return undefined;

  try {
    return BigInt(id);
  } catch {
    return undefined;
  }
}

function obterAtor(request: AuthenticatedRequest) {
  return {
    usuarioId: obterUsuarioId(request),
    nomeUsuario: request.authUser?.nomeUsuario,
    permissoes: request.authUser?.permissoes ?? [],
    ip: obterIp(request),
    maquina: obterOrigem(request),
    tenantId: request.authUser?.tenant_id
  };
}

export class ContabilidadeController {
  async listarContasBancarias(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarContasBancarias(obterAtor(request));
    return response.json(lista);
  }

  async criarContaBancaria(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarContaBancaria(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarContaBancaria(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarContaBancaria(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async removerContaBancaria(request: AuthenticatedRequest, response: Response) {
    await service.removerContaBancaria(request.params.id, obterAtor(request));
    return response.status(204).send();
  }

  async listarCategorias(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarCategorias(obterAtor(request));
    return response.json(lista);
  }

  async criarCategoria(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarCategoria(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarCategoria(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarCategoria(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async removerCategoria(request: AuthenticatedRequest, response: Response) {
    await service.removerCategoria(request.params.id, obterAtor(request));
    return response.status(204).send();
  }

  async listarCentrosCusto(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarCentrosCusto(obterAtor(request));
    return response.json(lista);
  }

  async criarCentroCusto(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarCentroCusto(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarCentroCusto(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarCentroCusto(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async removerCentroCusto(request: AuthenticatedRequest, response: Response) {
    await service.removerCentroCusto(request.params.id, obterAtor(request));
    return response.status(204).send();
  }

  async listarLancamentos(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarLancamentos(obterAtor(request));
    return response.json(lista);
  }

  async criarLancamento(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarLancamento(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarLancamento(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarLancamento(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async atualizarSituacaoLancamento(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarSituacaoLancamento(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async pagarLancamento(request: AuthenticatedRequest, response: Response) {
    const recibo = await service.pagarLancamento(request.params.id, request.body, obterAtor(request));
    return response.json(recibo);
  }

  async estornarLancamento(request: AuthenticatedRequest, response: Response) {
    const registro = await service.estornarLancamento(request.params.id, obterAtor(request));
    return response.json(registro);
  }

  async removerLancamento(request: AuthenticatedRequest, response: Response) {
    await service.removerLancamento(request.params.id, obterAtor(request));
    return response.status(204).send();
  }

  async listarMovimentacoes(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarMovimentacoes(obterAtor(request));
    return response.json(lista);
  }

  async criarMovimentacao(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarMovimentacao(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarMovimentacao(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarMovimentacao(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async removerMovimentacao(request: AuthenticatedRequest, response: Response) {
    await service.removerMovimentacao(request.params.id, obterAtor(request));
    return response.status(204).send();
  }

  async listarTransferencias(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarTransferencias(obterAtor(request));
    return response.json(lista);
  }

  async criarTransferencia(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarTransferencia(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async estornarTransferencia(request: AuthenticatedRequest, response: Response) {
    const registro = await service.estornarTransferencia(request.params.id, obterAtor(request));
    return response.json(registro);
  }

  async listarConciliacoes(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarConciliacoes(obterAtor(request));
    return response.json(lista);
  }

  async criarConciliacao(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarConciliacao(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarSituacaoConciliacao(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarSituacaoConciliacao(
      request.params.id,
      request.body,
      obterAtor(request)
    );
    return response.json(registro);
  }

  async listarHistorico(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarHistorico(obterAtor(request));
    return response.json(lista);
  }

  async listarComprasIntegradas(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarComprasIntegradas(obterAtor(request));
    return response.json(lista);
  }

  async gerarObrigacaoFinanceiraPorCompra(request: AuthenticatedRequest, response: Response) {
    const registro = await service.gerarObrigacaoFinanceiraPorCompra(
      request.params.id,
      obterAtor(request)
    );
    return response.status(201).json(registro);
  }

  async listarEmendas(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarEmendas(obterAtor(request));
    return response.json(lista);
  }

  async criarEmenda(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criarEmenda(request.body, obterAtor(request));
    return response.status(201).json(registro);
  }

  async atualizarStatusEmenda(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizarStatusEmenda(request.params.id, request.body, obterAtor(request));
    return response.json(registro);
  }
}
