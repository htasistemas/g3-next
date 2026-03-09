import { Router } from "express";
import { authRoutes } from "../modules/auth/routes/auth.routes.js";
import { beneficiarioRoutes } from "../modules/beneficiarios/routes/beneficiario.routes.js";
import { familiaRoutes } from "../modules/familias/routes/familia.routes.js";
import { emailRoutes } from "../modules/email/routes/email.routes.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../modules/auth/middlewares/auth.middleware.js";
import { reportsRoutes } from "../modules/reports/routes/reports.routes.js";
import { unidadeAssistencialRoutes } from "../modules/unidades-assistenciais/routes/unidade-assistencial.routes.js";
import { parametrosSistemaRoutes } from "../modules/configuracoes-gerais/routes/parametros-sistema.routes.js";
import { dashboardRoutes } from "../modules/dashboard/routes/dashboard.routes.js";
import { profissionalRoutes } from "../modules/profissionais/routes/profissional.routes.js";
import { voluntarioRoutes } from "../modules/voluntarios/routes/voluntario.routes.js";
import { usuarioRoutes } from "../modules/usuarios/routes/usuario.routes.js";
import { matriculaRoutes } from "../modules/matriculas/routes/matricula.routes.js";
import { registroDoacaoRoutes } from "../modules/registro-doacao/routes/registro-doacao.routes.js";
import { doacaoRealizadaRoutes } from "../modules/doacoes-realizadas/routes/doacao-realizada.routes.js";
import { doacaoPlanejadaRoutes } from "../modules/doacoes-planejadas/routes/doacao-planejada.routes.js";
import { registroPontoRoutes } from "../modules/registro-ponto/routes/registro-ponto.routes.js";

export const appRoutes = Router();

appRoutes.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "g3-backend-node" });
});

appRoutes.use("/api/auth", authRoutes);
appRoutes.use("/api/beneficiarios", beneficiarioRoutes);
appRoutes.use("/api/familias", familiaRoutes);
appRoutes.use("/api/unidades-assistenciais", unidadeAssistencialRoutes);
appRoutes.use("/api/profissionais", profissionalRoutes);
appRoutes.use("/api/voluntarios", voluntarioRoutes);
appRoutes.use("/api/matriculas", matriculaRoutes);
appRoutes.use("/api/registro-doacao", registroDoacaoRoutes);
appRoutes.use("/api/doacoes-realizadas", doacaoRealizadaRoutes);
appRoutes.use("/api/doacoes-planejadas", doacaoPlanejadaRoutes);
appRoutes.use("/api/registro-ponto", registroPontoRoutes);
appRoutes.use("/api/dashboard", dashboardRoutes);
appRoutes.use("/api/configuracoes/parametros", parametrosSistemaRoutes);
appRoutes.use("/api/usuarios", usuarioRoutes);
appRoutes.use(
  "/api/email",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR"]),
  emailRoutes
);
appRoutes.use(
  "/api/reports",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]),
  reportsRoutes
);
