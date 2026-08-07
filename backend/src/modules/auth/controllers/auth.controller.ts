import type { CookieOptions, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { AUTH_COOKIE_NAME, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";
import { ParametrosSistemaService } from "../../configuracoes-gerais/services/parametros-sistema.service.js";

const authService = new AuthService();
const parametrosSistemaService = new ParametrosSistemaService();

function authCookieOptions(): CookieOptions {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: env.APP_AUTH_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
    path: "/"
  };

  if (env.APP_AUTH_COOKIE_DOMAIN) {
    cookieOptions.domain = env.APP_AUTH_COOKIE_DOMAIN;
  }

  return cookieOptions;
}

export class AuthController {
  async login(request: Request, response: Response) {
    const data = await authService.login({
      ...request.body,
      host: request.headers.host
    });
    if ("token" in data) {
      response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    }
    return response.json(data);
  }

  async loginGoogle(request: Request, response: Response) {
    const data = await authService.loginGoogle(request.body);
    if ("token" in data) {
      response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    }
    return response.json(data);
  }

  async me(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser?.id) {
      return response.status(200).json({ usuario: null });
    }
    const usuario = await authService.obterPerfilUsuario(request.authUser.id);
    return response.json({ usuario });
  }

  async obterPreferenciaAgendamentos(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser?.id || !request.authUser?.tenant_id) {
      return response.status(401).json({ dataVisualizacao: null });
    }

    const dataVisualizacao = await parametrosSistemaService.obterPreferenciaAgendamentosVisualizacao(
      request.authUser.id,
      request.authUser.tenant_id
    );

    return response.json({ dataVisualizacao });
  }

  async salvarPreferenciaAgendamentos(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser?.id || !request.authUser?.tenant_id) {
      return response.status(401).json({ dataVisualizacao: null });
    }

    const dataVisualizacao =
      typeof request.body?.dataVisualizacao === "string" ? request.body.dataVisualizacao.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataVisualizacao)) {
      return response.status(400).json({ message: "Data de visualizacao invalida." });
    }

    const salvo = await parametrosSistemaService.salvarPreferenciaAgendamentosVisualizacao(
      dataVisualizacao,
      request.authUser.id,
      request.authUser.nomeUsuario,
      request.authUser.tenant_id
    );

    return response.json(salvo);
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
        "Se o e-mail informado estiver cadastrado, uma senha temporaria foi enviada. Para acessos institucionais, use o mesmo CNPJ e o mesmo e-mail na tela de login."
    });
  }

  async verificarMfa(request: Request, response: Response) {
    const data = await authService.verificarMfa(request.body);
    response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    return response.json(data);
  }

  async verificarFace(request: Request, response: Response) {
    const data = await authService.verificarFace(request.body);
    response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    return response.json(data);
  }

  async iniciarCadastroPasskey(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser?.id) {
      return response.status(401).json({ message: "Usuario autenticado invalido." });
    }
    const data = await authService.iniciarCadastroPasskey(request.authUser.id, {
      ...request.body,
      host: request.headers.host
    });
    return response.json(data);
  }

  async concluirCadastroPasskey(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser?.id) {
      return response.status(401).json({ message: "Usuario autenticado invalido." });
    }
    const data = await authService.concluirCadastroPasskey(request.authUser.id, {
      ...request.body,
      host: request.headers.host
    });
    return response.json(data);
  }

  async iniciarLoginPasskey(request: Request, response: Response) {
    const data = await authService.iniciarLoginPasskey({
      ...request.body,
      host: request.headers.host
    });
    return response.json(data);
  }

  async concluirLoginPasskey(request: Request, response: Response) {
    const data = await authService.concluirLoginPasskey({
      ...request.body,
      host: request.headers.host
    });
    response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
    return response.json(data);
  }

  async tenantContext(request: Request, response: Response) {
    const contexto = await authService.obterContextoTenant({
      cnpj: typeof request.query.cnpj === "string" ? request.query.cnpj : undefined,
      slug: typeof request.query.slug === "string" ? request.query.slug : undefined,
      codigoInstituicao:
        typeof request.query.codigoInstituicao === "string" ? request.query.codigoInstituicao : undefined,
      host: request.headers.host
    });

    return response.status(200).json({ instituicao: contexto });
  }
}
