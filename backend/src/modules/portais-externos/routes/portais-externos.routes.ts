import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { rateLimit } from "../../../shared/http/rate-limit.js";
import { PortaisExternosController } from "../controllers/portais-externos.controller.js";

const controller = new PortaisExternosController();

export const portaisExternosRoutes = Router();
const acessoPortalRateLimit = rateLimit({
  keyPrefix: "portais-externos-acesso",
  windowMs: 15 * 60 * 1000,
  max: 8,
  key: (request) => `${request.params.tipo ?? ""}:${String(request.body?.identificador ?? "")}`
});

portaisExternosRoutes.get(
  "/transparencia/:slug/logo",
  asyncHandler(controller.logo.bind(controller))
);

portaisExternosRoutes.get(
  "/transparencia/:slug",
  asyncHandler(controller.transparencia.bind(controller))
);

portaisExternosRoutes.get(
  "/transparencia",
  asyncHandler(controller.transparencia.bind(controller))
);

portaisExternosRoutes.post(
  "/:tipo/acesso",
  acessoPortalRateLimit,
  asyncHandler(controller.acessar.bind(controller))
);
