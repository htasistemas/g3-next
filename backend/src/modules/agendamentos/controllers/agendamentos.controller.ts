import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { mapAgendamentoRow, mapListaEsperaRow } from "../agendamentos.mapper.js";
import { AgendamentosService } from "../services/agendamentos.service.js";

const service = new AgendamentosService();

export class AgendamentosController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const itens = await service.listar(request.query);
    return response.json({ agendamentos: itens.map(mapAgendamentoRow) });
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const item = await service.obter(request.params.id);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const item = await service.criar(request.body, request.authUser);
    return response.status(201).json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const item = await service.atualizar(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async cancelar(request: AuthenticatedRequest, response: Response) {
    const item = await service.cancelar(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async remarcar(request: AuthenticatedRequest, response: Response) {
    const item = await service.remarcar(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async confirmar(request: AuthenticatedRequest, response: Response) {
    const item = await service.confirmar(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async checkIn(request: AuthenticatedRequest, response: Response) {
    const item = await service.checkIn(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async concluir(request: AuthenticatedRequest, response: Response) {
    const item = await service.concluir(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async listarListaEspera(_request: AuthenticatedRequest, response: Response) {
    const itens = await service.listarListaEspera();
    return response.json({ itens: itens.map(mapListaEsperaRow) });
  }

  async criarListaEspera(request: AuthenticatedRequest, response: Response) {
    const item = await service.criarListaEspera(request.body);
    return response.status(201).json({ item: item ? mapListaEsperaRow(item) : null });
  }

  async converterListaEspera(request: AuthenticatedRequest, response: Response) {
    const item = await service.converterListaEspera(request.params.id, request.body, request.authUser);
    return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
  }

  async indicadores(request: AuthenticatedRequest, response: Response) {
    const indicadores = await service.indicadores(request.query);
    return response.json({ indicadores });
  }

  async catalogos(_request: AuthenticatedRequest, response: Response) {
    const catalogos = await service.catalogos();
    return response.json(catalogos);
  }
}
