import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { TermosParceriaService } from "../services/termos-parceria.service.js";

const service = new TermosParceriaService();

export class TermosParceriaController {
  async dashboard(request: AuthenticatedRequest, response: Response) { return response.json({ dashboard: await service.dashboard(request.authUser) }); }
  async listar(request: AuthenticatedRequest, response: Response) { const resultado = await service.listar(request.authUser, { status: typeof request.query.status === "string" ? request.query.status : undefined, projetoId: typeof request.query.projetoId === "string" ? request.query.projetoId : undefined, busca: typeof request.query.busca === "string" ? request.query.busca : undefined, pagina: Number(request.query.pagina) || 1, limite: Number(request.query.limite) || 20, ordem: typeof request.query.ordem === "string" ? request.query.ordem : undefined, direcao: typeof request.query.direcao === "string" ? request.query.direcao : undefined }); return response.json({ parcerias: resultado.registros, paginacao: { total: resultado.total, pagina: resultado.pagina, limite: resultado.limite, totalPaginas: resultado.totalPaginas } }); }
  async obter(request: AuthenticatedRequest, response: Response) { return response.json({ parceria: await service.obter(request.params.id, request.authUser) }); }
  async criar(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ parceria: await service.criar(request.body, request.authUser, request.ip) }); }
  async atualizar(request: AuthenticatedRequest, response: Response) { return response.json({ parceria: await service.atualizar(request.params.id, request.body, request.authUser, request.ip) }); }
  async excluir(request: AuthenticatedRequest, response: Response) { await service.excluir(request.params.id, request.authUser, request.ip); return response.status(204).send(); }
  async criarFilho(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ registro: await service.criarFilho(request.params.id, request.params.entidade, request.body, request.authUser, request.ip) }); }
  async atualizarFilho(request: AuthenticatedRequest, response: Response) { return response.json({ registro: await service.atualizarFilho(request.params.id, request.params.entidade, request.params.itemId, request.body, request.authUser, request.ip) }); }
  async excluirFilho(request: AuthenticatedRequest, response: Response) { await service.excluirFilho(request.params.id, request.params.entidade, request.params.itemId, request.authUser, request.ip); return response.status(204).send(); }
  async criarUnidade(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ unidade: await service.criarUnidade(request.params.id, request.body, request.authUser) }); }
  async criarAditivo(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ aditivo: await service.criarAditivo(request.params.id, request.body, request.authUser) }); }
}
