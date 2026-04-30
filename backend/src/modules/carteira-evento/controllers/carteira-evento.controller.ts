import type { Response } from "express";
import { CarteiraEventoService } from "../services/carteira-evento.service.js";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";

function mapAtor(request: AuthenticatedRequest) {
  return {
    id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
    nome_usuario: request.authUser?.nomeUsuario ?? "sistema",
    nome: request.authUser?.nome,
    tenantId: request.authUser?.tenant_id
  };
}

export class CarteiraEventoController {
  private readonly service = new CarteiraEventoService();

  listarEventos(request: AuthenticatedRequest, response: Response) {
    return this.service.listarEventos(request.query, request.authUser?.tenant_id).then((eventos) => response.json({ eventos }));
  }

  criarEvento(request: AuthenticatedRequest, response: Response) {
    return this.service.criarEvento(request.body, request.authUser?.tenant_id).then((evento) => response.status(201).json(evento));
  }

  atualizarEvento(request: AuthenticatedRequest, response: Response) {
    return this.service.atualizarEvento(request.params.id, request.body, request.authUser?.tenant_id).then((evento) => response.json(evento));
  }

  listarParticipantes(request: AuthenticatedRequest, response: Response) {
    return this.service
      .listarParticipantes(request.query, request.authUser?.tenant_id)
      .then((participantes) => response.json({ participantes }));
  }

  buscarParticipante(request: AuthenticatedRequest, response: Response) {
    return this.service.buscarParticipante(request.params.id, request.authUser?.tenant_id).then((participante) => response.json(participante));
  }

  criarParticipante(request: AuthenticatedRequest, response: Response) {
    return this.service.criarParticipante(request.body, request.authUser?.tenant_id).then((participante) => response.status(201).json(participante));
  }

  atualizarParticipante(request: AuthenticatedRequest, response: Response) {
    return this.service
      .atualizarParticipante(request.params.id, request.body, request.authUser?.tenant_id)
      .then((participante) => response.json(participante));
  }

  listarBarracas(request: AuthenticatedRequest, response: Response) {
    return this.service.listarBarracas(request.query, request.authUser?.tenant_id).then((barracas) => response.json({ barracas }));
  }

  criarBarraca(request: AuthenticatedRequest, response: Response) {
    return this.service.criarBarraca(request.body, request.authUser?.tenant_id).then((barraca) => response.status(201).json(barraca));
  }

  atualizarBarraca(request: AuthenticatedRequest, response: Response) {
    return this.service.atualizarBarraca(request.params.id, request.body, request.authUser?.tenant_id).then((barraca) => response.json(barraca));
  }

  listarItens(request: AuthenticatedRequest, response: Response) {
    return this.service.listarItens(request.query, request.authUser?.tenant_id).then((itens) => response.json({ itens }));
  }

  criarItem(request: AuthenticatedRequest, response: Response) {
    return this.service.criarItem(request.body, request.authUser?.tenant_id).then((item) => response.status(201).json(item));
  }

  atualizarItem(request: AuthenticatedRequest, response: Response) {
    return this.service.atualizarItem(request.params.id, request.body, request.authUser?.tenant_id).then((item) => response.json(item));
  }

  recarregar(request: AuthenticatedRequest, response: Response) {
    return this.service.recarregar(request.body, mapAtor(request)).then((participante) => response.json(participante));
  }

  transferir(request: AuthenticatedRequest, response: Response) {
    return this.service.transferir(request.body, mapAtor(request)).then((resultado) => response.json(resultado));
  }

  ajustar(request: AuthenticatedRequest, response: Response) {
    return this.service.ajustar(request.body, mapAtor(request)).then((participante) => response.json(participante));
  }

  alterarStatusParticipante(request: AuthenticatedRequest, response: Response) {
    return this.service
      .alterarStatusParticipante(request.params.id, request.body, mapAtor(request))
      .then((participante) => response.json(participante));
  }

  emitirSegundaVia(request: AuthenticatedRequest, response: Response) {
    return this.service
      .emitirSegundaVia(request.params.id, request.body, mapAtor(request))
      .then((participante) => response.json(participante));
  }

  consultarToken(request: AuthenticatedRequest, response: Response) {
    return this.service.consultarToken(request.body, request.authUser?.tenant_id).then((participante) => response.json(participante));
  }

  realizarVenda(request: AuthenticatedRequest, response: Response) {
    return this.service.realizarVenda(request.body, mapAtor(request)).then((venda) => response.status(201).json(venda));
  }

  listarExtrato(request: AuthenticatedRequest, response: Response) {
    return this.service.listarExtrato(request.query, request.authUser?.tenant_id).then((extrato) => response.json(extrato));
  }

  obterDashboard(request: AuthenticatedRequest, response: Response) {
    return this.service.obterDashboard(request.query, request.authUser?.tenant_id).then((dashboard) => response.json(dashboard));
  }

  obterFechamento(request: AuthenticatedRequest, response: Response) {
    return this.service.obterFechamento(request.query, request.authUser?.tenant_id).then((fechamento) => response.json(fechamento));
  }

  obterRelatorio(request: AuthenticatedRequest, response: Response) {
    return this.service.obterRelatorio(request.query, request.authUser?.tenant_id).then((relatorio) => response.json(relatorio));
  }
}
