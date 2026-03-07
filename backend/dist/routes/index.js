import { Router } from "express";
import { authRoutes } from "../modules/auth/routes/auth.routes.js";
import { beneficiarioRoutes } from "../modules/beneficiarios/routes/beneficiario.routes.js";
import { familiaRoutes } from "../modules/familias/routes/familia.routes.js";
import { ensureAuthenticated, ensurePermissions } from "../modules/auth/middlewares/auth.middleware.js";
import { reportsRoutes } from "../modules/reports/routes/reports.routes.js";
export const appRoutes = Router();
appRoutes.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "g3-backend-node" });
});
appRoutes.use("/api/auth", authRoutes);
appRoutes.use("/api/beneficiarios", beneficiarioRoutes);
appRoutes.use("/api/familias", familiaRoutes);
appRoutes.use("/api/reports", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]), reportsRoutes);
