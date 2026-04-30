import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { VendaService } from "../services/venda.service.js";

export class VendaController {
  private readonly service = new VendaService();

  async listar(request: AuthenticatedRequest, response: Response) {
    const resultado = await this.service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ vendas: resultado });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const resultado = await this.service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const resultado = await this.service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(resultado);
  }
}
