import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { PortaisExternosController } from "../controllers/portais-externos.controller.js";
import { publicPortalRateLimit } from "../../auth/middlewares/auth-rate-limit.middleware.js";

const controller = new PortaisExternosController();

export const portaisExternosRoutes = Router();

portaisExternosRoutes.get(
  "/transparencia",
  asyncHandler(controller.transparencia.bind(controller))
);

portaisExternosRoutes.post(
  "/:tipo/acesso",
  publicPortalRateLimit,
  asyncHandler(controller.acessar.bind(controller))
);
