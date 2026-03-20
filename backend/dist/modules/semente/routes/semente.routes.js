import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { SementeController } from "../controllers/semente.controller.js";
const sementeRoutes = Router();
const controller = new SementeController();
sementeRoutes.post("/chat", asyncHandler(controller.chat.bind(controller)));
export { sementeRoutes };
