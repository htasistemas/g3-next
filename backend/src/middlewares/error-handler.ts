import multer from "multer";
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

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "O arquivo enviado excede o tamanho maximo permitido."
        : "Nao foi possivel processar o upload do arquivo.";
    return response.status(statusCode).json({ message });
  }

  if (
    error instanceof Error &&
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "entity.too.large"
  ) {
    return response
      .status(413)
      .json({ message: "O arquivo enviado excede o tamanho maximo permitido." });
  }

  if (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "body" in error
  ) {
    return response.status(400).json({ message: "JSON invalido na requisicao." });
  }

  if (error instanceof Error && /multipart|boundary/i.test(error.message)) {
    return response.status(400).json({ message: "Nao foi possivel processar o upload do arquivo." });
  }

  console.error(error);
  return response.status(500).json({ message: "Erro interno do servidor." });
}
