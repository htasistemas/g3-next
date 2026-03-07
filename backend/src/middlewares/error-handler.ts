import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error.js";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): Response {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof ZodError) {
    const firstError = error.issues[0];
    return response.status(422).json({
      message: firstError?.message ?? "Dados invalidos",
      details: error.issues
    });
  }

  if (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "body" in error
  ) {
    return response.status(400).json({ message: "JSON invalido na requisicao." });
  }

  console.error(error);
  return response.status(500).json({ message: "Erro interno do servidor." });
}
