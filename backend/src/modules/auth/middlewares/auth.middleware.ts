import type { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { AuthService } from "../services/auth.service.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { prisma } from "../../../database/prisma.js";

const authService = new AuthService();
const AUTH_COOKIE_NAME = env.APP_AUTH_COOKIE_NAME;

export type AuthenticatedRequest = Request & {
  authUser?: {
    id: string;
    nomeUsuario: string;
    nome?: string;
    tenant_id?: string;
    instituicao_id?: string;
    instituicao_nome?: string;
    instituicao_slug?: string;
    cnpj?: string;
    plano?: string;
    perfil?: string;
    is_superadmin?: boolean;
    permissoes: string[];
    contexto?: {
      identidade_id?: string;
      acesso_id?: string;
      instituicao_id?: string;
      entidade_juridica_id?: string;
      unidade_id?: string;
      projeto_id?: string;
      escopo?: string;
    };
  };
};

function obterTokenDaRequisicao(request: Request): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookieToken = (request as Request & { cookies?: Record<string, string> }).cookies?.[AUTH_COOKIE_NAME];
  return cookieToken ?? null;
}

export function ensureAuthenticated(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
) {
  void ensureMultiTenantStructure(prisma).then(() => {
    const token = obterTokenDaRequisicao(request);
    if (!token) {
      throw new AppError("Nao autenticado.", 401);
    }

    try {
      const payload = authService.validarToken(token);
      request.authUser = {
        id: payload.sub,
        nomeUsuario: payload.nomeUsuario,
        nome: payload.nome,
        tenant_id: payload.tenant_id,
        instituicao_id: payload.instituicao_id,
        instituicao_nome: payload.instituicao_nome,
        instituicao_slug: payload.instituicao_slug,
        cnpj: payload.cnpj,
        plano: payload.plano,
        perfil: payload.perfil,
        is_superadmin: payload.is_superadmin,
        permissoes: payload.permissoes ?? []
        ,contexto: payload.contexto
      };
      return next();
    } catch {
      throw new AppError("Token de autenticacao invalido.", 401);
    }
  }).catch(next);
}

export function hydrateAuthenticatedUser(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
) {
  void ensureMultiTenantStructure(prisma).then(() => {
    const token = obterTokenDaRequisicao(request);
    if (!token) {
      return next();
    }

    try {
      const payload = authService.validarToken(token);
      request.authUser = {
        id: payload.sub,
        nomeUsuario: payload.nomeUsuario,
        nome: payload.nome,
        tenant_id: payload.tenant_id,
        instituicao_id: payload.instituicao_id,
        instituicao_nome: payload.instituicao_nome,
        instituicao_slug: payload.instituicao_slug,
        cnpj: payload.cnpj,
        plano: payload.plano,
        perfil: payload.perfil,
        is_superadmin: payload.is_superadmin,
        permissoes: payload.permissoes ?? []
        ,contexto: payload.contexto
      };
    } catch {
      request.authUser = undefined;
    }

    return next();
  }).catch(next);
}

export function ensurePermissions(permissoesPermitidas: string[]) {
  return (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    const usuario = request.authUser;
    if (!usuario) {
      throw new AppError("Nao autenticado.", 401);
    }

    const temPermissao = usuario.permissoes.some((permissao) =>
      permissoesPermitidas.includes(permissao)
    );

    if (!temPermissao) {
      throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
    }

    return next();
  };
}

export function ensureSuperadmin(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
) {
  if (!request.authUser) {
    throw new AppError("Nao autenticado.", 401);
  }

  const emailAdminPadrao = request.authUser.nomeUsuario?.trim().toLowerCase() === "htasistemas@gmail.com";

  if (
    !request.authUser.is_superadmin &&
    !request.authUser.permissoes.includes("MASTER_ADMIN") &&
    !emailAdminPadrao
  ) {
    throw new AppError("Acesso restrito ao superadmin master.", 403);
  }

  return next();
}

export { AUTH_COOKIE_NAME };
