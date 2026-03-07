import type { Request, Response } from "express";

export function notFoundHandler(_request: Request, response: Response): Response {
  return response.status(404).json({ message: "Rota nao encontrada." });
}
