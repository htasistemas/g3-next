import type { CookieOptions, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { AUTH_COOKIE_NAME, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: env.APP_AUTH_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
    path: "/"
  };
}

export class AuthController {
  async login(request: Request, response: Response) {
    const data = await authService.login(request.body);
    response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    return response.json(data);
  }

  async loginGoogle(request: Request, response: Response) {
    const data = await authService.loginGoogle(request.body);
    response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    return response.json(data);
  }

  async me(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser?.id) {
      throw new AppError("Nao autenticado.", 401);
    }
    const usuario = await authService.obterPerfilUsuario(request.authUser.id);
    return response.json({ usuario });
  }

  async logout(_request: Request, response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, {
      ...authCookieOptions(),
      maxAge: 0
    });
    return response.status(204).send();
  }

  async esqueciSenha(request: Request, response: Response) {
    await authService.esqueciSenha(request.body);
    return response.status(200).json({
      message:
        "Se o e-mail informado estiver cadastrado, uma senha temporaria foi enviada."
    });
  }
}
