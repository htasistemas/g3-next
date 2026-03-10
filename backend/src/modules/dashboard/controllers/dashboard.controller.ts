import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { DashboardService } from "../services/dashboard.service.js";
import { DashboardPowerBiService } from "../services/dashboard-power-bi.service.js";

const service = new DashboardService();
const powerBiService = new DashboardPowerBiService();

export class DashboardController {
  async obterAssistencia(request: AuthenticatedRequest, response: Response) {
    const dashboard = await service.obterAssistencia(request.query);
    return response.json(dashboard);
  }

  async obterPowerBi(request: AuthenticatedRequest, response: Response) {
    const dashboard = await powerBiService.obterPowerBi(request.query, request.authUser);
    return response.json(dashboard);
  }
}
