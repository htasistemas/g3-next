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
    const slug = typeof request.params.slug === "string" ? request.params.slug : undefined;
    const painel = await service.obterTransparencia(tenantId, slug);
    return response.json({ painel });
  }

  async logo(request: Request, response: Response) {
    const logo = await service.obterLogoInstituicao(request.params.slug);
    if ("url" in logo) return response.redirect(logo.url);
    response.setHeader("Content-Type", logo.mimeType);
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    return logo.stream.pipe(response);
  }
}
