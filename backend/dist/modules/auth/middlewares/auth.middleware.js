import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { AuthService } from "../services/auth.service.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { prisma } from "../../../database/prisma.js";
import { ensurePerfisAcessoEstrutura } from "../../perfis-acesso/repositories/perfis-acesso-estrutura.repository.js";
import { obterPermissoesEfetivas } from "../../perfis-acesso/services/perfis-acesso.service.js";
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
    void ensureMultiTenantStructure(prisma).then(async () => {
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
                permissoes: [...new Set([...(payload.permissoes ?? []), ...(payload.tenant_id ? await obterPermissoesEfetivas(payload.sub, payload.tenant_id) : [])])],
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
    void ensureMultiTenantStructure(prisma).then(async () => {
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
                permissoes: [...new Set([...(payload.permissoes ?? []), ...(payload.tenant_id ? await obterPermissoesEfetivas(payload.sub, payload.tenant_id) : [])])],
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
    return async (request, _response, next) => {
        try {
            const usuario = request.authUser;
            if (!usuario) {
                throw new AppError("Nao autenticado.", 401);
            }
            await ensurePerfisAcessoEstrutura(prisma);
            const permissoesPerfil = usuario.tenant_id ? await obterPermissoesEfetivas(usuario.id, usuario.tenant_id) : [];
            const administrativoPerfil = usuario.tenant_id
                ? await prisma.$queryRawUnsafe(`SELECT TRUE AS administrativo FROM usuario_perfil_acesso up JOIN perfil_acesso p ON p.id=up.perfil_id WHERE up.usuario_id=$1::bigint AND up.tenant_id=$2::uuid AND up.principal=TRUE AND p.ativo=TRUE AND p.administrativo=TRUE LIMIT 1`, usuario.id, usuario.tenant_id)
                : [];
            const permissoesEfetivas = [...new Set([...usuario.permissoes, ...permissoesPerfil, ...(administrativoPerfil[0]?.administrativo ? ["ADMINISTRADOR"] : [])])];
            usuario.permissoes = permissoesEfetivas;
            const temPermissao = permissoesEfetivas.some((permissao) => permissoesPermitidas.includes(permissao));
            if (!temPermissao) {
                throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
            }
            return next();
        }
        catch (error) {
            return next(error);
        }
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
