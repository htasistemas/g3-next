import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { InstituicoesController } from "../controllers/instituicoes.controller.js";

const controller = new InstituicoesController();

export const instituicoesRoutes = Router();

instituicoesRoutes.get("/", asyncHandler(controller.listar.bind(controller)));
instituicoesRoutes.post("/", asyncHandler(controller.criar.bind(controller)));
instituicoesRoutes.put("/:id", asyncHandler(controller.atualizar.bind(controller)));
instituicoesRoutes.post("/:id/resetar-admin", asyncHandler(controller.resetarAdmin.bind(controller)));
