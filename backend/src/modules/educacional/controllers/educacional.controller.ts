import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { EducacionalService } from "../services/educacional.service.js";
import type { EducacionalRecurso } from "../educacional.types.js";

const service = new EducacionalService();
const actor = (request: AuthenticatedRequest) => ({ id: request.authUser?.id, nome: request.authUser?.nome, nomeUsuario: request.authUser?.nomeUsuario });

export class EducacionalController {
  async resumo(request: AuthenticatedRequest, response: Response) { return response.json(await service.resumo(request.query, request.authUser?.tenant_id)); }
  async listar(request: AuthenticatedRequest, response: Response) { return response.json({ itens: await service.listar(request.params.recurso as EducacionalRecurso, request.authUser?.tenant_id) }); }
  async buscarBeneficiarios(request: AuthenticatedRequest, response: Response) { return response.json({ beneficiarios: await service.buscarBeneficiarios(request.query, request.authUser?.tenant_id) }); }
  async listarUnidadesEnsino(request: AuthenticatedRequest, response: Response) { return response.json({ unidades: await service.listarUnidadesEnsino(request.authUser?.tenant_id) }); }
  async salvar(request: AuthenticatedRequest, response: Response) { const item = await service.salvar(request.params.recurso as EducacionalRecurso, request.params.id, request.body, request.authUser?.tenant_id, actor(request)); return response.status(request.params.id ? 200 : 201).json({ item }); }
  async vincularAluno(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ aluno: await service.vincularAluno(request.body, request.authUser?.tenant_id, actor(request)) }); }
}
