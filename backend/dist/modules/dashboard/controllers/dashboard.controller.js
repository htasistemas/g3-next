import { DashboardService } from "../services/dashboard.service.js";
const service = new DashboardService();
export class DashboardController {
    async obterAssistencia(request, response) {
        const dashboard = await service.obterAssistencia(request.query);
        return response.json(dashboard);
    }
}
