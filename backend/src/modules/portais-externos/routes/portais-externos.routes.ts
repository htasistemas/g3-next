import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { PortaisExternosController } from "../controllers/portais-externos.controller.js";

const controller = new PortaisExternosController();

export const portaisExternosRoutes = Router();

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
  asyncHandler(controller.acessar.bind(controller))
);
