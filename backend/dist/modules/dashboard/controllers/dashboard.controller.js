import { DashboardService } from "../services/dashboard.service.js";
import { DashboardPowerBiService } from "../services/dashboard-power-bi.service.js";
const service = new DashboardService();
const powerBiService = new DashboardPowerBiService();
export class DashboardController {
    async obterAssistencia(request, response) {
        const dashboard = await service.obterAssistencia(request.query);
        return response.json(dashboard);
    }
    async obterPowerBi(request, response) {
        const dashboard = await powerBiService.obterPowerBi(request.query, request.authUser);
        return response.json(dashboard);
    }
}
