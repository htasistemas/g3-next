import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { AuthService } from "../services/auth.service.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { prisma } from "../../../database/prisma.js";
const authService = new AuthService();
const AUTH_COOKIE_NAME = env.APP_AUTH_COOKIE_NAME;
function obterTokenDaRequisicao(request) {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice("Bearer ".length).trim();
    }
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAME];
    return cookieToken ?? null;
}
export function ensureAuthenticated(request, _response, next) {
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
                permissoes: payload.permissoes ?? [],
                contexto: payload.contexto
            };
            return next();
        }
        catch {
            throw new AppError("Token de autenticacao invalido.", 401);
        }
    }).catch(next);
}
export function hydrateAuthenticatedUser(request, _response, next) {
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
                permissoes: payload.permissoes ?? [],
                contexto: payload.contexto
            };
        }
        catch {
            request.authUser = undefined;
        }
        return next();
    }).catch(next);
}
export function ensurePermissions(permissoesPermitidas) {
    return (request, _response, next) => {
        const usuario = request.authUser;
        if (!usuario) {
            throw new AppError("Nao autenticado.", 401);
        }
        const temPermissao = usuario.permissoes.some((permissao) => permissoesPermitidas.includes(permissao));
        if (!temPermissao) {
            throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
        }
        return next();
    };
}
export function ensureSuperadmin(request, _response, next) {
    if (!request.authUser) {
        throw new AppError("Nao autenticado.", 401);
    }
    const emailAdminPadrao = request.authUser.nomeUsuario?.trim().toLowerCase() === "htasistemas@gmail.com";
    if (!request.authUser.is_superadmin &&
        !request.authUser.permissoes.includes("MASTER_ADMIN") &&
        !emailAdminPadrao) {
        throw new AppError("Acesso restrito ao superadmin master.", 403);
    }
    return next();
}
export { AUTH_COOKIE_NAME };
