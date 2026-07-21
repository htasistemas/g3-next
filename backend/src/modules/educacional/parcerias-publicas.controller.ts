import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/middlewares/auth.middleware.js";
import { evidenciaPublicaSchema, indicadorPublicoSchema, parceriaPublicaSchema } from "./parcerias-publicas.schema.js";
import { ParceriasPublicasRepository } from "./parcerias-publicas.repository.js";

const repository = new ParceriasPublicasRepository();
const tenant = (request: AuthenticatedRequest) => request.authUser?.tenant_id ?? "";

export class ParceriasPublicasController {
  async listar(request: AuthenticatedRequest, response: Response) { return response.json({ itens: await repository.listar(tenant(request)) }); }
  async criarParceria(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ item: await repository.criarParceria(parceriaPublicaSchema.parse(request.body), tenant(request)) }); }
  async criarIndicador(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ item: await repository.criarIndicador(indicadorPublicoSchema.parse(request.body), tenant(request)) }); }
  async criarEvidencia(request: AuthenticatedRequest, response: Response) { return response.status(201).json({ item: await repository.criarEvidencia(evidenciaPublicaSchema.parse(request.body), tenant(request)) }); }
}
