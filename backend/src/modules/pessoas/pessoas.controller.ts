import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../auth/middlewares/auth.middleware.js";
import { PessoasService } from "./pessoas.service.js";

function tenant(request: Request) {
  return (request as AuthenticatedRequest).authUser?.tenant_id;
}
function usuario(request: Request) { return (request as AuthenticatedRequest).authUser?.id; }

const service = new PessoasService();

export class PessoasController {
  listar(request: Request, response: Response) { return service.listar(tenant(request), request.query).then((data) => response.json(data)); }
  listarDuplicidades(request: Request, response: Response) { return service.listarDuplicidades(tenant(request)).then((data) => response.json({ duplicidades: data })); }
  buscar(request: Request, response: Response) { return service.buscar(tenant(request), request.params.id).then((data) => response.json(data)); }
  listarVinculos(request: Request, response: Response) { return service.listarVinculos(tenant(request), request.params.id).then((data) => response.json({ vinculos: data })); }
  listarAuditoria(request: Request, response: Response) { return service.listarAuditoria(tenant(request), request.params.id).then((data) => response.json({ auditoria: data })); }
  criarVinculo(request: Request, response: Response) { return service.criarVinculo(tenant(request), request.params.id, request.body, usuario(request), request.ip).then((data) => response.status(201).json(data)); }
  desativarVinculo(request: Request, response: Response) { return service.desativarVinculo(tenant(request), request.params.vinculoId, usuario(request), request.ip, typeof request.body?.motivo === "string" ? request.body.motivo : undefined).then((data) => response.json(data)); }
  revisarDuplicidade(request: Request, response: Response) { return service.revisarDuplicidade(tenant(request), request.params.pessoaId, request.body, usuario(request)).then((data) => response.json(data)); }
}
