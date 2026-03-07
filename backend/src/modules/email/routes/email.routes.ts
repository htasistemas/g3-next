import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { EmailController } from "../controllers/email.controller.js";

const controller = new EmailController();

export const emailRoutes = Router();

emailRoutes.post("/teste", asyncHandler(controller.enviarTeste.bind(controller)));
