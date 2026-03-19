import fs from "node:fs";
import { env } from "../config/env.js";
const mensagemPrincipal = "Estamos aplicando melhorias no G3N para oferecer mais estabilidade e desempenho.";
const mensagemSecundaria = "Em instantes o sistema estará disponível novamente. Aguarde um momento.";
function modoManutencaoAtivo() {
    try {
        return fs.existsSync(env.APP_MAINTENANCE_FLAG_PATH);
    }
    catch {
        return false;
    }
}
export function maintenanceModeMiddleware(request, response, next) {
    if (request.path === "/health") {
        return next();
    }
    if (!modoManutencaoAtivo()) {
        return next();
    }
    response.setHeader("Retry-After", "120");
    return response.status(503).json({
        title: "Sistema em atualização",
        message: "Sistema em atualização.",
        detail: `${mensagemPrincipal} ${mensagemSecundaria}`
    });
}
