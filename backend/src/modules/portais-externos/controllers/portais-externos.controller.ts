import type { Request, Response } from "express";
import { PortaisExternosService, type PortalTipo } from "../services/portais-externos.service.js";

const service = new PortaisExternosService();

export class PortaisExternosController {
  async acessar(request: Request, response: Response) {
    const painel = await service.acessar(request.params.tipo as PortalTipo, request.body ?? {});
    return response.json({ painel });
  }

  async transparencia(request: Request, response: Response) {
    const tenantId = typeof request.query.tenantId === "string" ? request.query.tenantId : undefined;
    const painel = await service.obterTransparencia(tenantId);
    return response.json({ painel });
  }
}
