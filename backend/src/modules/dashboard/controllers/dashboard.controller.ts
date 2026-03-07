import type { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service.js";

const service = new DashboardService();

export class DashboardController {
  async obterAssistencia(request: Request, response: Response) {
    const dashboard = await service.obterAssistencia(request.query);
    return response.json(dashboard);
  }
}
